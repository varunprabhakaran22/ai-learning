# Day 5 Recap — Week 1 Full Recap (Days 1-4)

*(Day 5 itself is integration, not new theory — so this recap rolls up everything
from Day 1,2,3 + Day 4 into one week-level summary, per user/engineer contrast.)*

## Memory / Statelessness
- **User thinks:** "It remembers our conversation."
- **Engineer thinks:** No memory between calls. "Memory" = resending the entire history yourself, every call.

## Facts / Hallucination
- **User thinks:** "It knows things and looks them up."
- **Engineer thinks:** It reconstructs answers from compressed weights. Real facts and made-up ones come out equally confident — fluency isn't a truth signal.

## Output / Determinism
- **User thinks:** "Same question → same answer."
- **Engineer thinks:** Every token is a weighted dice roll. Reliability must be designed in (temperature=0 for facts/code).

## Context Window
- **User thinks:** "It just knows what we've discussed."
- **Engineer thinks:** Weights = permanent training knowledge. Context window = temporary working memory you fill and manage. Hard limit — overflow errors unless you trim/summarize.
- Even content that fits isn't read equally well — **lost in the middle**: stuff buried mid-context is used less reliably than content at the start/end. Put critical instructions in the system prompt or right before the question.

## System Prompts
- **User thinks:** "It's a rule the model must follow."
- **Engineer thinks:** Just text in the same token stream, prioritized only because training taught the model to weight that slot more. A strong bias, not a hard boundary — critical constraints ("JSON only") still need code-level parsing/validation, not just a stronger prompt.

## Temperature vs Top-P
- **User thinks:** "Creativity sliders."
- **Engineer thinks:** Both reshape the same fixed probability distribution — never introduce an option the model hadn't already considered. Temperature reshapes all odds; top-p cuts the list to top options. Tune one, leave the other at default.

## Why Tokens Split the Way They Do
- **User thinks:** "A token ≈ a word."
- **Engineer thinks:** Tokens come from a fixed vocabulary built once via BPE — common chunks merge into single tokens, rare words fall back to smaller pieces. Can't estimate token count by eyeballing text.

## Tokens = Money + Latency
- **User thinks:** "Tokens just fill the context window."
- **Engineer thinks:** Every token is billed, and input/output are priced differently — output costs more because it's generated sequentially (re-attends to everything before it each step), while input is read in one parallel pass. A verbose system prompt causing long replies can cost more than a big static history.

## Counting Tokens Before Sending
- **User thinks:** "I'll find out if I'm over budget when the call fails."
- **Engineer thinks:** The tokenizer is deterministic and known — count locally before sending (no network round-trip) so you can trim proactively instead of discovering overflow from a failed call.

## Sliding Window (Trimming Strategy)
- **User thinks:** "Just cut off old messages somehow."
- **Engineer thinks:** Walk history newest → oldest, keep what fits the remaining budget, drop the rest, log what was dropped. Newest-first because recent context is almost always more relevant.

## Summarization (Not Built Yet)
- **User thinks:** "Dropping old messages is the only option."
- **Engineer thinks:** Summarization replaces dropped messages with a short generated gist instead of losing them — costs an extra call, loses detail, keeps more continuity than a hard drop. Later-week topic (RAG lands Week 4) — not implemented yet.

## Day 5 — How It All Wires Together
- `classify()` picks a preset via keyword heuristic — no extra model call, instant and free.
- `fitToBudget()` counts tokens locally and slides the window before every call.
- The trimmed history + system prompt + preset's temperature/top_p go into one `messages.create()` call.
- The reply is appended back into history — that's the "memory" you're manually engineering (Day 1,2,3 fact ①, made concrete).
- Session token/cost totals accumulate across turns using Day 4's pricing asymmetry (② ).
- Known gap: no rate-limit retry/backoff on 429s — flagged, not built.

## The Overall Shift (Week 1)
```
User:      "I'm chatting with an intelligent being."
Engineer:  "I'm calling a stateless probabilistic function.
            I control the input. I must engineer the reliability.
            I must count/budget tokens before sending, not after failing.
            The model is powerful but unreliable — treat it like a component."
```

## Still need to cover / do
- Run example.js for real, try questions that hit each of the 4 presets, confirm `classify()` routes them as expected
- Add rate-limit handling (retry + backoff on 429) — flagged as a gap, not built
- Run the chunking experiment (Day 4 Lessons Part C) — find where quality actually degrades on a real 10k-word doc
- Push to GitHub `ai-engineer-toolkit` repo per syllabus
- Week 2 Day 1: Prompt Structure & Chain of Thought
