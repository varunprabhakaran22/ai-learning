// Client for mcp-server-http.js — connects over real HTTP to YOUR OWN
// server (localhost here, but the URL could be any deployed host) instead
// of spawning a subprocess (mcp-client.js) or hitting GitHub's server
// (mcp-client-github.js). Same transport class as the GitHub example,
// just pointed at a different URL with a different token scheme.
//
// Run (after mcp-server-http.js is already running in another terminal):
//   export MCP_TOKEN="some-shared-secret"   (must match the server's)
//   export ANTHROPIC_API_KEY="sk-..."
//   node mcp-client-http.js

const { Client } = require("@modelcontextprotocol/sdk/client/index.js");
const { StreamableHTTPClientTransport } = require("@modelcontextprotocol/sdk/client/streamableHttp.js");
const Anthropic = require("@anthropic-ai/sdk");

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const MODEL = "claude-sonnet-5";
const MAX_REPLY_TOKENS = 1024;

async function main() {
  const transport = new StreamableHTTPClientTransport(
    new URL("http://localhost:3000/mcp"),
    {
      requestInit: {
        headers: { Authorization: `Bearer ${process.env.MCP_TOKEN || "dev-secret"}` },
      },
    }
  );

  const mcpClient = new Client({ name: "day4-http-demo-client", version: "1.0.0" });
  await mcpClient.connect(transport);

  // identical from here on to mcp-client.js and mcp-client-github.js —
  // the whole point being demonstrated across all three client files
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

  while (response.stop_reason === "tool_use") {
    messages.push({ role: "assistant", content: response.content });

    const toolResults = [];
    for (const block of response.content.filter((b) => b.type === "tool_use")) {
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

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
