# Day 4 — Example Walkthrough

Three example pairs, each in its own folder, organized by transport:
- `example-stdio-local/` — Part 1 & 2 below (`mcp-server.js` + `mcp-client.js`)
- `example-http-custom/` — Part 4 below (`mcp-server-http.js` + `mcp-client-http.js`)
- `example-http-github/` — Part 3 below (`mcp-client-github.js` — no server file, since it connects to GitHub's already-running one)

Run each pair's commands from inside that pair's own folder.

## Part 1 — `mcp-server.js`: exposing tools over MCP

**Imports**
- `McpServer` — the SDK class that turns plain functions into something speakable over the MCP protocol. It's the box that holds tools and knows how to answer "what tools do you have?" and "run tool X."
- `StdioServerTransport` — the wire the server talks over. `stdio` = standard input/output, the same pipes any CLI program uses. No HTTP, no ports — a parent process spawns this file and pipes bytes back and forth.
- `zod` — schema library used to describe each tool's expected input shape (e.g. `{ name: z.string() }` = "takes an object with a string field called `name`"). Same job as Week 2's Zod schema.

**`new McpServer(...)`**
Creates the empty server object. `name`/`version` are just metadata a client could display — not functional.

**`server.registerTool("getCurrentDate", ...)`**
Direct MCP equivalent of Day 1's `registry.register(name, description, schema, fn)`. Three parts:
- `"getCurrentDate"` — the identifier the model will emit in a `tool_use` block.
- config object — `description` tells the model *when* to call this; `inputSchema: {}` means no arguments.
- the async function — the real logic. Return shape `{ content: [{ type: "text", text: ... }] }` isn't a style choice — it's the MCP spec's required response shape (an array of typed content blocks).

**`getUserId`**
Same registration shape, `inputSchema: { name: z.string() }`. Body is a hardcoded lookup table standing in for a DB query. Error case returns a normal result with `isError: true` instead of throwing — so the model can read *why* it failed and react, instead of the process crashing with no context reaching the model.

**`getTransactions`**
Same pattern, takes `userId` (not `name`) — second half of a two-step chain. Must call `getUserId` first to get an ID, then feed that ID in here. Same "step 2 depends on step 1's output" shape as Day 3, just split across two registered tools on a server instead of two local functions.

**`main()` / stdio connection**
```js
const transport = new StdioServerTransport();
await server.connect(transport);
```
This is what actually turns the server "on." Registering tools only sets them up in memory — nothing listens until `connect` runs. After this, the process sits idle, reading MCP-formatted JSON from stdin and writing replies to stdout.

**How it's exposed, concretely:** running `node mcp-server.js` starts a process that does nothing visible — it waits, reading MCP messages from stdin and writing replies to stdout. Its entire exposed surface is two capabilities: "list your tools" and "call this tool with this input."

---

## Part 2 — `mcp-client.js`: consuming it

**Spawning + connecting**
```js
const transport = new StdioClientTransport({ command: "node", args: ["mcp-server.js"] });
const mcpClient = new Client({ name: "day4-demo-client", version: "1.0.0" });
await mcpClient.connect(transport);
```
`StdioClientTransport` spawns `node mcp-server.js` as a child process and hooks its stdin/stdout up as the channel. `mcpClient.connect(transport)` performs the MCP handshake — after this, client and server subprocess can exchange messages.

**Discovery**
```js
const { tools: mcpTools } = await mcpClient.listTools();
const claudeTools = mcpTools.map((t) => ({
  name: t.name,
  description: t.description,
  input_schema: t.inputSchema,
}));
```
`listTools()` sends "what tools do you have?" over stdio; the server replies with the 3 registered tools. The client never hardcodes what tools exist — it asks. `.map(...)` just renames MCP's `inputSchema` field to the Claude API's `input_schema` — same data, different key name across the two specs.

**First model call**
Identical to Day 1/Day 3 — send the user's message plus `claudeTools` (now sourced from the server) to the model.

**The loop — one line swapped out**
Same shape as Day 1's `runWithTools`. The only conceptual change:
```js
const mcpResult = await mcpClient.callTool({ name: block.name, arguments: block.input });
```
In Day 1, "execute" meant calling a JS function directly in the same process. Here it means sending a message over stdio to the *other process*: "run `getUserId` with `{name: "Divya Nair"}`" and waiting for the reply. The server does the real lookup and sends back `{ content: [{ type: "text", text: "user_492" }] }`; the next line just extracts the text. From the model's point of view, nothing is different — it still just sees a `tool_result` come back.

---

## End-to-end trace

Query: **"What are Divya Nair's recent transactions?"**

1. Client asks server for its tool list, forwards those + the question to Claude.
2. Claude has no `userId` yet, so it requests `getUserId({name: "Divya Nair"})`.
3. Client relays that call over stdio to the server subprocess → server looks up `"Divya Nair"` → returns `"user_492"`.
4. Client feeds `"user_492"` back to Claude as a tool result.
5. Claude now requests `getTransactions({userId: "user_492"})`.
6. Client relays that too → server returns the transaction list as JSON text.
7. Client feeds that back to Claude, which now has everything it needs and replies with plain text (`stop_reason: end_turn`), loop exits, `console.log` prints the answer.

**Core takeaway:** MCP didn't change *how* tool-calling works (still Day 1's request → execute → inject → continue loop, unchanged). It changed *where* "execute" happens — from "a function in the same file" to "a separate process/server reached over a transport" — and standardized the shape of "list tools" / "call tool" so any client can talk to any MCP server without custom glue code per provider.

