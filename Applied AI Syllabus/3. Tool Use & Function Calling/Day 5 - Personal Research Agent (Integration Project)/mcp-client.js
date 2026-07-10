// Personal Research Agent — takes a research question, searches the web,
// reads pages, synthesizes a cited answer, saves it as a markdown report.
// Same MCP client shape as Day 4's mcp-client.js: spawn the server as a
// subprocess, discover its tools, drive the ReAct loop (Theory.md fact 1).
//
// Run:
//   npm install @modelcontextprotocol/sdk zod @anthropic-ai/sdk
//   export BRAVE_API_KEY="..."
//   export ANTHROPIC_API_KEY="..."
//   node mcp-client.js "your research question here"

const { Client } = require("@modelcontextprotocol/sdk/client/index.js");
const { StdioClientTransport } = require("@modelcontextprotocol/sdk/client/stdio.js");
const Anthropic = require("@anthropic-ai/sdk");

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const MODEL = "claude-sonnet-5";
const MAX_REPLY_TOKENS = 2048;

// Theory.md fact 4: citations are a prompting concern, not a tool
// concern — nothing forces the model to cite URLs, this instruction does
const SYSTEM_PROMPT = `You are a research agent. Given a question:
1. Use searchWeb to find candidate pages.
2. Use fetchPage to read the most relevant pages in full before relying on them.
3. Once you have enough information, write a final answer that cites the URL of every source you used, inline (e.g. "(source: https://...)").
4. Call saveReport LAST with the full answer as markdown (filename should be a short slug of the question + ".md").
Do not call saveReport until your research is complete.`;

async function runResearchAgent(question) {
  const transport = new StdioClientTransport({ command: "node", args: [__dirname + "/mcp-server.js"] });
  const mcpClient = new Client({ name: "research-agent-client", version: "1.0.0" });
  await mcpClient.connect(transport);

  const { tools: mcpTools } = await mcpClient.listTools();
  const claudeTools = mcpTools.map((t) => ({
    name: t.name,
    description: t.description,
    input_schema: t.inputSchema,
  }));

  const messages = [{ role: "user", content: question }];

  let response = await anthropic.messages.create({
    model: MODEL,
    max_tokens: MAX_REPLY_TOKENS,
    system: SYSTEM_PROMPT,
    tools: claudeTools,
    messages,
  });

  // identical ReAct loop to Day 1/3/4 — the model reasons, requests a
  // tool, observes the result, and decides what to do next each time
  while (response.stop_reason === "tool_use") {
    messages.push({ role: "assistant", content: response.content });

    // print the model's reasoning between tool calls, if any — this is
    // the "Reason" half of ReAct made visible
    const reasoning = response.content.find((b) => b.type === "text");
    if (reasoning) console.log(`\n[reasoning] ${reasoning.text}`);

    const toolResults = [];
    for (const block of response.content.filter((b) => b.type === "tool_use")) {
      console.log(`[act] ${block.name}(${JSON.stringify(block.input)})`);
      const mcpResult = await mcpClient.callTool({ name: block.name, arguments: block.input });
      const resultText = mcpResult.content.map((c) => c.text).join("\n");

      toolResults.push({ type: "tool_result", tool_use_id: block.id, content: resultText });
    }

    messages.push({ role: "user", content: toolResults });

    response = await anthropic.messages.create({
      model: MODEL,
      max_tokens: MAX_REPLY_TOKENS,
      system: SYSTEM_PROMPT,
      tools: claudeTools,
      messages,
    });
  }

  const finalText = response.content.find((b) => b.type === "text");
  console.log("\n[final answer]\n" + (finalText ? finalText.text : ""));

  await mcpClient.close();
}

const question = process.argv[2];
if (!question) {
  console.error('Usage: node mcp-client.js "your research question here"');
  process.exit(1);
}

runResearchAgent(question).catch((err) => {
  console.error(err);
  process.exit(1);
});
