// Day 1 showcase: the actual dividing line between a "chain" and an "agent",
// shown as two runnable functions side by side on the SAME goal, so the
// difference is visible in the control flow itself, not just in prose.
//
//   CHAIN (runFixedChain) — your code decides every step, always, in order:
//
//   getOrderStatus(orderId)
//        │
//        ▼
//   ALWAYS runs next: draftReply(status)        <- fixed in your code,
//        │                                          regardless of what
//        ▼                                          getOrderStatus returned
//   ALWAYS runs next: sendReply(reply)
//        │
//        ▼
//   DONE (always exactly 3 steps, same order, every run)
//
//   AGENT (runAgentLoop) — the LLM decides what to do next, each iteration,
//   based on what it currently knows; your code just executes whatever it asks for:
//
//   ┌───────────────────────────────────────────────────────────┐
//   │  LOOP (repeats until the model says DONE, or maxIterations) │
//   │                                                              │
//   │   messages.create(history) ──► model decides the NEXT        │
//   │        │                        action (tool_use, or a       │
//   │        │                        DONE: text reply)            │
//   │        ▼                                                     │
//   │   tool_use block? ──yes──► execute REAL tool ──► push result │
//   │        │                        back into history, loop again│
//   │        │ no (plain text)                                     │
//   │        ▼                                                     │
//   │   starts with "DONE:"? ──yes──► STOP, return final text      │
//   │        │ no                                                  │
//   │        ▼                                                     │
//   │   NOT done — model was just thinking out loud or asking a     │
//   │   question; push it back in and loop again (Day 2 Recap's    │
//   │   bug fix: no-tool-call is NOT the same fact as goal-is-done) │
//   └───────────────────────────────────────────────────────────┘
//
// Same goal fed to both: "Look up order #482's status and tell the customer."
// The chain always does exactly 3 fixed steps. The agent decides, at
// runtime, how many steps it needs and in what order — including looping
// back if the first lookup result implies more work is needed.

const Anthropic = require("@anthropic-ai/sdk");

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const CLAUDE_MODEL = "claude-sonnet-5";

// ---------------------------------------------------------------------------
// Fake tools — same "canned result" simplification as Day 2/Day 4's examples.
// ---------------------------------------------------------------------------

const fakeTools = {
  getOrderStatus: ({ orderId }) => ({ orderId, status: "delayed", eta: "3 extra days" }),
  draftReply: ({ status, eta }) => `Your order is ${status}; new ETA is ${eta}.`,
  sendReply: ({ text }) => ({ delivered: true, text }),
};

// ---------------------------------------------------------------------------
// CHAIN — control flow lives in YOUR code. Three steps, always in this
// order, regardless of what getOrderStatus actually returns. This is
// Theory.md ①'s exact claim made concrete: the LLM (if used at all) only
// fills in content WITHIN a step; it never decides whether a step happens
// or what happens next.
// ---------------------------------------------------------------------------

function runFixedChain(orderId) {
  const log = [];

  const status = fakeTools.getOrderStatus({ orderId }); // step 1 — always runs
  log.push({ step: 1, action: "getOrderStatus", result: status });

  const reply = fakeTools.draftReply(status); // step 2 — always runs next, no matter what step 1 returned
  log.push({ step: 2, action: "draftReply", result: reply });

  const sent = fakeTools.sendReply({ text: reply }); // step 3 — always runs last
  log.push({ step: 3, action: "sendReply", result: sent });

  return { log, finalReply: reply };
}

// ---------------------------------------------------------------------------
// AGENT — control flow lives in the MODEL's own repeated reasoning. Your
// code doesn't know in advance how many iterations this takes, or which
// tool gets called in which order — it just executes whatever the model
// decides, iteration after iteration, until the model itself says DONE.
// ---------------------------------------------------------------------------

const agentToolSchemas = [
  { name: "getOrderStatus", description: "Look up an order's shipping status", input_schema: { type: "object", properties: { orderId: { type: "string" } }, required: ["orderId"] } },
  { name: "sendReply", description: "Send a reply message to the customer", input_schema: { type: "object", properties: { text: { type: "string" } }, required: ["text"] } },
];

async function runAgentLoop(goal, { maxIterations = 5 } = {}) {
  const log = [];
  const history = [
    {
      role: "user",
      content: `Goal: ${goal}\n\nDecide your next action using the available tools. Once the customer has actually been replied to, respond with plain text starting with "DONE:" instead of calling a tool.`,
    },
  ];

  for (let step = 1; step <= maxIterations; step++) {
    const response = await anthropic.messages.create({
      model: CLAUDE_MODEL,
      max_tokens: 300,
      tools: agentToolSchemas,
      messages: history,
    });

    const toolUse = response.content.find((b) => b.type === "tool_use");

    if (!toolUse) {
      const text = response.content.find((b) => b.type === "text")?.text.trim() ?? "";
      // Day 2 Recap's bug fix, applied here from the start: "no tool_use
      // block" is NOT the same fact as "goal is done" — only an explicit
      // DONE: marker stops the loop. Anything else means the model was
      // thinking out loud or asking something, and must be pushed back in.
      if (text.startsWith("DONE:")) {
        log.push({ step, action: "model-signaled-done", text });
        return { log, finalReply: text.replace(/^DONE:\s*/, "") };
      }
      log.push({ step, action: "model-reply-not-done", text });
      history.push({ role: "assistant", content: response.content });
      history.push({ role: "user", content: "Continue toward the goal." });
      continue;
    }

    const result = fakeTools[toolUse.name](toolUse.input);
    log.push({ step, action: toolUse.name, input: toolUse.input, result });

    history.push({ role: "assistant", content: response.content });
    history.push({
      role: "user",
      content: [{ type: "tool_result", tool_use_id: toolUse.id, content: JSON.stringify(result) }],
    });
  }

  log.push({ step: "maxIterations-hit", note: "safety net tripped, no DONE: signal received" });
  return { log, finalReply: null };
}

// ---------------------------------------------------------------------------
// Run both on the SAME goal and compare.
// ---------------------------------------------------------------------------

(async () => {
  console.log("=== CHAIN (fixed 3 steps, always this order) ===");
  const chainResult = runFixedChain("482");
  console.log(JSON.stringify(chainResult, null, 2));

  console.log("\n=== AGENT (model decides the steps, iteration by iteration) ===");
  const agentResult = await runAgentLoop("Look up order #482's status and tell the customer.");
  console.log(JSON.stringify(agentResult, null, 2));

  console.log(
    "\nNote the difference: the chain's log always has exactly 3 fixed steps " +
      "in this exact order, regardless of what getOrderStatus returns. The " +
      "agent's log length and step order are whatever the model actually " +
      "decided at runtime — rerun this with a different goal and the number " +
      "and order of steps will change; the chain's never will."
  );
})();
