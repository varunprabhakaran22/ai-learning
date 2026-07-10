// Personal Research Agent's tool server — 3 real tools (not toy/hardcoded
// data like Day 4's showcase): searchWeb hits the real Brave Search API,
// fetchPage downloads a real URL, saveReport writes a real file to disk.
// Exposed the same way as Day 4's mcp-server.js — an MCP server over
// stdio — so the client (mcp-client.js) discovers and calls these
// exactly like it would any other MCP server.
//
// Run:
//   npm install @modelcontextprotocol/sdk zod
//   export BRAVE_API_KEY="..."   (free tier: brave.com/search/api)

const { McpServer } = require("@modelcontextprotocol/sdk/server/mcp.js");
const { StdioServerTransport } = require("@modelcontextprotocol/sdk/server/stdio.js");
const { z } = require("zod");

const server = new McpServer({ name: "research-agent-server", version: "1.0.0" });

// Tool 1 — searchWeb: real search via Brave's API, returns a short list
// of candidates so the model can pick which page(s) to actually read
server.registerTool(
  "searchWeb",
  {
    description:
      "Search the web for a query. Returns up to 5 results, each with a " +
      "title, URL, and short snippet. Use this FIRST to find candidate " +
      "pages before reading any of them in full.",
    inputSchema: { query: z.string() },
  },
  async ({ query }) => {
    const res = await fetch(
      `https://api.search.brave.com/res/v1/web/search?q=${encodeURIComponent(query)}&count=5`,
      { headers: { Accept: "application/json", "X-Subscription-Token": process.env.BRAVE_API_KEY } }
    );

    if (!res.ok) {
      // Day 2 fact 3: fail loud but as readable content, not an uncaught throw
      return { content: [{ type: "text", text: `Error: search failed with status ${res.status}` }], isError: true };
    }

    const data = await res.json();
    const results = (data.web?.results || []).map((r) => ({
      title: r.title,
      url: r.url,
      snippet: r.description,
    }));

    return { content: [{ type: "text", text: JSON.stringify(results) }] };
  }
);

// Tool 2 — fetchPage: downloads a URL and strips HTML down to readable
// text, so the model can read actual page content, not just a snippet.
// Depends on searchWeb's output the same way Day 3/4's getTransactions
// depended on getUserId's output.
server.registerTool(
  "fetchPage",
  {
    description:
      "Fetch a URL and return its readable text content (HTML stripped). " +
      "Use this AFTER searchWeb, on a URL from its results, to read a " +
      "page in full before citing it.",
    inputSchema: { url: z.string() },
  },
  async ({ url }) => {
    const res = await fetch(url);
    if (!res.ok) {
      return { content: [{ type: "text", text: `Error: could not fetch "${url}" (status ${res.status})` }], isError: true };
    }

    const html = await res.text();
    // minimal HTML-to-text: strip tags/scripts/styles, collapse whitespace,
    // cap length so one page can't blow the model's context on its own
    const text = html
      .replace(/<script[\s\S]*?<\/script>/gi, "")
      .replace(/<style[\s\S]*?<\/style>/gi, "")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 5000);

    return { content: [{ type: "text", text }] };
  }
);

// Tool 3 — saveReport: terminal tool, writes the final synthesized
// answer to a markdown file. Doesn't feed back into more reasoning —
// called once the model has decided it's done researching.
server.registerTool(
  "saveReport",
  {
    description:
      "Save the final research answer as a markdown report to disk. " +
      "Call this LAST, once you have synthesized a full answer with " +
      "citations — not before.",
    inputSchema: { filename: z.string(), markdown: z.string() },
  },
  async ({ filename, markdown }) => {
    const fs = require("node:fs");
    const path = require("node:path");
    const outPath = path.join(__dirname, "reports", filename);
    fs.mkdirSync(path.dirname(outPath), { recursive: true });
    fs.writeFileSync(outPath, markdown, "utf8");
    return { content: [{ type: "text", text: `Saved report to ${outPath}` }] };
  }
);

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main();
