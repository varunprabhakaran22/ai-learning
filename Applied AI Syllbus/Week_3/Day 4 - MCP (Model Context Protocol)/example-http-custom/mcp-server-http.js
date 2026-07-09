// Same 3 tools as mcp-server.js, but reachable over real HTTP instead of
// stdio — this is what "deploy my MCP server so anyone can reach it"
// actually looks like (compare to mcp-client-github.js, which is the
// CLIENT side of exactly this same idea, pointed at GitHub's server
// instead of this one).
//
// Key difference from mcp-server.js:
//   stdio version -> client SPAWNS this file as a subprocess, talks
//                    over stdin/stdout, only works on the same machine
//   http version  -> this file runs as its own long-lived process,
//                    listens on a port, ANY client with the URL + a
//                    valid token can reach it over the network
//
// The MCP SDK does NOT include its own HTTP server (unlike
// StdioServerTransport, which is self-contained) — you bring your own
// web framework (Express here) and hand it the transport to drive.
//
// Run:
//   npm install @modelcontextprotocol/sdk express zod
//   export MCP_TOKEN="some-shared-secret"
//   node mcp-server-http.js
//   (then point mcp-client-http.js, or any MCP HTTP client, at
//    http://localhost:3000/mcp with that same token)

const express = require("express");
const { randomUUID } = require("node:crypto");
const { z } = require("zod");
const { McpServer } = require("@modelcontextprotocol/sdk/server/mcp.js");
const { StreamableHTTPServerTransport } = require("@modelcontextprotocol/sdk/server/streamableHttp.js");
const { isInitializeRequest } = require("@modelcontextprotocol/sdk/types.js");

const REQUIRED_TOKEN = process.env.MCP_TOKEN || "dev-secret";

// same 3 tools as mcp-server.js — MCP doesn't care whether the transport
// underneath is stdio or HTTP, the registration code is unchanged
function buildServer() {
  const server = new McpServer({ name: "day4-http-demo-server", version: "1.0.0" });

  server.registerTool(
    "getCurrentDate",
    { description: "Get today's date.", inputSchema: {} },
    async () => ({ content: [{ type: "text", text: new Date().toISOString().split("T")[0] }] })
  );

  server.registerTool(
    "getUserId",
    {
      description: "Look up a user's internal ID from their name.",
      inputSchema: { name: z.string() },
    },
    async ({ name }) => {
      const ids = { "Divya Nair": "user_492", "Rohit Sharma": "user_118" };
      if (!ids[name]) {
        return { content: [{ type: "text", text: `Error: no user found with name "${name}"` }], isError: true };
      }
      return { content: [{ type: "text", text: ids[name] }] };
    }
  );

  server.registerTool(
    "getTransactions",
    {
      description: "Get recent transactions for a user, given their internal user ID.",
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

  return server;
}

const app = express();
app.use(express.json());

// THE auth check — this is the piece the SDK does NOT provide for you.
// Every request must prove it's allowed in before it ever reaches MCP
// logic. In a real system this would look up a token in a database and
// resolve it to a specific user identity (see mcp-server-http.js's
// sibling doc, HLD notes) — here it's a single shared secret for the demo.
app.use((req, res, next) => {
  if (req.headers.authorization !== `Bearer ${REQUIRED_TOKEN}`) {
    return res.status(401).json({ error: "unauthorized" });
  }
  next();
});

// one MCP "session" = one live conversation between a specific client
// and this server. HTTP has no memory between requests by itself, so
// the transport hands out a session ID (mcp-session-id header) and we
// keep the matching transport object alive here to route follow-up
// requests to the right place.
const transports = {};

app.post("/mcp", async (req, res) => {
  const sessionId = req.headers["mcp-session-id"];
  let transport = sessionId ? transports[sessionId] : undefined;

  if (!transport && !sessionId && isInitializeRequest(req.body)) {
    // first message from a new client — set up a fresh session
    transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: () => randomUUID(),
      onsessioninitialized: (sid) => { transports[sid] = transport; },
    });
    transport.onclose = () => {
      if (transport.sessionId) delete transports[transport.sessionId];
    };
    await buildServer().connect(transport);
  } else if (!transport) {
    return res.status(400).json({ jsonrpc: "2.0", error: { code: -32000, message: "No valid session ID" }, id: null });
  }

  await transport.handleRequest(req, res, req.body);
});

// GET opens the server->client streaming channel for an existing session
app.get("/mcp", async (req, res) => {
  const transport = transports[req.headers["mcp-session-id"]];
  if (!transport) return res.status(400).send("Invalid or missing session ID");
  await transport.handleRequest(req, res);
});

// DELETE lets a client explicitly end its session
app.delete("/mcp", async (req, res) => {
  const transport = transports[req.headers["mcp-session-id"]];
  if (!transport) return res.status(400).send("Invalid or missing session ID");
  await transport.handleRequest(req, res);
});

app.listen(3000, () => console.log("MCP server listening on http://localhost:3000/mcp"));
