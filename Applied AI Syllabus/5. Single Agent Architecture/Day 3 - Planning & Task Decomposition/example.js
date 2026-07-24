// Day 3 showcase: planning + dependency resolution + replanning, standalone
// — no memory, no HumanGate yet (those come in Day 2's already-built example
// and Day 4's example below). Just the planning pillar, in isolation.
//
//   Goal (natural language)
//        │
//        ▼
//   generatePlan(goal) ────────────► ①: ONE LLM call, structured-output,
//        │                              returns ordered subtask list with
//        │                              dependsOn (Theory.md ①)
//        ▼
//   ┌─────────────────────────────────────────────────────────────┐
//   │  EXECUTE LOOP (repeats until plan has no eligible subtask)    │
//   │                                                                │
//   │   nextEligibleSubtask(plan) ──► ①: topological sort over       │
//   │        │                          dependsOn — PLAIN CODE,      │
//   │        │                          no LLM call at all           │
//   │        ▼                                                       │
//   │   subtask.tool === null? ──yes──► mark done, no execution      │
//   │        │ no                        needed (pure reasoning step)│
//   │        ▼                                                       │
//   │   execute the fake tool for real (canned result)                │
//   │        │                                                        │
//   │        ▼                                                        │
//   │   resultBreaksAssumption(result, plan)? ──► ③: does this REAL   │
//   │        │  yes                                result contradict   │
//   │        │                                      what a LATER step  │
//   │        │                                      assumes is true?   │
//   │        ▼                                                        │
//   │   generatePlan(goal, priorPlanContext) ──► ③: the SAME planning  │
//   │        │                                     call, re-run with   │
//   │        │                                     the plan-so-far +   │
//   │        │                                     the real broken fact│
//   │        ▼                                                        │
//   │   mark subtask done, loop again                                 │
//   └─────────────────────────────────────────────────────────────┘
//        │
//        ▼
//   no eligible subtask left ──► DONE, print full run log
//
// Concrete goal used below: "Find competitor X's current pricing and email
// a summary to the team." Step 1's REAL result is rigged (via fakeTools) to
// come back empty — the classic "plan's assumption breaks mid-run" case
// from Theory.md ③ — so the replan path actually fires and is visible.

const Anthropic = require("@anthropic-ai/sdk");

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const CLAUDE_MODEL = "claude-sonnet-5";

// ---------------------------------------------------------------------------
// Fake tools. searchWeb is rigged to fail on the FIRST call (simulating the
// competitor having renamed their product line, per Theory.md ③'s example),
// then succeed on a retry with different search terms — so the plan
// actually needs to notice this and replan, not just execute blindly.
// ---------------------------------------------------------------------------

let searchWebCallCount = 0;
const fakeTools = {
  searchWeb: ({ query }) => {
    searchWebCallCount++;
    if (searchWebCallCount === 1) {
      return { query, results: [] }; // first attempt: nothing found
    }
    return { query, results: [{ title: "Competitor X (rebranded) pricing page", price: "$49/mo" }] };
  },
  fetchURL: ({ url }) => ({ url, content: "Plan: $49/mo, billed annually." }),
  sendMessage: ({ userId, text }) => ({ delivered: true, text }),
};

const TOOL_SCHEMAS_FOR_PLANNING = ["searchWeb", "fetchURL", "sendMessage", null];

// ---------------------------------------------------------------------------
// ① Planning — one structured-output call. Same call is reused, unchanged,
// for replanning (③) — just given extra context about what already ran and
// what real result broke an assumption.
// ---------------------------------------------------------------------------

const PLAN_SCHEMA_INSTRUCTIONS = `Output ONLY a JSON array of subtasks. Each subtask:
{ "id": number, "description": string, "dependsOn": number[], "tool": one of ${JSON.stringify(TOOL_SCHEMAS_FOR_PLANNING)} }
One subtask = one tool call or one clearly distinct non-tool reasoning step (Theory.md ④'s over-decomposition fix — don't split a single tool call into multiple steps).`;

