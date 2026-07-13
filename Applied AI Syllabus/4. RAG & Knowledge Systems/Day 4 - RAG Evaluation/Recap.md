# Day 4 Recap — RAG Evaluation

## Why RAG needs evaluation at all
Manually reading every answer and cross-checking it against source documents doesn't scale — not for one batch of 200 user questions, and definitely not every time a pipeline knob changes (`chunkSize`, `topK`, embedding model). Evaluation is the same idea as unit tests/CI applied to a RAG pipeline: write the check once (an eval set), run it automatically on every change, get a number back instead of manually reading output.
- **From our discussion:** eval = test suite, exactly — the analogy isn't loose, it's the same shape (write once, run on every change, no manual re-checking).

## The two failure surfaces
A RAG pipeline is retrieve → augment → generate. Only two of those steps are independently scored:
- **Retrieval** — did we fetch the right chunks?
- **Generation** — given those chunks, did the model produce a good answer?

Augmentation (pasting retrieved text into a prompt) is plain string concatenation with no separate metric — if it's broken, it surfaces as a generation-surface failure, not its own category. The split exists because one blended "correct/incorrect" score can't tell you which half broke — "$25 instead of $10" could be retrieval pulling the wrong chunk, or generation misreading the right chunk, and those need different fixes.
- **From our discussion:** this was a direct correction — "retrieval, augmented, generation" as three scored places is wrong; it's two surfaces (retrieval, generation), four metrics split two-and-two across them.

## What you need before any metric can run — the eval set
An eval set is 10-20+ `{question, groundTruthAnswer, groundTruthContext}` triples, hand-written by a human from the actual source documents (or LLM-generated candidates with human spot-checks at scale). Without this ground truth, no metric below can be computed — every metric works by comparing pipeline output against this known-correct reference.
- **From our discussion:** confirmed the eval set is hand-written from real docs, not invented and not pulled from live user questions — that's a separate use case (see the cron section below). A good set deliberately includes trap cases (near-duplicates, Plan A/B-style confusions), not just easy questions.

## The four metrics

**Context Precision** (retrieval) — of what was retrieved, how much was relevant? `relevant chunks / total retrieved`, judged per chunk.

**Context Recall** (retrieval) — of what should have been found, how much did we get? Ground truth is split into atomic claims, each claim checked against the full retrieved context: `supported claims / total claims`.
- **From our discussion:** walked through a concrete two-claim, two-chunk example. Ground truth = "$10/month fee [Claim A] + waived for annual plans [Claim B]." If retrieval pulls both chunks, both claims are individually confirmed present → Recall = 1.0. If retrieval misses the waiver chunk, the joined retrieved-text string simply doesn't contain that claim's words or meaning anywhere, so the judge honestly answers "no" for Claim B → Recall = 0.5. Key point: **there's no weighting** — every claim counts as exactly 1 point in the denominator regardless of business importance. If the "minor" claim and the "critical" claim are each worth one missing point, the score can't tell you which one mattered — RAGAS's stock formula has no built-in importance weighting; that would have to be hand-added to the eval set.

**Faithfulness** (generation) — does the answer only claim what the retrieved context actually supports? The formal name for a hallucination check, scoped specifically to "grounded in the given text," not "true in the real world." Answer is split into claims, each checked against retrieved context: `supported claims / total claims`.

**Answer Relevance** (generation) — does the answer address the question asked, not just stay faithful to the context? Mechanically different from the other three: instead of an LLM yes/no verdict, it reverse-engineers 3 candidate questions the given answer would suit, embeds the original question and each candidate, and averages the cosine similarities.
- **From our discussion:** confirmed from the function signature in `example.js` (`answerRelevance(question, answer)`) that this metric touches only the question and the answer — no `retrievedChunks`, no ground truth at all. It's a self-consistency check between what was asked and what the answer looks like it was trying to answer, independent of whether the answer is grounded or correct.

**Groundedness** — sometimes a synonym for Faithfulness, sometimes a stricter variant requiring citation-level traceability (which exact chunk supports which exact claim), not just "supported somewhere in the pile."

A low score on any one metric points at a specific, different fix: low Context Precision → too much retrieval noise (lower `topK`, tighter re-ranking); low Context Recall → the right chunk exists but wasn't found (embedding model, chunk size, hybrid search/HyDE); low Faithfulness → generation/prompt bug, model added something not in context; low Answer Relevance → generation/prompt bug, model wandered off-topic, or retrieved noise buried the relevant fact.

