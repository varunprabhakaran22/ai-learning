// Day 2: a 5-tool mini toolkit wired into the Day 1 ToolRegistry pattern.
// Focus is Theory.md's 3 principles: single responsibility, precise
// descriptions (with explicit "use this when / not for" language), and
// safe failure modes (errors returned as readable tool_result text,
// never an uncaught throw that would crash the loop).

const Anthropic = require("@anthropic-ai/sdk");
const fs = require("fs/promises");
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
    // Theory.md fact 3: catch here, not just at the call site — a thrown
    // error becomes readable tool_result content instead of crashing the loop.
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
  "searchWeb",
  "Search the web for current information. Use this when the user asks about " +
    "something recent, real-world, or outside your training data (news, prices, " +
    "current events). Do NOT use this for general knowledge you already know, " +
    "or for anything about local files.",
  { type: "object", properties: { query: { type: "string" } }, required: ["query"] },
  async ({ query }) => {
    // stubbed — a real implementation would call Brave/Serper API here
    if (!process.env.SEARCH_API_KEY) {
      throw new Error("SEARCH_API_KEY not configured, cannot search the web");
    }
    return `stub search results for: ${query}`;
  }
);

registry.register(
  "readFile",
  "Read the text content of a local file at the given path. Use this when the " +
    "user asks about the contents of a specific file. Do NOT use this to write " +
    "or modify files, and do NOT use this for URLs (use fetchURL instead).",
  { type: "object", properties: { path: { type: "string" } }, required: ["path"] },
  async ({ path }) => {
    // safe failure: a missing/unreadable file becomes error text, not a crash
    return await fs.readFile(path, "utf-8");
  }
);

registry.register(
  "writeFile",
  "Write text content to a local file at the given path, overwriting any " +
    "existing content. Use this only when the user explicitly asks to save or " +
    "write output to a file. Do NOT use this to read or inspect files.",
  {
    type: "object",
    properties: { path: { type: "string" }, content: { type: "string" } },
    required: ["path", "content"],
  },
  async ({ path, content }) => {
    await fs.writeFile(path, content, "utf-8");
    return `wrote ${content.length} characters to ${path}`;
  }
);

registry.register(
  "fetchURL",
  "Fetch the text content of a webpage at the given URL. Use this when the " +
    "user gives you a specific URL to read. Do NOT use this for general web " +
    "search with no specific URL (use searchWeb instead).",
  { type: "object", properties: { url: { type: "string" } }, required: ["url"] },
  async ({ url }) => {
    // Theory.md fact 4: fetching an attacker-influenced URL is an SSRF seed
    // (full hardening in Week 12 Day 5) — flagged here, not solved here.
    const res = await fetch(url);
    if (!res.ok) throw new Error(`fetchURL got HTTP ${res.status} for ${url}`);
    return await res.text();
  }
);

registry.register(
  "getCurrentDate",
  "Get today's date. Use this whenever the user asks what day/date it is.",
  { type: "object", properties: {} },
  () => new Date().toISOString().split("T")[0]
);

// Same loop as Day 1 — Day 2 changes what the tools DO, not how the loop works.
async function runWithTools(userMessage) {
  const messages = [{ role: "user", content: userMessage }];

  let response = await client.messages.create({
    model: MODEL,
    max_tokens: MAX_REPLY_TOKENS,
    tools: registry.getDefinitions(),
    messages,
  });

  while (response.stop_reason === "tool_use") {
    messages.push({ role: "assistant", content: response.content });

    const toolUseBlocks = response.content.filter((block) => block.type === "tool_use");
    const toolResults = [];

    for (const block of toolUseBlocks) {
      const result = await registry.execute(block.name, block.input);
      toolResults.push({
        type: "tool_result",
        tool_use_id: block.id,
        content: String(result),
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
  return finalText ? finalText.text : "";
}

(async () => {
  console.log(await runWithTools("What's today's date?")); // getCurrentDate
  console.log(await runWithTools("Read the file ./notes.txt")); // readFile
  console.log(await runWithTools("Write 'hello' to ./out.txt")); // writeFile
})();
