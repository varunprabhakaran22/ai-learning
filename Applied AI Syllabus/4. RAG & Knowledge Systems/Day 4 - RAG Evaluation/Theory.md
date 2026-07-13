# Day 4 — RAG Evaluation

## ⓪ Where we left off, and the actual problem today solves

By the end of Day 3 you can build a genuinely strong retrieval pipeline: chunk documents, embed them, run hybrid search (semantic + BM25), re-rank the shortlist with a cross-encoder, optionally use parent-child lookup and HyDE, then paste the retrieved text into Claude's prompt and get an answer back.

Here's the problem none of that machinery solves: **how do you know if any of it is actually working?**

Concretely — you ask your RAG system "What is the cancellation fee for Plan A?" and it answers "$25/month." Is that right? You, the developer, don't know the answer off the top of your head either (that's the whole reason you built a system to look it up). Scaling this up: you have 200 real user questions coming in a week. You cannot personally read all 200 answers, cross-reference each one against the source documents by hand, and decide pass/fail. Even if you could do it once, you can't do it again next week after you tweak `chunkSize` from 500 to 800, or change `topK` from 3 to 5, or swap embedding models — every pipeline change needs to be re-checked, and manual checking doesn't scale to "every change."

This is the same shape of problem software engineering already solved with unit tests and CI: you don't manually click through your app after every code change, you write automated tests once and run them on every change for free. RAG evaluation is that same idea applied to a RAG pipeline — automated, repeatable, numeric scoring of whether the pipeline is working, so you can (a) catch regressions when you change something, (b) compare two pipeline configurations objectively ("is hybrid search actually better than pure semantic search, or does it just feel better?"), and (c) know your production system's quality without reading every single answer by hand.

The rest of today is: what specifically can go wrong in a RAG pipeline (there are exactly two failure surfaces, not one), how do you turn "did it go wrong" into a number, and what does "RAGAS" (the specific named framework the syllabus points at) actually compute under the hood.

---

## ① The two places a RAG pipeline can fail — and why they need separate scores

Recall the fixed pipeline order from Day 2: **retrieve** (find the relevant chunks) → **augment** (paste them into a prompt) → **generate** (Claude writes an answer from that prompt).

There are exactly two independent things that can go wrong here, and they are failures of two *different* components, so one single "was the answer good?" score can't tell you which one broke:

**Failure surface 1 — retrieval failure.** The pipeline fetched the WRONG chunks (or missed the right one). This is a bug in your embedding model choice, your chunk size, your `topK`, your hybrid-search `alpha` — the retrieval half of the system, nothing to do with Claude at all.

**Failure surface 2 — generation failure.** The pipeline fetched the RIGHT chunks, but Claude's answer doesn't actually match what those chunks say — it added something not present in the retrieved text, contradicted it, or ignored it and answered from its own training data instead. This is a prompt-engineering / generation-half bug, nothing to do with your vector database at all.

