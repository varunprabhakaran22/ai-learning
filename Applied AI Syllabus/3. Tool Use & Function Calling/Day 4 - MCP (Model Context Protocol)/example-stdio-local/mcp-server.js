// Day 4 showcase: an MCP SERVER exposing 3 tools over the MCP protocol.
// Compare to Day 1's registry.register(name, description, schema, fn) —
// same shape of thing, just registered against an MCP Server object
// instead of a local Map, so ANY MCP client (not just this project's own
// script) can discover and call these tools (Theory.md fact 1, 3).
//
// Run standalone with the MCP inspector to poke at it directly:
//   npx @modelcontextprotocol/inspector node "mcp-server.js"

const { McpServer } = require("@modelcontextprotocol/sdk/server/mcp.js");
const { StdioServerTransport } = require("@modelcontextprotocol/sdk/server/stdio.js");
const { z } = require("zod"); // MCP's schema convention — same idea as Week 2's Zod schema

const server = new McpServer({ name: "day4-demo-server", version: "1.0.0" });

// Tool 1 — no external I/O, mirrors Day 1's getCurrentDate for a familiar anchor
server.registerTool(
  "getCurrentDate",
  {
    description: "Get today's date. Use this whenever the user asks what day/date it is.",
    inputSchema: {},
  },
  async () => ({
    content: [{ type: "text", text: new Date().toISOString().split("T")[0] }],
  })
);

// Tool 2 — same lookup-by-name shape as Day 3's getUserId, so a client
// could chain this into a dependent multi-step call same as Day 3 taught
server.registerTool(
  "getUserId",
  {
    description:
      "Look up a user's internal ID from their name. Use this FIRST whenever a " +
      "task needs a specific user's data but you were only given their name.",
    inputSchema: { name: z.string() },
  },
  async ({ name }) => {
    const ids = { "Divya Nair": "user_492", "Rohit Sharma": "user_118" };
    if (!ids[name]) {
      // Day 2 fact 3: fail loud but as readable content, not an uncaught throw
      return { content: [{ type: "text", text: `Error: no user found with name "${name}"` }], isError: true };
    }
    return { content: [{ type: "text", text: ids[name] }] };
  }
);

// Tool 3 — depends on tool 2's output, same dependency pattern as Day 3
server.registerTool(
  "getTransactions",
  {
    description:
      "Get recent transactions for a user, given their internal user ID (not " +
      "their name). Use this only after you already have a userId.",
    inputSchema: { userId: z.string() },
  },
  async ({ userId }) => {
    const transactions = {
      user_492: [{ amount: 50000, type: "credit" }, { amount: 12000, type: "debit" }],
      user_118: [{ amount: 300000, type: "credit" }],
    };
    if (!transactions[userId]) {
      return { content: [{ type: "text", text: `Error: no transactions found for userId "${userId}"` }], isError: true };
    }
    return { content: [{ type: "text", text: JSON.stringify(transactions[userId]) }] };
  }
);

// stdio transport: this server runs as a local subprocess, and the client
// talks to it over stdin/stdout (Theory.md fact 4) — no network involved
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main();
