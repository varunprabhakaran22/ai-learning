# Day 5 Recap — Personal Research Agent (Week 3 Integration Project)

## Key facts
- ReAct = the name for the loop already built in Days 1-3: model **Reasons** (decides what to do), **Acts** (calls a tool), **Observes** (gets the result), repeats until it decides it has enough — not a new mechanism, just the name for "the model decides at each step, not a fixed pipeline."
- This project is pure composition of Days 1-4, pointed at real APIs instead of toy data: Day 1's loop, Day 2's tool design discipline, Day 3's dependency chains (search → read depends on having a URL first), Day 4's MCP server as the place tools live.
- 3 tools, in dependency order: `searchWeb` (Brave API, returns candidate URLs) → `fetchPage` (reads one in full) → `saveReport` (terminal tool, writes the final markdown once research is done — doesn't feed back into more reasoning).
- Citations aren't enforced by the tools — `fetchPage` just returns text. Getting the model to actually cite URLs is a system-prompt instruction, same lesson as Day 2's "vague vs precise description" experiment applied to prompting instead of tool descriptions.
- `saveReport` writes to a `reports/` folder next to the server file — kept as a plain file write, no DB, since the whole deliverable is "a markdown report on disk."

## Still need to cover / do
- Get a free Brave Search API key (brave.com/search/api), `export BRAVE_API_KEY`.
- `npm install @modelcontextprotocol/sdk zod @anthropic-ai/sdk` in this folder.
- Run `node mcp-client.js "some real research question"` end to end, confirm: search runs, at least one page gets fetched, final answer has inline citations, `reports/*.md` file gets created.
- Try a multi-source question (something needing 2+ pages read) to confirm the model actually chains multiple fetchPage calls before answering, not just one.
- Note any cases where the model tries to answer without reading a page first (citation quality problem) — if it happens, tighten the system prompt, don't add tool logic.
- Week 3 complete after this — next: Week 4, Day 1 (Embeddings & Vector Search).
