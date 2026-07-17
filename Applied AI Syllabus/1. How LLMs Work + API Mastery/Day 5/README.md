# Smart CLI Assistant — Week 1 Integration Project

A terminal tool that combines everything from Day 1-4 into one working assistant:
stateless API calls, system prompts, auto-selected parameter presets, token counting,
sliding-window history, and per-session cost estimation.

## Architecture

```
                         ┌─────────────────────────┐
                         │   User types a question  │
                         └────────────┬─────────────┘
                                      │
                                      ▼
                         ┌─────────────────────────┐
                         │  classify(question)      │  Day 3
                         │  keyword heuristic —      │
                         │  no extra API call        │
                         └────────────┬─────────────┘
                                      │
                         picks one of: factual / creative /
                         structured / conversational
                                      │
                                      ▼
                         ┌─────────────────────────┐
                         │  fitToBudget(history)     │  Day 4
                         │  count tokens locally →   │
                         │  sliding window trim if   │
                         │  over budget              │
                         └────────────┬─────────────┘
                                      │
                                      ▼
                         ┌─────────────────────────┐
                         │  client.messages.create() │  Day 1 + 2
                         │  system prompt (fixed) +  │
                         │  trimmed history +        │
                         │  preset's temperature/    │
                         │  top_p                    │
                         └────────────┬─────────────┘
                                      │
                                      ▼
                         ┌─────────────────────────┐
                         │  reply appended to        │
                         │  history (the "memory"    │  Day 1
                         │  you manage yourself)      │
                         └────────────┬─────────────┘
                                      │
                                      ▼
                         ┌─────────────────────────┐
                         │  session token/cost        │  Day 4
                         │  totals updated             │
                         └────────────┬─────────────┘
                                      │
                                      ▼
                              back to prompt loop
                        (until user types "exit")
```

## Design decisions

- **Classification is a keyword heuristic, not a model call.** An LLM call to classify
  the question would double latency and cost per turn. Simple regex-based rules are
  instant, free, and good enough for routing to one of 4 presets (see Theory Day 3).
- **Presets carry a `reason` field.** Not just tuned numbers — each preset states *why*
  that temperature/top_p combination fits the use case, per the syllabus requirement.
- **Token counting runs locally before every call**, using the same tokenizer the API
  uses, so exact counts are known before sending instead of estimated (Day 4) — this is what makes sliding-window trimming possible without
  guessing.
- **Cost is an estimate, not a bill.** `PRICE_PER_MTOK` is hardcoded from a
  point-in-time check — real pricing should be looked up before trusting this number
  (see Day 4 Lessons Part B).

## Known gaps (not built this Day)

- No rate-limit handling (no retry/backoff on 429s) — flagged as a real gap during
  Day 4, still not implemented.
- No summarization fallback — sliding window only. Summarization (compressing dropped
  history into a short summary instead of discarding it) is a later-week topic (see Day 4 Theory).

## Run it

```
export ANTHROPIC_API_KEY=your-key-here
node example.js
```
