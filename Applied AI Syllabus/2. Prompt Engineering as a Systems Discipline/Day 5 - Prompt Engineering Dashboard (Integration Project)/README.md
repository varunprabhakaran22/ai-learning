# Prompt Engineering Dashboard — Week 2 Integration Project

A small web UI that combines everything from Day 1-4: compose a structured prompt,
pick a model (standard or reasoning), see the validated output alongside token count,
latency, cost estimate, and parse success/fail — with prompt versions kept in a sidebar.

This is a **design doc, not a built app** — see [Still need to cover / do](#still-need-to-cover--do).

## Architecture

```
                     ┌───────────────────────────┐
                     │   Sidebar: prompt versions │   Day 3
                     │   v1 / v2 / v3 (per name)  │
                     └────────────┬───────────────┘
                                  │ select a version to edit/run
                                  ▼
                     ┌───────────────────────────┐
                     │  PromptBuilder inputs       │   Day 1
                     │  context / examples /       │
                     │  chain-of-thought /          │
                     │  output format               │
                     └────────────┬───────────────┘
                                  │ .build(userInput)
                                  ▼
                     ┌───────────────────────────┐
                     │  Model selector              │   Day 4
                     │  (user picks, OR              │
                     │   ModelRouter auto-classifies)│
                     └────────────┬───────────────┘
                                  │
                                  ▼
                     ┌───────────────────────────┐
                     │  Send to backend             │
                     │  countTokens() BEFORE send   │   Wk1 D4
                     │  client.messages.create()    │
                     └────────────┬───────────────┘
                                  │
                                  ▼
                     ┌───────────────────────────┐
                     │  StructuredOutputParser      │   Day 2
                     │  validate against schema,    │
                     │  retry w/ error feedback      │
                     │  (up to 3x)                   │
                     └────────────┬───────────────┘
                                  │
                                  ▼
                     ┌───────────────────────────┐
                     │  Results panel                │
                     │  - validated output (or        │
                     │    parse failure + raw text)   │
                     │  - token count (in/out)         │
                     │  - latency (ms)                 │
                     │  - cost estimate ($)            │
                     │  - which model/preset was used  │
                     │  - PASS/FAIL vs saved test cases │  Day 3
                     └────────────┬───────────────┘
                                  │
                                  ▼
                     ┌───────────────────────────┐
                     │  Save as new prompt version   │   Day 3
                     │  (adds to sidebar, doesn't      │
                     │   overwrite the one just run)   │
                     └───────────────────────────┘
```

## How each day's piece slots in

- **Day 1 (`PromptBuilder`):** the input form on the dashboard IS the builder's pieces
  exposed as UI fields — context, examples, CoT toggle, output format. "Build" concatenates
  them into the final prompt string sent to the model.
- **Day 2 (`StructuredOutputParser`):** every dashboard run validates its response against
  a schema before showing it as "success." A failed validation shows the raw text plus the
  specific error, and the retry loop runs automatically up to 3 attempts before surfacing
  a hard failure to the user.
- **Day 3 (`PromptTestRunner`):** the sidebar's versions aren't just saved strings — each
  version's last comparison-table result (pass/fail per saved test case) is shown next to
  its name, so you can see at a glance which version currently passes the most cases.
- **Day 4 (`ModelRouter`):** the model selector defaults to "auto" — running `classifyTask()`
  on the composed prompt and picking standard vs reasoning model, with the classification
  and reasoning shown in the results panel (not hidden) so the auto-routing decision is
  always visible, not a black box.

## Design decisions

- **Token count and cost estimate happen before AND after the call** — before, to show
  the user what the request will cost (Week 1 Day 4 — Token Economics & Context Management's "count before sending, don't wait
  for a failure"); after, to show the actual cost including output tokens, which can't be
  known until generation finishes.
- **The results panel always shows which preset/model/temperature was used**, even when
  auto-routing picked it — an invisible auto-decision is exactly the failure mode Day 4's
  warning against silent routing warns about: a router that classifies and picks a model
  without logging *why* leaves you unable to audit whether it's making good decisions,
  just surfaced in UI instead of a log line.
- **Saving a new version never overwrites an old one** (Day 3's versioning rule: keep old
  prompt versions alongside new ones, like `summarize_v1.json`/`v2.json`/`v3.json`, so you
  can compare and roll back instead of losing history) — the sidebar is
  append-only; only versions, never edits-in-place.

## Known gaps (not built this Day)

- No actual server/frontend code — this Day is documented as an architecture exercise,
  matching the syllabus's Week 9 Day 1 pattern of "map existing projects to a production
  architecture" rather than shipping new code every single day.
- No real LLM-as-judge scoring in the results panel — that's Week 8's `EvalFramework`, not
  in scope yet.
- No persistence — a real build would need the sidebar's versions and their test results
  saved somewhere between sessions (file-based JSON to start, matching Day 3's
  `prompts/summarize_v1.json` convention).

## Still need to cover / do

- Decide whether to actually build this as a runnable app later, or leave it as a
  documented synthesis of Week 2 (syllabus explicitly calls for "a small web UI... deploy
  it, screenshot it" — currently unmet if left as docs-only)
- If built: reuse `example.js` from Days 1-4 almost as-is as backend logic, wire a thin
  HTML/JS frontend on top
- Push toolkit pieces (`PromptBuilder`, `StructuredOutputParser`, `PromptTestRunner`,
  `ModelRouter`) to the `ai-engineer-toolkit` GitHub repo per the syllabus's running-portfolio rule
- Tool Use & Function Calling Day 1 — Function Calling Fundamentals
