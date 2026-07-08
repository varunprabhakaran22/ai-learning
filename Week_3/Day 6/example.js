// Day 6: hooks are NOT tied to tools specifically — a hook can wrap ANY
// function in your pipeline. This example wraps registry.execute (tool
// calls) because that's a function you already know from Day 1-3, but
// the same wrapping mechanic works on ANY function (see runWithHooks's
// comment at the bottom for a non-tool example).
//
//   Normal call (Day 1-3, no hook):
//     caller ──────────────────────► registry.execute(name, input)
//
//   Hooked call (Day 6):
//     caller ──► executeWithHook ──► beforeToolCall(name, input)   [YOUR
//                      │                    │                       CODE,
//                      │                    ▼                       NO
//                      │             allowed?  blocked?             MODEL]
//                      │                │           │
//                      │                ▼           ▼
//                      │      registry.execute   return error text
//                      │        (name, input)     (real fn NEVER runs)
//                      ▼
//               result returned to caller
//
// The caller (runReActLoop below) calls executeWithHook INSTEAD OF
// registry.execute directly — that's the only code change needed.

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
    // unchanged from Day 1-3 — the hook does NOT live inside execute()
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

registry.register(
  "readFile",
  "Read the text content of a local file at the given path.",
  { type: "object", properties: { path: { type: "string" } }, required: ["path"] },
  ({ path }) => `pretend contents of ${path}`
);

registry.register(
  "getCurrentDate",
  "Get today's date.",
  { type: "object", properties: {} },
  () => new Date().toISOString().split("T")[0]
);

// ---------------------------------------------------------------------
// THE HOOK — plain business logic, zero model involvement (Theory.md 1).
// Blocks any readFile call trying to escape a fixed allowed directory.
// This is exactly the kind of thing that does NOT belong tangled inside
// registry.execute (Theory.md 3) — it's a separate, removable concern.
// ---------------------------------------------------------------------
const ALLOWED_DIR = "/safe/notes/";

function beforeToolCall(name, input) {
  if (name === "readFile" && !input.path.startsWith(ALLOWED_DIR)) {
    return { blocked: true, reason: `path "${input.path}" is outside ${ALLOWED_DIR}` };
  }
  return { blocked: false };
}

// ---------------------------------------------------------------------
// THE WRAPPER — this is the actual "mapping" between hook and tool call.
// registry.execute itself never changes; this sits BETWEEN the caller
// and registry.execute.
// ---------------------------------------------------------------------
async function executeWithHook(name, input) {
  const decision = beforeToolCall(name, input); // hook runs FIRST
  if (decision.blocked) {
    console.log(`[hook] blocked ${name}(${JSON.stringify(input)}) — ${decision.reason}`);
    return `Error: blocked by hook — ${decision.reason}`;
  }
  return registry.execute(name, input); // real function runs only if allowed
}

// Same loop as Day 3, with ONE line changed: registry.execute -> executeWithHook
async function runWithHooks(userMessage) {
  const messages = [{ role: "user", content: userMessage }];

  // shape of `response` here, for runWithHooks("Read the file /etc/passwd"):
  // {
  //   id: "msg_01Xyz...",
  //   type: "message",
  //   role: "assistant",
  //   model: "claude-sonnet-5",
  //   stop_reason: "tool_use",        <- triggers the while loop below
  //   content: [
  //     { type: "text", text: "I'll read that file for you." },   <- optional, model may skip this
  //     {
  //       type: "tool_use",
  //       id: "toolu_01Abc...",        <- matched later via tool_use_id
  //       name: "readFile",
  //       input: { path: "/etc/passwd" }   <- what the HOOK inspects
  //     }
  //   ],
  //   usage: { input_tokens: 412, output_tokens: 34 }
  // }
  // Nothing about this response shape is hook-specific — it's the exact
  // same tool_use block Day 1 taught. The hook only matters at the NEXT
  // step, when block.input is handed to executeWithHook (line ~118).
  let response = await client.messages.create({
    model: MODEL,
    max_tokens: MAX_REPLY_TOKENS,
    tools: registry.getDefinitions(),
    messages,
  });

  while (response.stop_reason === "tool_use") {
    messages.push({ role: "assistant", content: response.content });

    const toolResults = [];
    for (const block of response.content.filter((b) => b.type === "tool_use")) {
      const result = await executeWithHook(block.name, block.input); // <- only change
      toolResults.push({ type: "tool_result", tool_use_id: block.id, content: String(result) });
    }

    messages.push({ role: "user", content: toolResults });

    response = await client.messages.create({
      model: MODEL,
      max_tokens: MAX_REPLY_TOKENS,
      tools: registry.getDefinitions(),
      messages,
    });
  }

  const finalText = response.content.find((b) => b.type === "text");
  return finalText ? finalText.text : "";
}

(async () => {
  // allowed path -> hook lets it through -> readFile actually runs
  console.log(await runWithHooks("Read the file /safe/notes/todo.txt"));

  // disallowed path -> hook blocks it -> readFile NEVER runs, model
  // just receives "Error: blocked by hook..." as the tool_result
  console.log(await runWithHooks("Read the file /etc/passwd"));
})();

// ---------------------------------------------------------------------
// PROOF hooks aren't tool-specific: the exact same wrapper pattern could
// instead wrap the API call itself, with no tools involved at all:
//
//   async function createWithHook(params) {
//     if (beforeRequestHook(params).blocked) return null;
//     const response = await client.messages.create(params);   // real call
//     return afterResponseHook(response);                       // inspect/modify
//   }
//
// Same 3-piece mechanic (Theory.md's mapping): hook function, wrapper
// that calls hook-then-real-thing, caller uses the wrapper instead of
// calling the real thing directly. registry.execute was just this
// week's convenient real thing to wrap.