---

## Part 3 — `mcp-client-github.js`: connecting to a REAL remote MCP server

`mcp-client.js` connects to a server you wrote yourself, running as a local subprocess. `mcp-client-github.js` connects to GitHub's actual hosted MCP server — code you didn't write, running on GitHub's infrastructure, reached over the internet. This is what "consuming an MCP server in the real world" looks like.

**What's different:**
```js
const transport = new StreamableHTTPClientTransport(
  new URL("https://api.githubcopilot.com/mcp/"),
  { requestInit: { headers: { Authorization: `Bearer ${process.env.GITHUB_PAT}` } } }
);
```
- `StreamableHTTPClientTransport` instead of `StdioClientTransport` — no subprocess is spawned; this opens an HTTP connection to GitHub's server directly.
- `requestInit.headers` carries a normal `Authorization: Bearer <token>` header — the same PAT-based auth you'd use for GitHub's REST API. Public/remote MCP servers need auth precisely because, unlike your local `mcp-server.js`, anyone on the internet could otherwise reach them and act as you.

**What's identical to `mcp-client.js`:** everything after `connect()` — `listTools()`, building `claudeTools`, the `while (response.stop_reason === "tool_use")` loop, `callTool()`. Not one line of the tool-use loop changed. This is the concrete proof of Theory.md fact ④: MCP standardizes the transport, not the tool definition shape or the model's behavior — swapping stdio for HTTP, and a toy server for GitHub's real one, required changing exactly the connection setup and nothing else.

**Running it** (see the comment block at the top of the file for full setup):
1. `npm install @modelcontextprotocol/sdk @anthropic-ai/sdk`
2. Create a GitHub PAT (Settings → Developer settings → Personal access tokens) with `repo` + `read:org` scopes, `export GITHUB_PAT="ghp_..."`
3. `export ANTHROPIC_API_KEY="sk-..."`
4. `node mcp-client-github.js`

The example query ("who owns anthropics/claude-code and how many open issues does it have") forces Claude to call real GitHub tools (repo lookup + issue search) against GitHub's live API — not a hardcoded lookup table like `mcp-server.js`'s `getUserId`.

**Gotcha worth knowing:** if you don't want to deal with a PAT or OAuth at all, GitHub also ships `github-mcp-server` as a Docker image that runs locally over stdio:
```bash
docker run -i --rm -e GITHUB_PERSONAL_ACCESS_TOKEN=<pat> ghcr.io/github/github-mcp-server
```
That's a middle ground — real GitHub tools, but reached the same way as `mcp-client.js` (`StdioClientTransport`, spawn a local process) instead of over HTTP.

---

## Part 4 — `mcp-server-http.js` + `mcp-client-http.js`: hosting YOUR OWN server over HTTP

`mcp-client-github.js` showed the *consuming* side of a real remote server (GitHub's). This pair shows the *hosting* side — turning `mcp-server.js` (stdio, only reachable by a subprocess on the same machine) into something anyone with a URL and a token can reach, same shape as GitHub's setup but running your own code.

**Why this needs more than swapping one line:** `StdioServerTransport` is self-contained — the SDK owns stdin/stdout, nothing else is required. `StreamableHTTPServerTransport` is not self-contained — the SDK does **not** ship its own web server. You bring your own (Express here) and hand it the transport to drive per-request. This mirrors any other Node HTTP service you'd deploy — MCP doesn't change that part.

**The auth check is entirely your responsibility:**
```js
app.use((req, res, next) => {
  if (req.headers.authorization !== `Bearer ${REQUIRED_TOKEN}`) {
    return res.status(401).json({ error: "unauthorized" });
  }
  next();
});
```
This runs *before* any MCP logic — the SDK has no opinion about who's allowed to connect; it only cares about MCP messages once a request is already let through. In production this middleware would look up the token in a database and resolve it to a specific user identity (not just accept/reject a single shared secret), so tool handlers can scope data per-caller — this is the authorization piece from the HLD discussion, not just authentication.

**Sessions exist because HTTP has no memory between requests.** stdio has an implicit session — the subprocess *is* the session, it lives as long as the connection is open. Over HTTP, each request is independent, so the transport hands out a `mcp-session-id` on the first `initialize` request, and the server keeps a `transports` map keyed by that ID to route each follow-up request (`POST` = send a message, `GET` = open the server's streaming reply channel, `DELETE` = end the session) back to the right in-memory transport object.

**`mcp-client-http.js` is nearly identical to `mcp-client-github.js`** — same `StreamableHTTPClientTransport`, same `requestInit.headers` auth pattern — just pointed at `http://localhost:3000/mcp` with your own shared-secret token instead of a GitHub PAT. That similarity is the point: once a server is exposed over HTTP with token auth, *any* MCP client (this one, GitHub's own tooling, Claude Desktop configured with your URL) consumes it the exact same way.

**To run this pair end to end:**
```bash
npm install @modelcontextprotocol/sdk express zod @anthropic-ai/sdk
export MCP_TOKEN="some-shared-secret"
node mcp-server-http.js          # terminal 1 — leave running
export ANTHROPIC_API_KEY="sk-..."
node mcp-client-http.js          # terminal 2
```