## LLM-as-judge — the mechanism underneath every metric
Three of the four metrics (Context Precision, Context Recall, Faithfulness) work by asking an LLM a narrow, bounded yes/no per chunk or per claim, then computing `count(yes) / total`. This is one mechanism reused three times, not three different tricks — a human judging every chunk on every pipeline run doesn't scale any better than the original manual-checking problem, so an LLM stands in as the judge instead.
- **From our discussion:** the worry that a confident LLM might just claim retrieval "has it all" doesn't actually apply here, because the judge is never asked the open-ended question "did retrieval get everything?" — it's only ever shown a fixed block of retrieved text and asked "is *this one specific claim* supported *in this text*?" That's a bounded reading-comprehension check, a much lower-error task than open-ended generation. When a chunk is genuinely missing, the joined retrieved-text string doesn't contain that claim's words or meaning anywhere, so the honest answer is "no" — not humility, just an accurate read of what's actually in front of it. The judge would only fail by hallucinating support from text that never mentions the concept at all — narrower and rarer than blanket overconfidence.
- Real, narrower failure modes worth tracking: **paraphrase-blindness** (judge says "no" when retrieved text means the same thing in different words — over-strict) and **over-inference** (judge says "yes" to a claim that's a reasonable leap but not literally stated — over-generous). Both are prompt-quality problems (fixable with stricter instructions / few-shot examples), not evidence the approach is broken.

## Judge reliability — calibration, not infinite regress
"Who judges the judge" doesn't spiral into an endless chain, because the fix isn't another LLM layer — it's a one-time (or periodic) calibration against a human-labeled sample.
- **From our discussion:** the mechanism is: manually judge ~20-30 items yourself, compare your verdicts to the LLM judge's verdicts on the same items, compute `agreement rate = matches / total` (or Cohen's kappa for a stricter version) — this comparison is plain arithmetic, not another LLM call. This is the one deliberate non-LLM anchor in the whole loop. If agreement is high enough, trust the judge day-to-day without re-checking every run; if low, fix the judge prompt (stricter wording, few-shot borderline examples, maybe a stronger judge model) and re-calibrate — you don't add a third judge on top. This works because eval's real use case is *relative* comparison ("did this change help or hurt?"), not a certified absolute score, so a directionally-consistent judge is good enough even if imperfectly calibrated — similar to calibrating a thermometer once rather than re-checking it against a human hand on every single reading.

## RAGAS — the named framework
RAGAS (Retrieval Augmented Generation Assessment) is an open-source library implementing exactly these four metrics as ready-made functions (`context_precision`, `context_recall`, `faithfulness`, `answer_relevancy`), using LLM-as-judge under the hood so you don't hand-write the claim-extraction and judging prompts yourself. You hand it the eval dataset (question, retrieved contexts, generated answer, ground truth), tell it which metrics to compute, and get a 0-1 score per question plus an aggregate. Every RAGAS call costs real extra LLM API calls purely for evaluation (200 questions × 4 metrics can mean 800+ calls) — this is why evaluation runs offline/in batch, not live per user request.
- **From our discussion:** RAGAS and LangChain are not the same thing — RAGAS is the dedicated eval library (defaults to GPT as judge, swappable), and LangChain doesn't own these metrics itself, though RAGAS has first-class LangChain integration (wraps a LangChain retriever/chain directly instead of manually assembling the dataset). **LangSmith** (a separate LangChain product) has its own built-in correctness/faithfulness/relevance evaluators plus a dashboard for tracking scores over time — closer to the "nightly + dashboard" production-monitoring use case than a bare metrics library. Hand-rolling the four functions in `example.js` before reaching for real RAGAS is the same "understand the primitive before the framework hides it" pattern as Day 3 — swapping in RAGAS later is a drop-in replacement, not new conceptual ground.

## When evaluation actually runs — regression testing vs. production monitoring
These are two different practices using two different question sets, often conflated under "run eval nightly":
- **Regression testing** — the same fixed, hand-written eval set (ground truth known), re-run whenever the pipeline changes (chunk size, topK, embedding model swap). This is CI triggered by a change, not really "nightly for its own sake" — all four metrics compute since ground truth exists.
- **Production monitoring** — sampled real user questions from that day, no ground truth available. Context Recall can't be computed (it needs ground-truth context), but Context Precision, Faithfulness, and Answer Relevance all still work, since none of the three require ground truth — this is genuinely how reference-free evaluation works in practice, and it's the actual justification for a nightly cron job.
- **From our discussion:** running the identical fixed regression set nightly with nothing changed is redundant — same scores every time. Nightly cadence only earns its keep for production-traffic monitoring, or as a cheap trip-wire against silent upstream changes (embedding API version bump, document re-ingestion) between explicit pipeline edits.

## Implementation detail — no system prompt in the judge calls
`example.js`'s `askClaude` helper sends only a user message, no `system` field.
- **From our discussion:** not a hidden requirement being missed — grading instructions are just inline in the user message instead. A hardened version would move a fixed "grading persona" (strict grader, one-word answer only) into `system`, separating "how to judge" from "what to judge this time" and making it cacheable across all eval items.

## Still need to cover / do
- Read Lessons.md sources (RAGAS docs, "RAG evaluation metrics explained").
- Write 10 real Q&A pairs from actual source documents (not `example.js`'s 2-item toy set) and run them through `createRAGEvaluator`.
- Find a real low-Context-Recall case and trace it to a Day 2/3 knob; find a real low-Faithfulness case and inspect what got invented.
- Benchmark: does Day 3's hybrid+re-rank pipeline measurably beat `example.js`'s brute-force retrieval on Context Precision/Recall, same 10 questions?
- Optional: run a small human-calibration pass (~20 items) against the LLM judge's verdicts and compute agreement rate, to see the calibration step in practice rather than just in theory.
