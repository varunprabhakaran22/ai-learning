// Day 4 showcase: risk-tiered tools + HumanGate, standalone — no planning,
// no memory (those are Day 3's and Day 2's examples). Just the gate pillar,
// in isolation, run against one small task that deliberately hits all three
// tiers so each behavior is actually visible in the log.
//
//   decideAction(subtask) ──► LLM call: which tool + input + a self-reported
//        │                     confidence score + justification (Theory.md ②)
//        ▼
//   HumanGate.check(action, confidence) ──► Theory.md ③: THE ONE INSERTION
//        │                                    POINT — between "model decided"
//        │                                    and "code executes" — nowhere else
//        ▼
//   look up TOOL_REGISTRY[action.name].tier
//        │
//        ├── never-ask ──────────────► proceed, zero pause (pure read, no
//        │                              side effect — confidence never checked)
//        │
//        ├── always-ask ─────────────► ALWAYS pause, regardless of confidence
//        │                              value (irreversible/real-world-costly —
//        │                              a self-reported number is never trusted)
//        │
//        └── threshold-based ────────► pause ONLY IF confidence < tool.threshold
//                                       (recoverable-ish; per-call ambiguity
//                                       decides, not the tool's identity alone)
//        │
//        ▼
//   simulateHumanReview() ──► approve / reject (the ONE faked function —
//        │                     swap for a real prompt/UI in production)
//        ▼
//   approved? ──yes──► execute REAL tool, exactly as if ungated
//        │
//        no
//        ▼
//   feed "human rejected: <reason>" back in as a real result — NOT a dead
//   end (Day 3's replanning would consume this the same way it consumes a
//   broken tool result; this demo just logs it, since there's no planner here)
//
// Concrete task: three subtasks, one per tier —
//   1. getAccountStatus (never-ask)     -> should proceed with zero pause
//   2. writeFile (threshold-based, 80)  -> deliberately low-confidence input
//                                          -> should pause, then get REJECTED
//   3. sendMessage (always-ask)         -> should pause even though the
//                                          model reports high confidence

const Anthropic = require("@anthropic-ai/sdk");

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const CLAUDE_MODEL = "claude-sonnet-5";

// ---------------------------------------------------------------------------
// ② Tool registry — tier is a property of the TOOL, assigned ONCE here at
// registration time, never decided by the model at runtime.
// ---------------------------------------------------------------------------

const TOOL_REGISTRY = {
  getAccountStatus: {
    tier: "never-ask", // pure read, no side effect
    run: ({ userId }) => ({ userId, cardStatus: "valid", pendingBooking: false }),
  },
  writeFile: {
    tier: "threshold-based", // recoverable-ish, gated on self-reported confidence
    threshold: 80,
    run: ({ path, content }) => ({ written: true, path }),
  },
  sendMessage: {
    tier: "always-ask", // irreversible, real-world-consequential
    run: ({ userId, text }) => ({ delivered: true, text }),
  },
};

const anthropicToolSchemas = [
  { name: "getAccountStatus", description: "Look up a user's account status", input_schema: { type: "object", properties: { userId: { type: "string" } }, required: ["userId"] } },
  { name: "writeFile", description: "Overwrite a file with new content", input_schema: { type: "object", properties: { path: { type: "string" }, content: { type: "string" } }, required: ["path", "content"] } },
  { name: "sendMessage", description: "Send a message to a real customer", input_schema: { type: "object", properties: { userId: { type: "string" }, text: { type: "string" } }, required: ["userId", "text"] } },
];

// ---------------------------------------------------------------------------
// ③ HumanGate — the single insertion point. This demo's simulateHumanReview
// is scripted (not just auto-approve-everything like Day 5's) so both an
// approval AND a rejection are actually exercised and visible in the log.
// ---------------------------------------------------------------------------

function simulateHumanReview(action, tier, confidence) {
  if (action.name === "writeFile") {
    // Deliberately reject this one, to prove a rejection is logged and
    // does NOT execute the tool — see Theory.md ③, Step 3.5(d).
    return { decision: "reject", reason: "ambiguous which config key to overwrite — check with the user first" };
  }
  return { decision: "approve", reason: null };
}