Why this split matters concretely: imagine your system answers "$25/month" and the true answer is "$10/month". Two totally different root causes produce that identical wrong output:
- Retrieval pulled the Plan B chunk instead of Plan A (Day 1's exact "topically-similar-but-wrong" trap) — generation then faithfully reported what it was given. **Retrieval bug.**
- Retrieval correctly pulled the Plan A chunk (which says $10), but Claude's answer said $25 anyway — misread the context, or answered from pretraining instead of the provided text. **Generation bug.**

If you only had one end-to-end "correct/incorrect" score, both cases look identical from the outside — you'd have no idea whether to go fix your chunking or fix your prompt. So RAG evaluation frameworks always compute **separate metrics for retrieval quality and separate metrics for generation quality**, never one blended score. Every metric in the rest of this file is explicitly labeled as scoring one surface or the other.

---

## ② What you need to run any of these metrics — a test set of Q&A pairs

Before any metric can be computed, you need **ground truth** — a set of questions where you (a human) already know what the correct answer is, and ideally also know which specific document chunk(s) contain that answer. This is called an **evaluation dataset**, and it's typically a list like:

```js
const evalSet = [
  {
    question: "What is the cancellation fee for Plan A?",
    groundTruthAnswer: "$10 per month",
    groundTruthContext: "The cancellation fee for Plan A is $10 per month", // the exact source chunk
  },
  // ... 10-50 more, covering easy cases, edge cases, and known trap cases (near-duplicates, Plan A/B style confusions)
];
```

Where does this come from in practice? Either you hand-write it (read your own docs, write realistic questions + correct answers — this is what the syllabus's Day 4 showcase task asks you to do: "Run your RAG pipeline on 10 Q&A pairs"), or for large-scale evaluation you generate candidate Q&A pairs with an LLM from your source documents and then have a human spot-check them. Without this ground-truth set, none of the metrics below can be computed — they all work by comparing the pipeline's actual output against this known-correct reference.

You run your full pipeline (retrieve → augment → generate) on every question in the eval set, and for each one you now have four pieces of data to compare against each other:
1. The **question** asked
2. The **retrieved context** (the actual chunks your pipeline pulled back)
3. The **generated answer** (what Claude produced)
4. The **ground truth** (ideally both the correct answer text and which chunk should have been retrieved)

Every metric below is a specific formula comparing some subset of these four things.

---

## ③ Retrieval-surface metrics — did we fetch the right chunks?

### Context Precision — of what we retrieved, how much was actually useful?

**Question it answers:** "Out of the chunks we pulled back, what fraction were actually relevant to the question?"

**Formula (conceptually):** for each retrieved chunk, judge relevant-or-not (1 or 0), then:

```
Context Precision = (number of retrieved chunks judged relevant) / (total number of chunks retrieved)
```

Concretely: if `topK=5` and you retrieve 5 chunks, but only 2 of them are actually about the question asked (the other 3 are noise — maybe near-duplicate padding, or topically-adjacent-but-irrelevant chunks), Context Precision = 2/5 = 0.4.

**How "relevant or not" gets judged, mechanically:** you can't hand-label this for every chunk on every run at scale, so this judgment itself is usually automated by asking an LLM (e.g. Claude) to look at the question and one retrieved chunk and answer "is this chunk relevant to answering the question? yes/no" — this is called **LLM-as-judge**, and you'll see it reused for almost every metric in this file. It isn't a separate exotic technique; it's just "use a capable LLM as the judge instead of a human," because a human judging every chunk on every pipeline run doesn't scale, same as the original problem in ⓪.

**What a low score tells you to go fix:** your retrieval is pulling too much noise — lower `topK`, tighten your re-ranking threshold (Day 3), or your chunks are too large/unfocused (Day 2's chunk-size trade-off).

### Context Recall — of what SHOULD have been retrieved, how much did we actually get?

**Question it answers:** "Did we actually get the chunk(s) that contain the true answer, or did we miss them entirely?"

**Formula (conceptually):** this needs the ground-truth context (piece 4 from ②) — break the ground-truth answer down into its component claims/facts, and check whether each one is supported by SOMETHING in the retrieved context:

```
Context Recall = (number of ground-truth claims that ARE supported by retrieved context) / (total number of ground-truth claims)
```

Concretely: if the ground truth is "the fee is $10/month, waived for annual plans" (two claims) and your retrieved chunks only contain the $10/month fact but nothing about the annual-plan waiver, Context Recall = 1/2 = 0.5 — you missed half of what should have been found.

**Precision vs recall, in one line, since these names are overloaded across ML:** Precision asks "is what I retrieved clean (no junk mixed in)?"; Recall asks "did I retrieve everything I needed (nothing missing)?" You can have perfect precision (every chunk you got back was relevant) while still having terrible recall (you missed other relevant chunks entirely) — these are independent failure modes, which is exactly why both are tracked as separate numbers, never combined into one.

**What a low score tells you to go fix:** the right chunk exists in your document store but your search isn't finding it — this points at your embedding model quality, your chunking strategy splitting the answer across chunk boundaries badly, or (Day 3) needing hybrid search/HyDE because of a semantic-vs-keyword or question-vs-statement mismatch.

---

## ④ Generation-surface metrics — given what we retrieved, was the answer any good?

These two metrics assume retrieval already happened and its output (the retrieved context) is fixed — they only judge what Claude did with that context.

### Faithfulness — does the answer only say things the retrieved context actually supports?

**Question it answers:** "Is every claim in the generated answer traceable back to the retrieved context, or did the model add/invent something?" This is the formal name for what's colloquially called a **hallucination check**, scoped specifically to whether the answer is grounded in the provided text (as opposed to general "is this answer true in the real world," which faithfulness does NOT check — a faithful answer can still be wrong if the source document itself was wrong).

**Formula (conceptually):** break the generated answer down into individual factual claims (a sentence like "the fee is $10/month, waived annually" is 2 separate claims), then for each claim ask an LLM judge: "is this claim directly supported by the retrieved context?" (yes/no):

```
Faithfulness = (number of claims in the answer supported by retrieved context) / (total number of claims in the answer)
```

Concretely: if Claude answers "$10/month, and this fee has been unchanged since 2019" but the retrieved context only says "$10 per month" (says nothing about 2019), the "unchanged since 2019" claim is unsupported — Claude invented it (possibly true in the real world, possibly not, but definitely not grounded in what it was given). If that's the only extra claim among 2 total, Faithfulness = 1/2 = 0.5.

**Why this is scored separately from "is the answer correct":** a low-faithfulness answer is a generation/prompt bug specifically (the model ignored its instructions to only use provided context) — completely independent of whether retrieval did its job. This is precisely the "generation failure" case named in ①.

### Answer Relevance — does the answer actually address the question that was asked?

**Question it answers:** "Even if every claim in the answer is faithful/grounded, did it actually answer the QUESTION, or did it wander into a tangent?" A faithful answer can still be irrelevant — e.g. the question was "what is the cancellation fee for Plan A" and the answer faithfully reports "Plan A includes a mobile app and 24/7 support" (all true, all grounded in real context about Plan A, but doesn't answer the fee question at all).

**Formula (conceptually), the reverse direction of the other metrics:** instead of judging the answer directly, generate several NEW candidate questions that the given answer WOULD be a good response to (an LLM is asked "what question does this answer look like it's answering?", generating 3-5 variants), then embed the original question and each generated question (Day 1's `embed()`), and compute the average cosine similarity between the original question and the generated ones:

```
Answer Relevance = average cosine_similarity(embed(original question), embed(each generated question))
```

The intuition: if the answer genuinely addresses the original question, an LLM asked to reverse-engineer "what question was this answering" should land on something very close in meaning to the original question — high cosine similarity. If the answer wandered off-topic, the reverse-engineered questions will land somewhere semantically distant from the original — low cosine similarity. This is Day 1's exact mechanism (embeddings + cosine similarity) reused as a scoring tool, not a new concept — the only new part is using it in reverse (comparing question-to-question instead of query-to-document).

**What a low score tells you to go fix:** this is a generation/prompt bug too — the prompt template isn't instructing Claude clearly enough to stay focused on the literal question, or the retrieved context is burying the relevant fact among too much unrelated text (which can loop back to a retrieval fix — large chunks or high `topK` diluting focus, tying back to Day 2/3).

---

## ⑤ Groundedness — the term that ties faithfulness back to citations

You'll see "groundedness" used sometimes as a synonym for faithfulness, and sometimes as a stricter variant that also requires **citation-level traceability** — not just "is this claim supported somewhere in the retrieved text" but "can we point to the EXACT chunk/sentence that supports it." A production RAG system that shows users "Source: Plan A Terms, paragraph 3" alongside its answer is doing groundedness in this stricter sense — every claim must resolve to a specific citation, not just "somewhere in the pile of retrieved text." Mechanically this is the same LLM-as-judge claim-checking as faithfulness, just with the judge additionally required to name which specific chunk supports each claim, and the metric can then also check "did the answer cite the right chunk," not only "is the claim true."

---

## ⑥ RAGAS — the named framework the syllabus points at, and what it actually is

**RAGAS** (Retrieval Augmented Generation Assessment) is not a new metric — it is an open-source Python library that implements exactly the four metrics above (Context Precision, Context Recall, Faithfulness, Answer Relevance) as ready-made functions, using LLM-as-judge (typically calling GPT-4 or another strong model as the judge) under the hood for each one, so you don't hand-write the claim-extraction and judging prompts yourself.

Concretely, using RAGAS looks like: you hand it your eval dataset (question, retrieved contexts, generated answer, ground truth — the exact four pieces from ②), you tell it which metrics to compute, and it returns a score 0-1 for each metric per question, plus an aggregate average across your whole eval set. This is the "framework hides the primitive, you should still understand the primitive first" pattern from Day 3's Recap — RAGAS's `faithfulness` metric is doing precisely the claim-extraction-and-LLM-judge process from ④, just packaged as one function call instead of a hand-written prompt.

**Why it matters that RAGAS uses an LLM as the judge internally, and what that costs you:** every RAGAS metric call means at least one (often several) extra LLM API calls per question, purely for evaluation — this is not free, and not instant. Evaluating 200 Q&A pairs across 4 metrics can mean 800+ extra LLM calls just to generate your quality report. This is why evaluation typically runs offline/in batch (e.g. nightly, or on every pipeline-config change) rather than live on every user request — it's a testing/CI step, not a runtime step.

---

## ⑦ Summary

| Metric | Surface | Question it answers | Needs ground truth? |
|---|---|---|---|
| Context Precision | Retrieval | Of what we retrieved, how much was relevant? | No (just judges retrieved chunks) |
| Context Recall | Retrieval | Of what we should have found, how much did we get? | Yes (ground-truth context) |
| Faithfulness | Generation | Does the answer only claim what the context supports? | No (just compares answer to its own retrieved context) |
| Answer Relevance | Generation | Does the answer address the actual question asked? | No (compares question to itself, reverse-engineered) |
| Groundedness | Generation (stricter) | Can every claim be traced to a specific citation? | No, but wants chunk-level granularity |

- Two independent failure surfaces (retrieval, generation) → always at least two separate metrics, never one blended score, because they point at different bugs to fix.
- Every metric needs an eval dataset (a set of Q&A pairs with known-correct answers) to run against — this is the equivalent of a test suite's test cases.
- LLM-as-judge (an LLM scoring relevance/faithfulness instead of a human) is the mechanism that makes every one of these metrics computable at scale — it's the same idea reused four times, not four different tricks.
- RAGAS = an off-the-shelf library implementing these exact four metrics with LLM-as-judge built in, so you call a function instead of hand-writing the judging prompts — same underlying primitives as everything above, packaged.
