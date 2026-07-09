// Day 4 showcase: an MCP CLIENT that launches mcp-server.js as a
// subprocess, discovers its tools, and drives the SAME request -> execute
// -> inject -> continue loop from Day 1 — except "execute" now means
// "send a call over MCP to the server" instead of "call a local fn"
// (Theory.md fact 2, 4). The model's behavior is completely unchanged.
//
//   User query
//        │
//        ▼
//  ┌──────────────────────────────┐
//  │ Client asks SERVER (over MCP):│
//  │   "list your tools"           │
//  └─────────────┬──────────────────┘
//                ▼
//     server replies: [{name, description, input_schema}, ...]
//                │
//                ▼
//  ┌──────────────────────────────┐
//  │ Client sends: msg + those      │
//  │   tool definitions to the MODEL│
//  └─────────────┬──────────────────┘
//                ▼
//         ┌─────────────┐
//         │    Model     │  Reason + Act: same as Day 1 — outputs
//         │              │  tool_use: {name, input}
//         └──────┬───────┘
//                ▼
//  ┌──────────────────────────────┐
//  │ Client sends over MCP:         │
//  │   "call tool X with input Y"   │
//  └─────────────┬──────────────────┘
//                ▼
//         SERVER executes its REAL function, replies with a result
//                │
//                ▼
//  ┌──────────────────────────────┐
//  │ Client injects the result as   │
//  │   tool_result, calls model     │
//  │   AGAIN (Day 1's loop, exactly)│
//  └─────────────┬──────────────────┘
//                ▼
//     stop_reason: end_turn → final text displayed to user

const { Client } = require("@modelcontextprotocol/sdk/client/index.js");
const { StdioClientTransport } = require("@modelcontextprotocol/sdk/client/stdio.js");
const Anthropic = require("@anthropic-ai/sdk");

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const MODEL = "claude-sonnet-5";
const MAX_REPLY_TOKENS = 1024;

async function main() {
  // launches mcp-server.js as a subprocess, talks to it over stdio
  const transport = new StdioClientTransport({ command: "node", args: ["mcp-server.js"] });
  const mcpClient = new Client({ name: "day4-demo-client", version: "1.0.0" });
  await mcpClient.connect(transport);

  // discovery — same output SHAPE as Day 1's registry.getDefinitions(),
  // just sourced from the server over MCP instead of a local Map
  const { tools: mcpTools } = await mcpClient.listTools();
  const claudeTools = mcpTools.map((t) => ({
    name: t.name,
    description: t.description,
    input_schema: t.inputSchema,
  }));

  const messages = [{ role: "user", content: "What are Divya Nair's recent transactions?" }];

  let response = await anthropic.messages.create({
    model: MODEL,
    max_tokens: MAX_REPLY_TOKENS,
    tools: claudeTools,
    messages,
  });

  // identical loop to Day 1/Day 3 — the only thing that changed is what
  // "execute" means underneath (an MCP call instead of tool.fn(input))
  while (response.stop_reason === "tool_use") {
    messages.push({ role: "assistant", content: response.content });

    const toolResults = [];
    for (const block of response.content.filter((b) => b.type === "tool_use")) {
      // THIS is the MCP-specific line: execution happens on the SERVER,
      // reached over the transport, not as a direct function call here
      const mcpResult = await mcpClient.callTool({ name: block.name, arguments: block.input });
      const resultText = mcpResult.content.map((c) => c.text).join("\n");

      toolResults.push({ type: "tool_result", tool_use_id: block.id, content: resultText });
    }

    messages.push({ role: "user", content: toolResults });

    response = await anthropic.messages.create({
      model: MODEL,
      max_tokens: MAX_REPLY_TOKENS,
      tools: claudeTools,
      messages,
    });
  }

  const finalText = response.content.find((b) => b.type === "text");
  console.log(finalText ? finalText.text : "");

  await mcpClient.close();
}

main();