function createHumanGate(log) {
  return {
    async check(action, confidence, justification) {
      const tool = TOOL_REGISTRY[action.name];
      const tier = tool.tier;

      let needsApproval;
      if (tier === "never-ask") {
        needsApproval = false;
      } else if (tier === "always-ask") {
        needsApproval = true; // confidence never consulted for this tier
      } else {
        needsApproval = confidence < tool.threshold; // threshold-based
      }

      let humanDecision = null;
      if (needsApproval) {
        humanDecision = simulateHumanReview(action, tier, confidence);
      }

      log.push({
        action,
        tier,
        modelConfidence: confidence,
        modelJustification: justification,
        gated: needsApproval,
        humanDecision: humanDecision?.decision ?? "auto-approved (never-ask, zero pause)",
        humanReason: humanDecision?.reason ?? null,
      });

      const approved = !needsApproval || humanDecision.decision === "approve";
      return { approved, reason: humanDecision?.reason ?? null };
    },
  };
}

// ---------------------------------------------------------------------------
// decideAction — same structured "state confidence + call a tool" pattern
// as Theory.md ②. Deliberately worded per-subtask so writeFile's prompt is
// genuinely ambiguous (low confidence expected) and the other two are not.
// ---------------------------------------------------------------------------

async function decideAction(instruction, toolChoices) {
  const response = await anthropic.messages.create({
    model: CLAUDE_MODEL,
    max_tokens: 300,
    tools: toolChoices,
    messages: [{
      role: "user",
      content: `${instruction}\n\nCall the appropriate tool. Before calling it, state a confidence score 0-100 reflecting how certain you are this is the correct action given the available information, and a one-sentence justification, then call the tool.`,
    }],
  });

  const toolUse = response.content.find((b) => b.type === "tool_use");
  const text = response.content.find((b) => b.type === "text")?.text ?? "";
  const confidenceMatch = text.match(/confidence[:\s]+(\d+)/i);
  const confidence = confidenceMatch ? parseInt(confidenceMatch[1], 10) : 100;
  return { toolUse, justification: text.trim() || "(no explicit reasoning text)", confidence };
}

// ---------------------------------------------------------------------------
// Run the three-tier demo
// ---------------------------------------------------------------------------

async function runHumanGateDemo() {
  const gateLog = [];
  const gate = createHumanGate(gateLog);
  const executionLog = [];

  const subtasks = [
    {
      label: "never-ask tier",
      instruction: `Look up account status for user "X" using getAccountStatus.`,
      tools: [anthropicToolSchemas[0]],
    },
    {
      label: "threshold-based tier (deliberately ambiguous)",
      instruction: `A user asked to "update the config" but did not say which file or what content. You must still call writeFile with your best guess at path and content, but this is genuinely ambiguous — reflect that honestly in your stated confidence.`,
      tools: [anthropicToolSchemas[1]],
    },
    {
      label: "always-ask tier (unambiguous, high confidence)",
      instruction: `Send a clear, unambiguous confirmation message to user "X" via sendMessage saying their order has shipped.`,
      tools: [anthropicToolSchemas[2]],
    },
  ];

  for (const subtask of subtasks) {
    const { toolUse, justification, confidence } = await decideAction(subtask.instruction, subtask.tools);
    if (!toolUse) {
      executionLog.push({ label: subtask.label, note: "model returned no tool call" });
      continue;
    }

    const { approved, reason } = await gate.check({ name: toolUse.name, input: toolUse.input }, confidence, justification);

    if (!approved) {
      executionLog.push({ label: subtask.label, action: toolUse.name, gated: true, approved: false, humanReason: reason });
      continue; // in a real system with a planner, this feeds back in as a real result (Day 3's replan mechanism) — no planner here, so just logged
    }

    const tool = TOOL_REGISTRY[toolUse.name];
    const result = tool.run(toolUse.input);
    executionLog.push({ label: subtask.label, action: toolUse.name, input: toolUse.input, confidence, result });
  }

  return { executionLog, gateLog };
}

(async () => {
  const { executionLog, gateLog } = await runHumanGateDemo();

  console.log("=== EXECUTION LOG ===");
  for (const entry of executionLog) console.log(JSON.stringify(entry, null, 2));

  console.log("\n=== HUMAN GATE LOG ===");
  for (const entry of gateLog) console.log(JSON.stringify(entry, null, 2));

  console.log(
    "\nExpected pattern: getAccountStatus never appears in the gate log at " +
      "all (never-ask skips the gate check's pause path entirely). writeFile " +
      "should show gated: true and humanDecision: 'reject' (confidence " +
      "should self-report low given the deliberately ambiguous instruction). " +
      "sendMessage should show gated: true and humanDecision: 'approve' — " +
      "note it is gated even though confidence is high, because always-ask " +
      "never consults confidence at all."
  );
})();
