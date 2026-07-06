// REAL-WORLD example: connecting to GitHub's official REMOTE MCP server
// (not a toy server you wrote — GitHub's actual hosted MCP endpoint).
//
// Compare to mcp-client.js:
//   mcp-client.js       -> StdioClientTransport, spawns YOUR OWN local
//                          subprocess (mcp-server.js), no auth needed
//   mcp-client-github.js -> StreamableHTTPClientTransport, talks to a
//                          server GitHub runs and hosts, over the
//                          internet, and REQUIRES authentication
//
// Everything AFTER the connection (listTools, the tool-use loop,
// callTool) is byte-for-byte identical to mcp-client.js — that's the
// whole point of MCP being a standard: the transport changes, nothing
// else does.
//
// Setup:
//   npm install @modelcontextprotocol/sdk @anthropic-ai/sdk
//   export GITHUB_PAT="ghp_..."       (Settings -> Developer settings ->
//                                       Personal access tokens; scopes:
//                                       repo, read:org)
//   export ANTHROPIC_API_KEY="sk-..."
//   node mcp-client-github.js

const { Client } = require("@modelcontextprotocol/sdk/client/index.js");
const { StreamableHTTPClientTransport } = require("@modelcontextprotocol/sdk/client/streamableHttp.js");
const Anthropic = require("@anthropic-ai/sdk");

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const MODEL = "claude-sonnet-5";
const MAX_REPLY_TOKENS = 1024;

async function main() {
  if (!process.env.GITHUB_PAT) {
    throw new Error("Set GITHUB_PAT to a GitHub personal access token (scopes: repo, read:org)");
  }

  // THE key difference from mcp-client.js: no subprocess is spawned.
  // This URL is GitHub's own server, running on GitHub's infrastructure —
  // we're just opening an authenticated HTTP connection to it.
  const transport = new StreamableHTTPClientTransport(
    new URL("https://api.githubcopilot.com/mcp/"),
    {
      requestInit: {
        headers: { Authorization: `Bearer ${process.env.GITHUB_PAT}` },
      },
    }
  );

  const mcpClient = new Client({ name: "day4-github-demo-client", version: "1.0.0" });
  await mcpClient.connect(transport);

  // identical call to mcp-client.js — discovery works the same over
  // HTTP as it did over stdio, because MCP standardizes this regardless
  // of transport (Theory.md fact 4)
  const { tools: mcpTools } = await mcpClient.listTools();
  console.log(`Discovered ${mcpTools.length} tools from GitHub's MCP server.`);

  const claudeTools = mcpTools.map((t) => ({
    name: t.name,
    description: t.description,
    input_schema: t.inputSchema,
  }));

  const messages = [
    { role: "user", content: "Who is the owner of the repo anthropics/claude-code, and how many open issues does it have?" },
  ];

  let response = await anthropic.messages.create({
    model: MODEL,
    max_tokens: MAX_REPLY_TOKENS,
    tools: claudeTools,
    messages,
  });

  // identical loop to mcp-client.js and Day 1 — "execute" now means an
  // HTTP round trip to GitHub's server instead of a local subprocess
  // call, but the loop itself doesn't know or care about that difference
  while (response.stop_reason === "tool_use") {
    messages.push({ role: "assistant", content: response.content });

    const toolResults = [];
    for (const block of response.content.filter((b) => b.type === "tool_use")) {
      console.log(`-> calling GitHub tool: ${block.name}(${JSON.stringify(block.input)})`);
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
  console.log("\n" + (finalText ? finalText.text : ""));

  await mcpClient.close();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
