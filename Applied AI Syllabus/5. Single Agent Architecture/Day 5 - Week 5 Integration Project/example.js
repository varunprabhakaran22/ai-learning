// Week 5 Integration Project — "Autonomous Task Agent"
// Wires together all four pillars from Days 1-4 into one executor loop:
//   Day 2 memory   -> retrieve relevant past context before planning
//   Day 3 planning -> one LLM call outputs an ordered subtask list w/ deps,
//                     replanned mid-run if a real result breaks an assumption
//   Day 4 HumanGate-> every tool call is tiered (always-ask / never-ask /
//                     threshold-based) and gated BEFORE execution, never
//                     around the LLM call itself
//   Day 1 executor  -> the loop tying all of the above together, with a
//                     full execution log as the showcase deliverable
//
//   Goal (natural language)
//        │
//        ▼
//   retrieveRelevant(goal) ──────────────► Day 2 memory (reused as-is)
//        │
//        ▼
//   generatePlan(goal, memory) ──────────► Day 3 ①: one LLM call, structured
//        │                                  subtask list with dependsOn
//        ▼
//   ┌─────────────────────────────────────────────────────────────┐
//   │ EXECUTOR LOOP (repeats until plan empty or maxIterations)    │
//   │                                                                │
//   │  nextEligibleSubtask(plan) ──► Day 3 ①: topological sort on    │
//   │       │                         dependsOn — plain code, no LLM │
//   │       ▼                                                        │
//   │  decideAction(subtask) ──────► LLM call: which tool + input +  │
//   │       │                         confidence (Day 4 ②)           │
//   │       ▼                                                        │
//   │  HumanGate.check(action) ────► Day 4 ③: tier lookup            │
//   │       │                         always-ask  -> pause, always   │
//   │       │                         never-ask   -> proceed, no gate│
//   │       │                         threshold   -> pause only if   │
//   │       │                         confidence < threshold         │
//   │       ▼                                                        │
//   │  approved? ──no──► human rejects ──► feed "rejected: <reason>" │
//   │       │                              back in as a REAL result  │
//   │       │                              (same mechanism as a      │
//   │       │                              replan trigger below)      │
//   │      yes                                                       │
//   │       ▼                                                        │
//   │  execute REAL tool ──────────► Day 1 pillar 1, unchanged        │
//   │       │                                                        │
//   │       ▼                                                        │
//   │  resultBreaksAssumption? ────► Day 3 ③: compare real result vs  │
//   │       │  yes                    what remaining plan assumes     │
//   │       ▼                                                        │
//   │  replan(goal, planSoFar, realResult) ──► Day 3 ③: same          │
//   │       │                                   generatePlan call,    │
//   │       │                                   fed the new fact      │
//   │       ▼                                                        │
//   │  mark subtask done, log the step, loop again                  │
//   └─────────────────────────────────────────────────────────────┘
//        │
//        ▼
//   commitSessionToLongTerm(executionLog) ─► Day 2: summarize + store
//        │
//        ▼
//   print full execution log (the showcase deliverable)

const OpenAI = require("openai");
const Anthropic = require("@anthropic-ai/sdk");

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const EMBEDDING_MODEL = "text-embedding-3-small";
const CLAUDE_MODEL = "claude-sonnet-5";

// ---------------------------------------------------------------------------
// Day 2 — Memory (reused verbatim in mechanism; trimmed to what this
// integration actually calls: semantic facts + episodic retrieval/commit)
// ---------------------------------------------------------------------------

async function embed(text) {
  const response = await openai.embeddings.create({ model: EMBEDDING_MODEL, input: text });
  return response.data[0].embedding;
}

function cosineSimilarity(a, b) {
  let dot = 0, magA = 0, magB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    magA += a[i] * a[i];
    magB += b[i] * b[i];
  }
  return dot / (Math.sqrt(magA) * Math.sqrt(magB));
}

async function summarizeSession(transcript) {
  const response = await anthropic.messages.create({
    model: CLAUDE_MODEL,
    max_tokens: 150,
    messages: [{
      role: "user",
      content: `Here is a raw session transcript:\n${transcript}\n\nWrite a 2-3 sentence summary capturing: what was attempted, the outcome, and anything a future session should know before attempting something similar.`,
    }],
  });
  return response.content[0].text.trim();
}

function createAgentMemory() {
  const longTerm = []; // [{ text, vector, type: "episodic" | "semantic" }]

  return {
    async addSemanticFact(fact) {
      const vector = await embed(fact);
      longTerm.push({ text: fact, vector, type: "semantic" });
    },
    async commitSessionToLongTerm(transcript) {
      const summary = await summarizeSession(transcript);
      const vector = await embed(summary);
      longTerm.push({ text: summary, vector, type: "episodic" });
      return summary;
    },
    async retrieveRelevant(currentTask, topK = 3) {
      const queryVector = await embed(currentTask);
      return longTerm
        .map(({ text, vector, type }) => ({ text, type, score: cosineSimilarity(queryVector, vector) }))
        .sort((a, b) => b.score - a.score)
        .slice(0, topK);
    },
  };
}

