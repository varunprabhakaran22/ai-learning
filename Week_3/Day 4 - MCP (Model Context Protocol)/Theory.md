# Day 4 — MCP (Model Context Protocol)

---

## ① The Problem MCP Solves — N Apps × M Tools = N×M Integrations

Days 1-3 built tools by hand: a `ToolRegistry`, hardcoded `register()` calls, wired directly into one script's `messages.create` call. That works for one app. The problem shows up at scale:

```
Without a standard:
  Your app A  ──custom code──►  Google Drive tool
  Your app A  ──custom code──►  Slack tool
  Your app B  ──custom code──►  Google Drive tool   (rewritten again!)
  Your app B  ──custom code──►  Slack tool           (rewritten again!)

  Every app that wants Google Drive access reimplements its own
  integration. Every tool provider (Google, Slack, your own backend)
  gets re-integrated by every app that wants to use it. N apps and
  M tools means N×M custom integrations.

With MCP:
  Your app A  ──MCP client──┐
  Your app B  ──MCP client──┼──►  Google Drive MCP server
  Your app C  ──MCP client──┘     (built ONCE, reused everywhere)

  One MCP server exposing Google Drive tools can be plugged into
  ANY app that speaks the MCP client protocol — N apps + M servers
  means N+M integrations, not N×M.
```

**This is the actual reason MCP exists and became the standard** — not because function calling (Day 1) was technically wrong, but because everyone kept re-implementing the same "expose my tools to an LLM" wiring per-app, per-tool. MCP standardizes the wire protocol so that wiring is written once per tool provider and once per app, not once per (app, tool) pair.

---

## ② MCP Is a Protocol, Not a Replacement for Function Calling

This is the single most common misconception, so state it directly: **MCP does not replace what you built in Day 1.** The model still only ever sees `{name, description, input_schema}` and still only ever outputs a `tool_use` block (Day 1 fact ②) — that part of the picture is completely unchanged.

```
What changes:     WHERE the {name, description, input_schema} tuple
                  comes from, and WHO executes the real function.

What stays the
same:             the model's behavior — reason, request a tool by
                  name+input, wait for a result, continue. Exactly
                  Day 1's loop, unmodified.
```

```
Day 1-3 (raw function calling):
  Your code defines tools.get(name) → your code IS the implementation
  registry.execute(name, input) → runs YOUR OWN function directly,
                                    in the same process

Day 4 (MCP):
  Your code asks an MCP SERVER "what tools do you have?"
  registry.execute(name, input) → sends a request OVER MCP to the
                                    server, which runs its OWN
                                    function, possibly in a totally
                                    different process/machine/language
```

MCP is an answer to "where does the tool's real implementation live, and how do I ask it to run," not a new answer to "how does the model decide to use a tool." Day 1's Theory.md fact ① ("the model never executes anything, only requests") is exactly as true under MCP as it was without it.

---

## ③ Server vs Client — Who Provides, Who Consumes

MCP defines two roles, and the naming matches typical client/server intuition, but it's worth being precise about which side does what:

```
MCP SERVER                          MCP CLIENT
───────────                         ───────────
- Owns and exposes tools            - Lives inside your AI app
  (and/or "resources" — data          (e.g. Claude Desktop, or
  the model can read, and              your own custom app)
  "prompts" — reusable templates)   - Discovers what tools/resources
- Implements the REAL logic           a connected server offers
  (e.g. actually reads a file,      - Passes tool definitions to
  actually calls Google Drive's       the model (same shape as
  API)                                Day 1's getDefinitions())
- Advertises its tools over the     - Relays the model's tool_use
  MCP protocol so any client can      requests TO the server, gets
  discover them                       results BACK, feeds them to
                                       the model as tool_result
                                       (same shape as Day 1's loop)
```

**A single server can be reused by many different clients** (①'s whole point) — a filesystem MCP server doesn't know or care if it's talking to Claude Desktop, VS Code, or your own toy script; it just answers "here are my tools" and "here's the result of running this tool" over the same protocol regardless of who's asking.

**Your own code, in the Day 4 showcase task, plays BOTH roles at once**: you build a server (exposing 3 tools) AND you connect a client to it (to actually drive it with the model) — but in production, most of the time you write ONE of these roles and reuse someone else's implementation of the other (e.g. use Anthropic's filesystem server as-is, only write your own client; or write your own server and let Claude Desktop be the client).

---

## ④ What Actually Travels Over the Wire

MCP servers and clients don't have to run in the same process — that's the entire point (①). This means the tool discovery and execution steps from Day 1 become real network/IPC messages instead of plain function calls:

```
Day 1 (in-process):        registry.getDefinitions()  → just reads a Map
                            registry.execute(name, x)  → just calls tool.fn(x)

Day 4 (MCP, out-of-process):
  Client → Server:  "list your tools"  (a JSON-RPC request)
  Server → Client:  [{name, description, input_schema}, ...]
                     (structurally the SAME shape Day 1 sent to the
                     model — MCP standardizes the transport, not the
                     tool definition shape itself)

  Client → Server:  "call tool X with input Y"  (JSON-RPC request)
  Server → Client:  the real result (JSON-RPC response)
```

MCP uses JSON-RPC as its message format, over one of a few transports (stdio for local servers running as a subprocess, HTTP/SSE for remote servers). You don't need to hand-roll JSON-RPC yourself — the MCP SDK handles the wire format; what you write is the same shape of thing as Day 1's `register(name, description, schema, fn)`, just registered against an MCP server object instead of a local Map.

---

## ⑤ Resources and Prompts — MCP's Two Extras Beyond Tools

Day 1-3 only ever dealt with one primitive: tools (things the model can call). MCP defines two more, worth knowing exist even though Day 4's showcase task only needs tools:

```
Tools:      things the model can CALL to take an action or fetch
            data on demand (everything built so far)

Resources:  data a client can read and hand to the model as CONTEXT
            — e.g. "the contents of this specific file" — conceptually
            closer to something you'd paste into a prompt than
            something the model actively requests mid-conversation

Prompts:    reusable prompt TEMPLATES a server can expose, so a
            client can offer "run this canned prompt" without the
            app author having to hardcode the wording themselves
```

Resources and prompts are part of the full MCP spec, but the Day 4 showcase task ("expose 3 tools via MCP protocol") only requires the tools primitive — the one you already understand cold from Days 1-3.

---

## Summary — The Shift From Day 1-3

```
Day 1-3 gave you:  the tool-use loop (request, execute, inject,
                    continue) and tool design discipline — all
                    running in a single process you fully control.

Day 4 adds:        a standard WIRE PROTOCOL so tool definitions and
                    execution can live in a separate server, reusable
                    by any MCP-speaking client instead of rebuilt per
                    app. The model's behavior is UNCHANGED — it still
                    only ever requests {name, input}, same as Day 1.
                    What's new is that "your code" (Day 1 fact ①) can
                    now be a completely separate process talking over
                    MCP, not just a Map in the same file.
```

---

*Next: Lessons.md — Anthropic MCP docs, MCP protocol explainer, MCP GitHub repo, connecting to an existing filesystem/fetch MCP server, and notes from building your own 3-tool MCP server*
