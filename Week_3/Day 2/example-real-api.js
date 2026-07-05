// Day 2 doubt: "is a tool just business logic, nothing to do with the
// model?" — yes. Below, callUserApi() is a completely normal function
// that could exist in any non-AI codebase. The ONLY tool-specific part
// is where it's registered (name/description/schema) and where its
// errors are caught and turned into text (Theory.md fact 3).
//
// To keep this runnable standalone, a tiny fake server (Node's built-in
// http, no framework) plays the role of "my backend" — a real GET
// endpoint returning JSON, no stubbed fake object.

const http = require("http");
const Anthropic = require("@anthropic-ai/sdk");
const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const MODEL = "claude-sonnet-5";
const MAX_REPLY_TOKENS = 1024;

// ---------------------------------------------------------------------
// "My server" — a real HTTP endpoint, GET /users/high-aum?city=Mumbai
// Returns users with AUM > 300cr in metro cities. This has ZERO
// knowledge of the model, tools, or Anthropic — it's just a server.
// ---------------------------------------------------------------------
const USERS = [
  { name: "Rohit Sharma", city: "Mumbai", aumCr: 450 },
  { name: "Ananya Iyer", city: "Bengaluru", aumCr: 320 },
  { name: "Karan Mehta", city: "Delhi", aumCr: 180 }, // below 300cr, filtered out
  { name: "Divya Nair", city: "Chennai", aumCr: 610 },
  { name: "Suresh Pillai", city: "Pune", aumCr: 275 }, // Pune isn't a metro here
];

const METRO_CITIES = new Set(["Mumbai", "Delhi", "Bengaluru", "Chennai"]);

const server = http.createServer((req, res) => {
  const url = new URL(req.url, "http://localhost");

  if (url.pathname !== "/users/high-aum") {
    res.writeHead(404, { "Content-Type": "application/json" });
    return res.end(JSON.stringify({ error: "not found" }));
  }

  const city = url.searchParams.get("city"); // optional filter
  const result = USERS.filter(
    (u) => u.aumCr > 300 && METRO_CITIES.has(u.city) && (!city || u.city === city)
  );

  res.writeHead(200, { "Content-Type": "application/json" });
  res.end(JSON.stringify({ users: result }));
});

// ---------------------------------------------------------------------
// The tool's real implementation — plain business logic, could be
// called from a cron job, a REST controller, anything. No model
// awareness here at all.
// ---------------------------------------------------------------------
async function callUserApi({ city } = {}) {
  const url = new URL("http://localhost:4000/users/high-aum");
  if (city) url.searchParams.set("city", city);

  const res = await fetch(url);
  if (!res.ok) {
    // fail loud: a developer writing this for a normal backend would
    // throw here too — this has nothing to do with tool use
    throw new Error(`user API returned HTTP ${res.status}`);
  }

  const data = await res.json();
  return data.users;
}

// ---------------------------------------------------------------------
// ToolRegistry (same as Day 1/Day 2) — this is the ONLY place that
// knows callUserApi is being exposed to a model at all.
// ---------------------------------------------------------------------
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
        // this is the ONLY tool-specific line in this whole file: catch
        // the loud failure and hand it to the model as readable text
        return `Error: ${err.message}`;
      }
    },
  };
}

const registry = createToolRegistry();

registry.register(
  "getHighAUMUsers",
  "Get users whose assets under management (AUM) exceed 300 crore INR, " +
    "located in metro cities (Mumbai, Delhi, Bengaluru, Chennai). Optionally " +
    "filter by a specific city. Use this when the user asks about high-value " +
    "or high-AUM clients in metro areas. Do NOT use this for users below " +
    "300cr AUM or in non-metro cities — this tool has no data for those.",
  {
    type: "object",
    properties: { city: { type: "string", description: "optional metro city to filter by" } },
  },
  callUserApi
);

// ---------------------------------------------------------------------
// Same request -> execute -> inject -> continue loop as Day 1/Day 2.
// ---------------------------------------------------------------------
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

    const toolResults = [];
    for (const block of response.content.filter((b) => b.type === "tool_use")) {
      const result = await registry.execute(block.name, block.input);
      toolResults.push({ type: "tool_result", tool_use_id: block.id, content: String(JSON.stringify(result)) });
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
  server.listen(4000, async () => {
    console.log(await runWithTools("Which clients have over 300cr AUM in Chennai?"));
    console.log(await runWithTools("List all high-AUM metro clients."));
    server.close();
  });
})();