// ---------------------------------------------------------------------------
// Day 4 — Tool registry with risk tiers + HumanGate
// Theory.md ②: tier is a property of the TOOL, assigned once here — never
// decided by the model at runtime.
// ---------------------------------------------------------------------------

const TOOL_REGISTRY = {
  getAccountStatus: {
    tier: "never-ask", // pure read, no side effect (Day 4 ②)
    run: ({ userId }) => ({ cardStatus: "still expired", pendingBooking: true }),
  },
  sendMessage: {
    tier: "always-ask", // irreversible, real-world-consequential (Day 4 ②)
    run: ({ userId, text }) => ({ delivered: true }),
  },
  writeFile: {
    tier: "threshold-based", // recoverable-ish, gated on confidence (Day 4 ②)
    threshold: 80,
    run: ({ path, content }) => ({ written: true, path }),
  },
};

const anthropicToolSchemas = [
  { name: "getAccountStatus", description: "Look up a user's account status", input_schema: { type: "object", properties: { userId: { type: "string" } }, required: ["userId"] } },
  { name: "sendMessage", description: "Send a message to a user", input_schema: { type: "object", properties: { userId: { type: "string" }, text: { type: "string" } }, required: ["userId", "text"] } },
  { name: "writeFile", description: "Overwrite a file with new content", input_schema: { type: "object", properties: { path: { type: "string" }, content: { type: "string" } }, required: ["path", "content"] } },
];

// Simulates a human reviewer for this runnable example: always-ask actions
// are auto-approved here so the script can run unattended, but the REAL
// decision point (Day 4 ③) is this exact function — swap this out for an
// actual prompt/UI in a real deployment. This is the ONLY place a human
// would be involved; nothing upstream of this function is faked.
function simulateHumanReview(action, tier, confidence) {
  return { decision: "approve", reason: null };
}

function createHumanGate(log) {
  return {
    // Day 4 ③, Step 3.5: the single insertion point between "model decided
    // an action" and "code executes it" — never around the LLM call itself.
    async check(action, confidence, justification) {
      const tool = TOOL_REGISTRY[action.name];
      const tier = tool.tier;

      let needsApproval;
      if (tier === "never-ask") {
        needsApproval = false;
      } else if (tier === "always-ask") {
        needsApproval = true; // confidence is never consulted for this tier (Day 4 ②)
      } else {
        needsApproval = confidence < tool.threshold; // threshold-based (Day 4 ②)
      }

      let humanDecision = null;
      if (needsApproval) {
        humanDecision = simulateHumanReview(action, tier, confidence);
      }

      log.push({
        timestamp: "session-time",
        action,
        tier,
        modelConfidence: confidence,
        modelJustification: justification,
        gated: needsApproval,
        humanDecision: humanDecision?.decision ?? "auto-approved",
        humanReason: humanDecision?.reason ?? null,
      });

      const approved = !needsApproval || humanDecision.decision === "approve";
      return { approved, reason: humanDecision?.reason ?? null };
    },
  };
}

// ---------------------------------------------------------------------------
// Day 3 — Planning: one structured-output call -> ordered subtask list with
// dependsOn. Same call, re-run with the plan-so-far + a real broken
// assumption, is what "replanning" is (Day 3 ③) — no separate mechanism.
// ---------------------------------------------------------------------------

const PLAN_SCHEMA_INSTRUCTIONS = `Output ONLY a JSON array of subtasks. Each subtask:
{ "id": number, "description": string, "dependsOn": number[], "tool": one of ["getAccountStatus","sendMessage","writeFile", null] }
One subtask = one tool call or one clearly distinct non-tool reasoning step (Day 3 ④'s over-decomposition fix). Every subtask that maps to a tool call MUST name a real tool from the list above.`;

async function generatePlan(goal, relevantMemories, priorPlanContext = null) {
  const memoryBlock = relevantMemories.map((m) => `- ${m.text}`).join("\n");
  const priorContextBlock = priorPlanContext
    ? `\n\nThis is a REPLAN. Original plan so far: ${JSON.stringify(priorPlanContext.planSoFar)}\nReal outcome that broke an assumption: ${priorPlanContext.realOutcome}\nRevise the remaining plan accordingly, keeping completed steps as-is.`
    : "";

  const response = await anthropic.messages.create({
    model: CLAUDE_MODEL,
    max_tokens: 500,
    messages: [{
      role: "user",
      content: `Goal: ${goal}\n\nRelevant memory:\n${memoryBlock}${priorContextBlock}\n\n${PLAN_SCHEMA_INSTRUCTIONS}`,
    }],
  });

  const text = response.content[0].text.trim();
  const jsonMatch = text.match(/\[[\s\S]*\]/);
  return JSON.parse(jsonMatch[0]);
}

// Day 3 ①: topological sort on dependsOn — plain code, no LLM call.
function nextEligibleSubtask(plan) {
  return plan.find(
    (t) => t.status !== "done" && t.dependsOn.every((depId) => plan.find((p) => p.id === depId)?.status === "done")
  );
}

