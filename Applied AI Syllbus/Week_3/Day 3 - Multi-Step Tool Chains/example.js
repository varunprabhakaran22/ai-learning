// Day 3: a ReActLoop executor — same registry/loop as Day 1/2, but built
// for DEPENDENT multi-step chains (tool #2 needs tool #1's result), with
// the two new guardrails from Theory.md: a hard max-iteration cap, and a
// full execution trace logged as we go.
//
// DEPENDENT tools (contrast with Day 1's INDEPENDENT tools example):
// getTransactions REQUIRES a userId, which only getUserId can produce —
// the model cannot fill in that input until it has OBSERVED a real
// result. This forces at least 2 loop iterations, never 1. Trace for
// the first test call below, "What are Divya Nair's recent transactions?":
//
//   User query (2nd tool's input doesn't exist until 1st tool returns)
//        │
//        ▼
//  ┌────────────────────────────┐
//  │ API call #1: msg + tools    │
//  └─────────────┬────────────────┘
//                ▼
//         ┌─────────────┐
//         │    Model     │  Reason: "I only have a NAME — getTransactions
//         │              │  needs a userId — I must call getUserId FIRST"
//         └──────┬───────┘
//                ▼
//   tool_use: getUserId({ name: "Divya Nair" })
//                │
//                ▼  ── iteration 1 ──
//    execute getUserId(...) → "user_492"
//    trace.push({ iteration:1, tool:"getUserId", result:"user_492" })
//                │
//                ▼
//  ┌────────────────────────────┐
//  │ API call #2: history +      │
//  │   tool_result ("user_492")  │
//  └─────────────┬────────────────┘
//                ▼
//         ┌─────────────┐
//         │    Model     │  Observe: NOW has a real userId
//         │              │  Reason again: "I can call getTransactions now"
//         └──────┬───────┘
//                ▼
//   tool_use: getTransactions({ userId: "user_492" })
//                │
//                ▼  ── iteration 2 ──
//    execute getTransactions(...) → [{50000,credit},{12000,debit}]
//    trace.push({ iteration:2, tool:"getTransactions", result:[...] })
//                │
//                ▼
//  ┌────────────────────────────┐
//  │ API call #3: history +      │
//  │   tool_result ([...])       │
//  └─────────────┬────────────────┘
//                ▼
//         ┌─────────────┐
//         │    Model     │  Observe: has transactions now
//         │              │  Reason: "enough info — final answer"
//         └──────┬───────┘
//                ▼
//   stop_reason: "end_turn" → loop exits after 2 iterations (< maxIterations 6)
//
// Compare with Week 3 Day 1/example.js: there, BOTH tools' inputs are
// known immediately from the user's sentence, so the model requests both
// in ONE response and the loop can finish in a single iteration. Here,
// the 2nd tool's input is unknowable until the 1st tool's real output
// arrives — that's what forces the extra round trip, not the code.

const Anthropic = require("@anthropic-ai/sdk");
const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const MODEL = "claude-sonnet-5";
const MAX_REPLY_TOKENS = 1024;

function createToolRegistry() {
  const tools = new Map();
  return {
    register(name, description, inputSchema, fn) {
      tools.set(name, { name, description, input_schema: inputSchema, fn });
    },
    getDefinitions() {
      return Array.from(tools.values()).map(({ name, description, input_schema }) => ({
        name,
        description,
        input_schema,
      }));
    },
    async execute(name, input) {
      const tool = tools.get(name);
      if (!tool) throw new Error(`no tool registered with name "${name}"`);
      try {
        return await tool.fn(input);
      } catch (err) {
        return `Error: ${err.message}`;
      }
    },
  };
}

const registry = createToolRegistry();

// Two DEPENDENT tools — getTransactions needs the userId that only
// getUserId can produce. The model can't call these in one shot; it has
// to reason, act, observe the first result, then reason again (Theory.md ②).
registry.register(
  "getUserId",
  "Look up a user's internal ID from their name. Use this FIRST whenever a " +
    "task needs a specific user's data but you were only given their name.",
  { type: "object", properties: { name: { type: "string" } }, required: ["name"] },
  ({ name }) => {
    const ids = { "Divya Nair": "user_492", "Rohit Sharma": "user_118" };
    if (!ids[name]) throw new Error(`no user found with name "${name}"`);
    return ids[name];
  }
);

registry.register(
  "getTransactions",
  "Get recent transactions for a user, given their internal user ID (not " +
    "their name). Use this only after you already have a userId — call " +
    "getUserId first if you only have a name.",
  { type: "object", properties: { userId: { type: "string" } }, required: ["userId"] },
  ({ userId }) => {
    const transactions = {
      user_492: [{ amount: 50000, type: "credit" }, { amount: 12000, type: "debit" }],
      user_118: [{ amount: 300000, type: "credit" }],
    };
    if (!transactions[userId]) throw new Error(`no transactions found for userId "${userId}"`);
    return transactions[userId];
  }
);

// Theory.md fact 3+5: hard iteration cap + a trace array logging every
// (tool, input, result) triple, independent of what the model says.
async function runReActLoop(userMessage, { maxIterations = 6 } = {}) {
  const messages = [{ role: "user", content: userMessage }];
  const trace = [];

  let response = await client.messages.create({
    model: MODEL,
    max_tokens: MAX_REPLY_TOKENS,
    tools: registry.getDefinitions(),
    messages,
  });

  let iteration = 0;

  while (response.stop_reason === "tool_use") {
    iteration++;
    if (iteration > maxIterations) {
      // graceful exit: don't crash or hang, return what we have with the trace
      trace.push({ iteration, event: "max_iterations_reached", maxIterations });
      break;
    }

    messages.push({ role: "assistant", content: response.content });

    const toolResults = [];
    for (const block of response.content.filter((b) => b.type === "tool_use")) {
      const result = await registry.execute(block.name, block.input);
      trace.push({ iteration, tool: block.name, input: block.input, result });
      toolResults.push({
        type: "tool_result",
        tool_use_id: block.id,
        content: String(JSON.stringify(result)),
      });
    }

    messages.push({ role: "user", content: toolResults });

    response = await client.messages.create({
      model: MODEL,
      max_tokens: MAX_REPLY_TOKENS,
      tools: registry.getDefinitions(),
      messages,
    });
  }

  const finalText = response.content.find((block) => block.type === "text");
  return { answer: finalText ? finalText.text : "", trace };
}

(async () => {
  // requires 2 dependent tool calls: name -> userId -> transactions
  const { answer, trace } = await runReActLoop(
    "What are Divya Nair's recent transactions?"
  );
  console.log("ANSWER:", answer);
  console.log("TRACE:", JSON.stringify(trace, null, 2));

  // intentional failure case: unknown user, observe recovery instead of a crash
  const failCase = await runReActLoop("What are Someone Unknown's recent transactions?");
  console.log("ANSWER (failure case):", failCase.answer);
  console.log("TRACE (failure case):", JSON.stringify(failCase.trace, null, 2));
})();
