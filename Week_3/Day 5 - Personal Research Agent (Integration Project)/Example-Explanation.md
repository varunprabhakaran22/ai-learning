# Day 5 — Example Walkthrough (mcp-server.js + mcp-client.js)

## Flow diagram

```
 You:  node mcp-client.js "your research question"
              │
              ▼
     process.argv[2] → question
              │
              ▼
  ┌─────────────────────────────┐
  │ mcp-client.js spawns          │
  │ mcp-server.js as a subprocess │  (StdioClientTransport)
  └───────────────┬───────────────┘
                  ▼
       mcpClient.listTools()
                  │
                  ▼
     server replies: [searchWeb, fetchPage, saveReport]
                  │
                  ▼
  ┌─────────────────────────────┐
  │ question + SYSTEM_PROMPT +   │
  │ tool list  →  sent to Claude │
  └───────────────┬───────────────┘
                  ▼
            ┌───────────┐
            │   Claude   │  Reason: "I need to search first"
            └─────┬─────┘
                  ▼  tool_use: searchWeb({query})
  ┌─────────────────────────────┐
  │ client relays over MCP  →     │
  │ server calls Brave API   →    │
  │ returns [{title,url,snippet}] │
  └───────────────┬───────────────┘
                  ▼
     result injected as tool_result → sent back to Claude
                  │
                  ▼
            ┌───────────┐
            │   Claude   │  Reason: "this URL looks most relevant"
            └─────┬─────┘
                  ▼  tool_use: fetchPage({url})   ← URL FROM STEP ABOVE
  ┌─────────────────────────────┐
  │ client relays over MCP  →     │
  │ server fetch()'s that URL →   │
  │ returns stripped page text    │
  └───────────────┬───────────────┘
                  ▼
     result injected as tool_result → sent back to Claude
                  │
        (loop repeats: Claude may fetchPage AGAIN on a
         different URL, if it decides it needs more sources)
                  │
                  ▼
            ┌───────────┐
            │   Claude   │  Reason: "I have enough, time to answer"
            └─────┬─────┘
                  ▼  writes final answer WITH inline citations
                  ▼  tool_use: saveReport({filename, markdown})
  ┌─────────────────────────────┐
  │ server writes reports/*.md    │
  └───────────────┬───────────────┘
                  ▼
     stop_reason: end_turn → loop exits
                  │
                  ▼
     console.log final answer to your terminal
```

## Why searchWeb needs an API key and fetchPage doesn't

`searchWeb` calls Brave's own private search API (`api.search.brave.com`) — a paid/metered service, so it requires `X-Subscription-Token` to identify and rate-limit the caller. `fetchPage` just does a plain `fetch(url)` on whatever public URL the model picked from the search results — the same as opening that page in a browser. There's no company "gatekeeping" a public webpage the way Brave gatekeeps its search index, so no key is needed there.

## How searchWeb's output becomes fetchPage's input

Nothing in the code wires these two tools together — the **model** does that wiring, at runtime:
1. `searchWeb` returns `[{title, url, snippet}, ...]` as its tool result.
2. That result lands back in `messages` (Day 1's loop: push `tool_result`, call the model again).
3. The model reads the URLs, reasons about which one looks most relevant, and itself decides to emit a new `tool_use` block calling `fetchPage({ url: <the one it picked> })`.

This is the same "step 2 depends on step 1's output, decided by the model" pattern as Day 3/4's `getUserId` → `getTransactions`, just with real search results instead of a hardcoded lookup.

## What's actually different from Day 4's example

The mechanical skeleton (spawn subprocess, `listTools()`, the `while (stop_reason === "tool_use")` loop, `callTool()`) is identical to Day 4. Two real differences:
1. **The tools serve a different purpose** — real APIs (Brave search, live URL fetch, file write) instead of a hardcoded lookup table.
2. **The client has a `SYSTEM_PROMPT`** — Day 4's tools were simple enough to need no behavioral steering. Here, the model needs explicit rules (read pages before citing them, cite every source, only call `saveReport` once research is complete) because "just call tools until done" isn't precise enough for an open-ended research task.
