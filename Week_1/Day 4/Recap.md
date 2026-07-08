# Day 4 Recap — Token Economics & Context Management

## Why Tokens Split the Way They Do
- **User thinks:** "A token is roughly a word."
- **Engineer thinks:** "Tokens come from a fixed vocabulary built once via BPE — common words/pieces get merged into single tokens, rare words fall back to smaller pieces. This is why I can't estimate token count by eyeballing text."

## Tokens = Money + Latency
- **User thinks:** "Tokens just fill up the context window."
- **Engineer thinks:** "Every token is billed, and input/output are priced differently — output costs more per token because it's generated one at a time (sequential, must re-attend to everything before it) while input is read in one parallel pass. A verbose system prompt that causes long replies can cost more than a big static history."
- **Interview gotcha — `max_tokens` is a latency lever, not just a cost lever:** it's a cap, not a target. Because generation is autoregressive (one token at a time, sequentially), a higher cap means if the model rambles, you pay real wall-clock time for every extra token — this can directly blow an SLA (e.g. a 3s response budget), independent of cost. "Bump max_tokens up to be safe" is wrong reasoning: size it to the *expected* output shape (schema/format constraints, or a lower cap + retry), don't pad it.

## Sliding Window + Tool Calls (Gotcha)
- **User thinks:** "Drop the oldest messages first, simple."
- **Engineer thinks:** "Naive oldest-first trimming can orphan a `tool_use`/`tool_result` pair — dropping the assistant's tool call but keeping its result (or vice versa). Anthropic/OpenAI APIs require these to stay adjacent; an orphaned pair gets the whole request rejected as malformed. Trimming must be tool-call-aware: always drop or keep a `tool_use`+`tool_result` as one atomic unit, never split it mid-pair."

## Counting Tokens Before Sending
- **User thinks:** "I'll find out if I'm over budget when the API call fails."
- **Engineer thinks:** "The tokenizer is deterministic and known, so I can count locally before sending — no network round-trip needed. This lets me trim proactively instead of discovering the overflow from a failed call."
- **Interview gotcha — two different failures get conflated:** (1) **context-window overflow** = input tokens + requested max_tokens > the model's total window → a **400 Bad Request**, a structural per-request error, nothing to do with usage over time. (2) **rate limit / quota exhaustion** ("token limit exhausted" messages, tokens-per-minute caps, plan usage caps) → a **429 Too Many Requests**, an account/org-level cumulative-usage error, unrelated to any single prompt's size. Different causes need different fixes: overflow needs pre-emptive local token counting + trimming; 429s need backoff/retry, request queuing, or model tiering (Week 7's `ResilienceLayer`/`CostOptimizer`).

## Sliding Window (Trimming Strategy)
- **User thinks:** "Just cut off old messages somehow when it gets full."
- **Engineer thinks:** "Walk history newest → oldest, keep what fits the remaining budget, drop the rest, and log what was dropped. Newest-first because recent context is almost always more relevant than old context."

## Summarization (Not Built Yet)
- **User thinks:** "Dropping old messages is the only option."
- **Engineer thinks:** "Summarization replaces dropped messages with a short model-generated gist instead of losing them outright — costs an extra API call, loses fine detail, but keeps more continuity than a hard drop. Later-week topic (syllabus covers retrieval/RAG in Week 4 instead) — not implemented now, just know it exists as the next step up."

## Lost in the Middle
- **User thinks:** "If it fits in the context window, the model will use all of it equally well."
- **Engineer thinks:** "Fitting isn't the same as being read well — content in the middle of a long context is used less reliably than content at the start or end. Critical instructions/facts belong in the system prompt or right before the question, not buried in a big pasted block."

## The Overall Shift
```
Day 1,2,3 gave me:  the token bucket exists, here's the math when it's full.
Day 4 adds:         WHY tokens split that way, WHY output costs more than
                     input, HOW to count before sending, a concrete trimming
                     algorithm, and a reminder that fitting != being read well.
```

## Still need to cover / do
- Run the chunking experiment (Lessons.md Part C) — find where quality actually degrades on a real 10k-word doc
- Fill in Lessons.md Part A/B after reading actual tokenizer docs + current pricing pages
- Implement summarization for real — later, once RAG/retrieval concepts land (Week 4)
- `ContextManager` showcase task (syllabus Day 4): wrap fitToBudget from example.js into a reusable utility for the toolkit repo