async function generatePlan(goal, priorPlanContext = null) {
  const priorContextBlock = priorPlanContext
    ? `\n\nThis is a REPLAN. Original plan so far: ${JSON.stringify(priorPlanContext.planSoFar)}\nReal outcome that broke an assumption: ${priorPlanContext.realOutcome}\nRevise the remaining plan accordingly — keep completed steps ("status": "done") as-is, only change what hasn't run yet.`
    : "";

  const response = await anthropic.messages.create({
    model: CLAUDE_MODEL,
    max_tokens: 500,
    messages: [{
      role: "user",
      content: `Goal: ${goal}${priorContextBlock}\n\n${PLAN_SCHEMA_INSTRUCTIONS}`,
    }],
  });

  const text = response.content[0].text.trim();
  const jsonMatch = text.match(/\[[\s\S]*\]/);
  return JSON.parse(jsonMatch[0]);
}

// Theory.md ①: walking dependsOn as a topological sort — plain code, no LLM.
function nextEligibleSubtask(plan) {
  return plan.find(
    (t) => t.status !== "done" && t.dependsOn.every((depId) => plan.find((p) => p.id === depId)?.status === "done")
  );
}

// Theory.md ③: the code-level check that decides whether to trigger a
// replan — a real tool result contradicting what a later step assumes.
// Concrete trigger used here: an empty searchWeb result where the plan's
// next step assumed there'd be pages to extract from.
function resultBreaksAssumption(toolName, result) {
  return toolName === "searchWeb" && Array.isArray(result.results) && result.results.length === 0;
}

// ---------------------------------------------------------------------------
// Executor — deliberately minimal: no memory, no HumanGate. Just enough
// loop to drive the plan and show the replan trigger firing for real.
// ---------------------------------------------------------------------------

async function runPlanningDemo(goal) {
  const log = [];

  let plan = await generatePlan(goal);
  log.push({ step: "plan-generated", plan: JSON.parse(JSON.stringify(plan)) });

  let iterations = 0;
  while (iterations < 8) {
    iterations++;
    const subtask = nextEligibleSubtask(plan);
    if (!subtask) break; // Theory.md ①: no eligible subtask left = plan complete

    if (!subtask.tool) {
      subtask.status = "done";
      log.push({ step: "subtask-done", subtaskId: subtask.id, note: "non-tool reasoning step" });
      continue;
    }

    // For this demo, use fixed/plausible inputs per tool rather than an
    // extra LLM call to decide inputs — Day 3's focus is planning/replanning,
    // not action-selection (that's Day 4's decideAction, reused in Day 5).
    const input =
      subtask.tool === "searchWeb" ? { query: "Competitor X pricing" } :
      subtask.tool === "fetchURL" ? { url: "https://competitor-x.example/pricing" } :
      { userId: "team", text: "Competitor X pricing summary: see attached." };

    const result = fakeTools[subtask.tool](input);
    log.push({ step: "tool-executed", subtaskId: subtask.id, tool: subtask.tool, input, result });

    if (resultBreaksAssumption(subtask.tool, result)) {
      subtask.status = "done"; // the search itself ran; it just came back empty
      plan = await generatePlan(goal, {
        planSoFar: plan,
        realOutcome: `searchWeb('Competitor X pricing') returned zero results — the product may have been renamed. Add a step to search for the new name before extracting pricing.`,
      });
      log.push({ step: "replan-after-broken-assumption", plan: JSON.parse(JSON.stringify(plan)) });
      continue;
    }

    subtask.status = "done";
  }

  return { log, finalPlan: plan };
}

// ---------------------------------------------------------------------------
// Run it
// ---------------------------------------------------------------------------

(async () => {
  const goal = "Find competitor X's current pricing and email a summary to the team.";
  const { log, finalPlan } = await runPlanningDemo(goal);

  console.log("=== FULL PLANNING/REPLANNING LOG ===");
  for (const entry of log) console.log(JSON.stringify(entry, null, 2));

  console.log("\n=== FINAL PLAN STATE ===");
  console.log(JSON.stringify(finalPlan, null, 2));

  console.log(
    "\nNote: searchWeb was rigged to return zero results on its FIRST call " +
      "(simulating Theory.md ③'s 'competitor renamed their product' case). " +
      "Watch for the 'replan-after-broken-assumption' log entry — that's " +
      "generatePlan() being called a SECOND time, fed the plan-so-far and " +
      "the real broken fact, producing a revised remaining plan rather than " +
      "blindly continuing down a plan that's already known to be wrong."
  );
})();
