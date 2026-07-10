# Day 5 — Personal Research Agent (Week 3 Integration Project)

---

## ① ReAct — Naming the Loop You Already Built

Days 1-4 built the tool-use loop without naming it. **ReAct** (Reason + Act) is the name for exactly that pattern: the model alternates between *reasoning* (deciding what to do next, in its own words) and *acting* (calling a tool), observing the result, and repeating until it has enough to answer.

```
Reason  → "I need to find current info on X, I'll search the web"
Act     → calls searchWeb(query)
Observe → gets back a list of URLs + snippets
Reason  → "This page looks most relevant, let me read it fully"
Act     → calls fetchPage(url)
Observe → gets back the page's text
Reason  → "I now have enough to answer"
Act     → writes the final answer (no more tool calls)
```

This is `stop_reason === "tool_use"` looping exactly as built in Day 1 and Day 3 — ReAct isn't a new mechanism, it's the *name* the research/industry world gave to "let the model reason in between tool calls instead of just chaining calls blindly." The only thing that makes a loop "ReAct" rather than a fixed pipeline is that the model decides *at each step* what to do next, based on what it just observed — not a hardcoded sequence of tool calls.

---

## ② Why This Project Composes Everything From Days 1-4

```
Day 1 — the loop itself (request → execute → inject → continue)
Day 2 — tool design discipline (single responsibility, clear descriptions,
         safe failure modes) — now applied to REAL tools hitting REAL APIs
Day 3 — multi-step dependent chains (search → read → read another →
         synthesize) — the research agent's core flow IS a chain
Day 4 — MCP — the tools live behind an MCP server, not a local Map,
         so this agent's tools are reusable by any MCP client, not just
         this one script
```

Nothing new mechanically is introduced here — Day 5 is "build one real, end-to-end thing" using the pieces already in hand.

---

## ③ The Three Tools This Agent Needs

```
searchWeb(query)   → hits a real search API (Brave Search), returns a
                      short list of {title, url, snippet}
fetchPage(url)     → downloads a URL and extracts its readable text
                      (strips HTML), so the model can actually read
                      page content, not just a search snippet
saveReport(...)    → writes the final synthesized answer + citations
                      to a markdown file on disk — the "deliverable"
                      artifact the syllabus asks for
```

`searchWeb` and `fetchPage` mirror Day 3's dependency pattern (`getUserId` → `getTransactions`): you can't read a page you haven't found yet. `saveReport` is a terminal tool — it doesn't feed back into more reasoning, it's the last action taken once the model has already decided it's done researching.

---

## ④ Citing Sources Is a Prompting Concern, Not a Tool Concern

The tools return `{url, text}` — nothing enforces that the model's final answer actually cites them. This is handled the same way Day 2 handled "get the model to behave" — through the **system prompt**, explicitly instructing the model to cite the URL of every fact it uses in its final answer. If citations look wrong or missing, the fix is a clearer instruction, not new tool logic — same lesson as Day 2's "vague vs. precise tool descriptions" experiment, just applied to the system prompt instead of a tool description.

---

## Summary

```
This project is NOT new mechanics — it's Day 1's loop, Day 2's tool
design discipline, Day 3's dependency chains, and Day 4's MCP server,
pointed at REAL external APIs (Brave Search + live URLs) instead of
toy/hardcoded data, with one added expectation: the model must reason
about WHEN it has enough information to stop searching and start
answering — the defining trait of a ReAct agent.
```
