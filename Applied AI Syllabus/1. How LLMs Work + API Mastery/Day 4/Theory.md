# Day 4 — Token Economics & Context Management

---

## ① Tokens Aren't Words — They Come From a Fixed Vocabulary

Day 1,2,3 established tokens ≈ ¾ of a word on average, and that rare words get split into pieces. Here's *why* that happens.

Before any model is trained, a separate one-time process builds a **fixed vocabulary** of ~30,000–100,000+ token "chunks" from a huge pile of text. The most common algorithm for this is **BPE (Byte Pair Encoding):**

```
1. Start with every individual character as its own token
2. Scan the training text, find the MOST FREQUENT adjacent pair of tokens
3. Merge that pair into one new token, add it to the vocabulary
4. Repeat steps 2-3 thousands of times
5. Stop once the vocabulary hits the target size (e.g. 100,000 tokens)
```

**Why this explains the behavior you already saw:**

```
"the"          → 1 token   (appeared so often it got merged all the way up to a whole-word token)
"unbelievable" → 3 tokens  ("un" + "believ" + "able" — the whole word wasn't common enough
                             to earn its own slot, but these sub-pieces were)
"zqvortex"     → 5+ tokens (never seen before — falls back toward individual characters)
```

The vocabulary is **fixed once training ends.** Every API call reuses the exact same chunk list — this is why token counts are consistent and predictable, not something the model decides per-request.

**Key implication:** you cannot judge token count by counting words or characters. A 100-word sentence of common words might be ~75 tokens; the same word count in rare/technical/foreign text could be 200+ tokens.

---

## ② Tokens = Money and Latency, Not Just a Context-Window Limit

Day 1,2,3 covered the context window as a hard ceiling (the "bucket" that overflows). But tokens matter even when you're nowhere near that ceiling — because every token has a cost in two currencies:

```
Money:    Providers charge per token, quoted as $ per million tokens (MTok)
Latency:  More tokens = more compute = slower response
```

**Input tokens and output tokens are billed differently — and by different mechanisms:**

```
Input tokens  (system prompt + history + your new message)
  → cheaper per token
  → why: the model reads the whole input in parallel — one pass, all at once

Output tokens (the model's reply)
  → pricier per token — often several times the input price, on the same model
  → why: the model generates one token at a time. To produce token #50,
    it must re-process everything before it (input + the 49 tokens
    it already generated). Generation cannot be parallelized like reading can.
```

**Concrete shape of the asymmetry (illustrative, not exact — see note below):**

```
Example pattern you'll see across providers:
  Input:  $X  per million tokens
  Output: $3X–$5X per million tokens  (same model, same request)
```

Exact prices are **provider- and model-specific and change over time** — this is a "look it up when you need it" fact (Anthropic/OpenAI pricing pages), not something to memorize into Theory.md.

**Why this matters for design decisions:**

```
A system prompt that causes long, verbose replies every single call
  → often costs MORE over time than a large but static conversation history
  → because you pay the expensive "output" rate on every extra reply token,
    every single call — while a static history is at least the cheap "input" rate

Lesson: if you want to cut cost, shortening expected OUTPUT length
(e.g. "answer in 2 sentences") often saves more than trimming input.
```

---

## ③ You Must Count Tokens BEFORE You Send the Request

Day 1,2,3's token-bucket math (system + history + question = total, compare to window) assumed you already know each piece's token count. Here's the missing step: **how do you actually get that number?**

You cannot count tokens by eyeballing text — "roughly ¾ a word" is only an estimate for planning, not precise enough to trust. Since the vocabulary is fixed once training ends and built via a public, known algorithm (BPE), you can run the *exact same* splitting algorithm yourself, before calling the API, to get an exact count.

```
Without counting ahead of time:
  You send a request → API counts tokens → if over budget → request FAILS
  You find out you were over budget only AFTER paying the latency cost of a failed call

With counting ahead of time:
  You count tokens locally (fast, free, no network call) → check against budget →
  decide to send as-is, trim, or summarize → THEN call the API
```

**Tools that do this (concept, not memorized API syntax):**

```
OpenAI ecosystem → "tiktoken" library — run the same BPE vocabulary locally
Anthropic        → a token-counting endpoint / SDK method that runs the same
                    count the API itself would use, without generating a reply
```

Both exist for the same reason: **the tokenizer is deterministic and known**, so it can run client-side instead of requiring a round-trip to the model.

**Where this fits in your workflow:**

```
1. Assemble system + history + new message (as in Day 1,2,3's token bucket)
2. Run each piece through the tokenizer/counter → get exact token counts
3. Compare total against: context_window - max_tokens (reserved for reply)
4. If over budget → apply a trimming strategy (e.g. a sliding window that drops oldest messages first) BEFORE calling the API
```

---

## ④ Budgeting & Truncation: The Sliding Window

Once you know your token counts (via a tokenizer/counter run before sending the request) and your budget (input/output pricing plus Day 1,2,3's bucket math), you need a strategy for when history doesn't fit. The simplest, most common default is a **sliding window**:

```
fixed_cost = tokens(system prompt) + tokens(new user message)
budget     = context_window - max_tokens_reserved_for_reply - fixed_cost

kept = []
running_total = 0

for message in history, walking NEWEST → OLDEST:
    if running_total + tokens(message) > budget:
        break                        # stop — everything older gets dropped
    kept.unshift(message)            # keep it, preserving original order
    running_total += tokens(message)

if any messages were dropped:
    log("dropped N oldest messages")  # so you can debug quality issues later
```

**Why newest-first, not oldest-first:** the most recent messages are almost always most relevant to the current question. You sacrifice old context before recent context.

**Why log what's dropped:** if the model later gives a confused answer ("what were we talking about?"), the log tells you it's because context was silently trimmed — not a model failure.

This is the "basic setup" answer. Two upgrades exist beyond this (not needed yet, later-week topics):

```
Summarization → instead of dropping old messages, compress them into a short
                summary that costs far fewer tokens but preserves the gist
Retrieval (RAG) → instead of keeping raw history at all, search a stored
                   knowledge base for just the relevant pieces per query
```

---

## ⑤ "Lost in the Middle" — Fitting Isn't the Same as Being Used Well

Even after correct budgeting, there's a second, separate problem: **content that technically fits inside the context window is not read with equal reliability.**

```
Position in context:    START ──────── MIDDLE ──────── END
Model's attention to it: HIGH            LOW             HIGH

Information buried in the middle of a long context gets referenced/used
less reliably than information placed at the start or end — even though
all of it "fits" and none of it was trimmed.
```

**Practical implication:** if you have one critical instruction or fact, don't bury it in the middle of a huge pasted document — put it in the system prompt (start) or right before your question (end).

This is also *why* retrieval (RAG — searching a stored knowledge base for just the relevant pieces per query instead of keeping raw history) often beats "just paste the whole document in" once documents get long: retrieving only the relevant chunk avoids the middle entirely, rather than trusting the model to find it in a haystack.

---

## Summary — The Shift From Day 1,2,3

```
Day 1,2,3 gave you:  the token bucket exists, and here's the math when full.

Day 4 adds:          WHY tokens split the way they do (fixed vocabulary),
                      WHY input/output are priced differently (parallel vs
                      sequential generation), HOW to count tokens before
                      you send (tokenizer, not eyeballing), a concrete
                      trimming algorithm (sliding window), and a reminder
                      that fitting in the window isn't the same as being
                      read reliably (lost in the middle).
```

---

*Next: Lessons.md — tokenizer docs, provider pricing pages, and the chunking experiment*