// ---------------------------------------------------------------------------
// Executor loop — Day 1 pillar 4, now carrying HumanGate + replan checks
// ---------------------------------------------------------------------------

async function decideAction(subtask, userId) {
  const response = await anthropic.messages.create({
    model: CLAUDE_MODEL,
    max_tokens: 300,
    tools: anthropicToolSchemas,
    messages: [{
      role: "user",
      content: `Subtask: ${subtask.description}\nUser ID: ${userId}\n\nCall the appropriate tool. Along with the tool call, in your reasoning state a confidence score 0-100 and a one-sentence justification, then call the tool.`,
    }],
  });

  const toolUse = response.content.find((b) => b.type === "tool_use");
  const text = response.content.find((b) => b.type === "text")?.text ?? "";
  const confidenceMatch = text.match(/confidence[:\s]+(\d+)/i);
  const confidence = confidenceMatch ? parseInt(confidenceMatch[1], 10) : 100; // default: unambiguous read/write case
  return { toolUse, justification: text.trim() || "(no explicit reasoning text)", confidence };
}

async function runAutonomousTaskAgent(goal, { userId = "X", maxIterations = 8 } = {}) {
  const memory = createAgentMemory();
  await memory.addSemanticFact("User X's account tier is Plan A.");

  const executionLog = [];
  const gateLog = [];
  const gate = createHumanGate(gateLog);

  const relevant = await memory.retrieveRelevant(goal);
  executionLog.push({ step: "memory-retrieve", relevant });

  let plan = await generatePlan(goal, relevant);
  executionLog.push({ step: "plan-generated", plan: JSON.parse(JSON.stringify(plan)) });

  let iterations = 0;
  while (iterations < maxIterations) {
    iterations++;
    const subtask = nextEligibleSubtask(plan);
    if (!subtask) break; // Day 3 ①: no eligible subtask left means the plan is complete

    if (!subtask.tool) {
      subtask.status = "done"; // pure reasoning step, nothing to execute or gate
      executionLog.push({ step: "subtask-done", subtaskId: subtask.id, note: "non-tool reasoning step" });
      continue;
    }

    const { toolUse, justification, confidence } = await decideAction(subtask, userId);
    if (!toolUse) {
      executionLog.push({ step: "subtask-skipped", subtaskId: subtask.id, reason: "model returned no tool call" });
      subtask.status = "done";
      continue;
    }

    const { approved, reason } = await gate.check(toolUse.input && { name: toolUse.name, input: toolUse.input }, confidence, justification);

    if (!approved) {
      // Day 4 ③: a rejection re-enters the loop as a real result, same
      // mechanism as a tool failure triggering Day 3's replan.
      executionLog.push({ step: "human-rejected", subtaskId: subtask.id, action: toolUse.name, reason });
      plan = await generatePlan(goal, relevant, {
        planSoFar: plan,
        realOutcome: `Human rejected action ${toolUse.name}: ${reason ?? "no reason given"}`,
      });
      executionLog.push({ step: "replan-after-rejection", plan: JSON.parse(JSON.stringify(plan)) });
      continue;
    }

    const tool = TOOL_REGISTRY[toolUse.name];
    const realResult = tool.run(toolUse.input);
    executionLog.push({ step: "tool-executed", subtaskId: subtask.id, tool: toolUse.name, input: toolUse.input, result: realResult, confidence, tier: tool.tier });

    // Day 3 ③: does this real result contradict an assumption a later step
    // depends on? Concrete trigger used here: pendingBooking still true
    // after we believed we'd resolved it.
    const brokeAssumption = toolUse.name === "getAccountStatus" && realResult.cardStatus === "still expired";
    subtask.status = "done";

    if (brokeAssumption) {
      plan = await generatePlan(goal, relevant, {
        planSoFar: plan,
        realOutcome: `getAccountStatus returned cardStatus: 'still expired', pendingBooking: true — the plan must now notify the user about the expired card before anything else.`,
      });
      executionLog.push({ step: "replan-after-real-result", plan: JSON.parse(JSON.stringify(plan)) });
    }
  }

  const transcript = executionLog.map((e) => JSON.stringify(e)).join("\n");
  const summary = await memory.commitSessionToLongTerm(transcript);
  executionLog.push({ step: "session-committed-to-memory", summary });

  return { executionLog, gateLog, finalPlan: plan };
}

// ---------------------------------------------------------------------------
// Run it
// ---------------------------------------------------------------------------

(async () => {
  const goal = "Check user X's account for pending issues and follow up appropriately, and write a note about it to notes.txt.";
  const { executionLog, gateLog } = await runAutonomousTaskAgent(goal);

  console.log("\n=== FULL EXECUTION LOG ===");
  for (const entry of executionLog) console.log(JSON.stringify(entry, null, 2));

  console.log("\n=== HUMAN GATE LOG ===");
  for (const entry of gateLog) console.log(JSON.stringify(entry, null, 2));
})();
