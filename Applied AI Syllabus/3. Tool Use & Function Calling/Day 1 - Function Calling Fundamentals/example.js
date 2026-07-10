// Day 1 concepts in one small script: a ToolRegistry that registers tools
// with name/description/input schema, and a runner that handles the full
// tool_use -> execute -> tool_result -> continue loop.
//
// INDEPENDENT tools (contrast with Day 3's DEPENDENT chain example):
// getCurrentDate and calculate don't need each other's output, so the
// model can request BOTH in the SAME response — the loop may finish in
// just ONE iteration even when 2 tools are used. Trace for the 3rd test
// call below, "What's today's date, and what's 847293 * 293847?":
//
//   User query (needs 2 tools, but neither depends on the other)
//        │
//        ▼
//  ┌────────────────────────────┐
//  │ API call #1: msg + tools    │
//  └─────────────┬────────────────┘
//                ▼
//         ┌─────────────┐
//         │    Model     │  Reason: "I need BOTH the date and a
//         │              │  calculation — neither needs the other's
//         │              │  result, so I can request both AT ONCE"
//         └──────┬───────┘
//                ▼
//   response.content = [
//     { type:"tool_use", name:"getCurrentDate", input:{} },
//     { type:"tool_use", name:"calculate", input:{expression:"847293 * 293847"} }
//   ]                     ← TWO tool_use blocks, ONE response, ONE iteration
//                │
//                ▼  ── iteration 1 (for-loop runs twice, same iteration) ──
//    execute getCurrentDate() → "2026-07-06"
//    execute calculate(...)   → "249027635571"
//                │
//                ▼
//  ┌────────────────────────────┐
//  │ API call #2: history + BOTH │
//  │   tool_results in one msg   │
//  └─────────────┬────────────────┘
//                ▼
//         ┌─────────────┐
//         │    Model     │  Observe: has both results already
//         │              │  Reason: "enough info — final answer"
//         └──────┬───────┘
//                ▼
//   stop_reason: "end_turn" → loop exits after just 1 iteration
//
// Compare with Week 3 Day 3/example.js: there, getTransactions CANNOT be
// requested until getUserId's real result comes back — that forces at
// least 2 iterations, because the 2nd tool's input doesn't exist yet
// when the model sees the question. Here, both tools' inputs are known
// immediately from the user's own sentence, so no such forcing occurs.

const Anthropic = require("@anthropic-ai/sdk");
const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const MODEL = "claude-sonnet-5";
const MAX_REPLY_TOKENS = 1024;

// Theory.md fact 5: one source of truth — name/description/schema live
// alongside the actual function, so they can't silently drift apart.
function createToolRegistry() {
  const tools = new Map();

  return {
    register(name, description, inputSchema, fn) {
      tools.set(name, { name, description, input_schema: inputSchema, fn });
    },
    // Theory.md fact 2: this is what gets sent to the model — name +
    // description + schema, NOT the function itself (the model can't run code).
    getDefinitions() {
      return Array.from(tools.values()).map(({ name, description, input_schema }) => ({
        name,
        description,
        input_schema,
      }));
    },
    // Theory.md fact 3, step 3: your code looks up and runs the REAL function.
    async execute(name, input) {
      const tool = tools.get(name);
      if (!tool) throw new Error(`no tool registered with name "${name}"`);
      return tool.fn(input);
    },
  };
}

const registry = createToolRegistry();

registry.register(
  "getWeather",
  "Get the current weather for a city. Use this whenever the user asks about weather, temperature, or conditions in a specific place.",
  { type: "object", properties: { city: { type: "string" } }, required: ["city"] },
  ({ city }) => {
    // stubbed — a real implementation would call a weather API
    const fakeData = { Tokyo: "18C, cloudy", London: "12C, rainy" };
    return fakeData[city] || "no data for that city";
  }
);

registry.register(
  "calculate",
  "Evaluate a basic arithmetic expression. Use this for any math the user asks to compute, especially large numbers.",
  { type: "object", properties: { expression: { type: "string" } }, required: ["expression"] },
  ({ expression }) => {
    // stubbed with a restricted eval-alike for demo purposes only
    if (!/^[0-9+\-*/.() ]+$/.test(expression)) throw new Error("invalid expression");
    return String(Function(`"use strict"; return (${expression})`)());
  }
);

registry.register(
  "getCurrentDate",
  "Get today's date. Use this whenever the user asks what day/date it is.",
  { type: "object", properties: {} },
  () => new Date().toISOString().split("T")[0]
);

// Theory.md fact 3: the full loop — request, execute, inject, continue.
async function runWithTools(userMessage) {
  const messages = [{ role: "user", content: userMessage }];

  // tools + messages are sent fresh on every single call — the model is
  // stateless and has no memory of tool definitions from a prior request.
  let response = await client.messages.create({
    model: MODEL,
    max_tokens: MAX_REPLY_TOKENS,
    tools: registry.getDefinitions(),
    messages,
  });

  // Theory.md fact 4: the model decides IF a tool is needed at all — loop
  // only runs while it keeps requesting tools, exits as soon as it doesn't.
  // Theory.md fact 6: stop_reason is fixed API metadata (not free text the
  // model writes, so it can't hallucinate a random value here) — "tool_use"
  // means "pause and wait for a tool_result", anything else means done.
  while (response.stop_reason === "tool_use") {
    // save the model's tool request into history — needed because the next
    // call must resend full context (model has no memory of asking for this)
    messages.push({ role: "assistant", content: response.content });

    // response.content can mix a text block + one tool_use block per tool
    // requested (e.g. 2 tool_use blocks for the date+math question below)
    const toolUseBlocks = response.content.filter((block) => block.type === "tool_use");
    const toolResults = [];

    for (const block of toolUseBlocks) {
      // this is the ONLY point real code executes — everything before this
      // was just the model describing what it wants (Theory.md fact 1)
      const result = await registry.execute(block.name, block.input);
      toolResults.push({
        type: "tool_result",
        tool_use_id: block.id, // matches back to the specific tool_use request
        content: String(result),
      });
    }

    // tool_result blocks go in as a "user" message — that's the API's
    // convention for "here's the answer to what you asked for"
    messages.push({ role: "user", content: toolResults });

    response = await client.messages.create({
      model: MODEL,
      max_tokens: MAX_REPLY_TOKENS,
      tools: registry.getDefinitions(),
      messages,
    });
  }

  const finalText = response.content.find((block) => block.type === "text");
  return finalText ? finalText.text : "";
}

(async () => {
  console.log(await runWithTools("What is 2+2?")); // 0 tools needed
  console.log(await runWithTools("What's the weather in Tokyo?")); // 1 tool
  console.log(await runWithTools("What's today's date, and what's 847293 * 293847?")); // 2 tools
})();
