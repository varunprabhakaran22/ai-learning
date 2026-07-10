# Day 2 — RAG Pipeline Architecture

## ⓪ Where we left off, and what's missing

Day 1 ended with a gap: Theory.md said documents get split into small "chunks" before embedding, but never explained how or why the split happens, or how big a chunk should be. Day 1 also established the fixed sequence for a *query*: embed query → cosine similarity against stored vectors → topK text → paste into Claude's prompt → generate. What Day 1 skipped was the *setup* side — what happens to a document BEFORE it's ever embedded, and what happens to the retrieved text AFTER it's found but BEFORE Claude sees it. Today closes both gaps and connects everything into one named pipeline: **chunking → embedding → retrieval → augmentation → generation.**

## ① Chunking — why it exists

A single embedding vector (say, 1536 numbers for OpenAI's `text-embedding-3-small`) is a FIXED size no matter how much text goes in. Feed it one sentence, or feed it a 40-page PDF — you get back the same 1536 numbers either way.

**1536 is not universal — it's just this one model's choice.** Every embedding model picks its own fixed output size when it's trained (called the model's **dimensionality**) — it's the width of that model's final output layer, baked into its architecture and never changing afterward. Other real models use completely different sizes: OpenAI `text-embedding-3-large` → 3072, Cohere `embed-english-v3` → 1024, Voyage `voyage-2` → 1024, Google `text-embedding-004` → 768. More dimensions isn't strictly "better" — it can capture more nuance, but costs more to store and compare, so it's a trade-off the model's creators picked, not a law of nature. This is the same fact from Day 1 (different models place vectors at different coordinates) taken one step further: models don't just disagree on WHERE a vector sits, they don't even use the same SIZE coordinate system. A 1536-dim vector and a 1024-dim vector can't be compared at all — there's no positional correspondence between index 501 of one and index 501 of the other.

This is the problem: 1536 numbers trying to represent one sentence can capture that sentence's meaning fairly precisely. 1536 numbers trying to represent 40 pages have to average/blend the meaning of everything on those 40 pages into the same fixed-size slot. Specific facts get diluted into a vague overall "gist" vector. If page 37 mentions "the cancellation fee is $50," that specific fact barely moves the needle on a vector that's also trying to represent pages 1–36 and 38–40 at the same time.

**Chunking = splitting a document into smaller pieces BEFORE embedding, so each embedding represents a small, specific piece of meaning instead of a diluted average of a huge document.** Chunking happens once, at ingestion time (when you first add a document to your system) — not at query time.

### How chunking actually works, mechanically

The simplest method — **fixed-size chunking** — is genuinely just: pick a chunk size (measured in characters or tokens, e.g. 500 tokens), and cut the raw document text into consecutive pieces of that size. That's it. No understanding of meaning involved at this step at all — it's a blind substring split, like `text.slice(0, 500)`, `text.slice(500, 1000)`, and so on.

**The overlap problem this creates:** if chunk 1 ends mid-sentence — "The cancellation fee for Plan A is" — and chunk 2 starts with "$50, charged within 30 days" — then neither chunk alone contains the full fact. Whichever chunk gets retrieved, the model sees an incomplete sentence and either hallucinates the missing half or fails to answer.

**The fix: overlap.** Instead of cutting chunks back-to-back with zero shared text, each chunk repeats the last N tokens of the previous chunk at its own start. Example with chunk size 500 and overlap 50: chunk 1 = tokens 0–500, chunk 2 = tokens 450–950, chunk 3 = tokens 900–1400. The 50-token overlap means a sentence that happens to fall exactly on a cut boundary is very likely to appear whole in at least ONE of the two chunks straddling that boundary, even though it might be truncated in the other.

Overlap doesn't eliminate the boundary problem — it just makes it statistically rare enough (a fact has to be longer than the overlap window AND straddle a boundary AND still get cut in every chunk it appears in) that it becomes tolerable rather than "the common case."

**Better than fixed-size: chunk on natural boundaries.** Instead of a blind character count, split on paragraph breaks, section headers, or sentence boundaries — so a chunk never cuts a sentence in half in the first place. This requires the chunker to actually parse structure (e.g. see a Markdown `##` heading, or detect `. ` as a sentence end) rather than just counting characters. Most production chunkers (e.g. LangChain's `RecursiveCharacterTextSplitter`) try paragraph breaks first, fall back to sentence breaks, then fall back to a hard character cut only if a single "paragraph" is still too big to fit in one chunk.

### Chunk size — the actual trade-off, not just "pick a number"

- **Too small** (e.g. 50 tokens): each chunk is precise but has almost no surrounding context. A chunk containing only "$50" with no sentence around it is technically the "exact fact" but useless to Claude without knowing $50-for-what.
- **Too large** (e.g. 4000 tokens): back to the Day 1 dilution problem — the embedding blends too much unrelated content into one vector, so a query about "cancellation fee" and a chunk that happens to also cover "refund policy," "billing cycle," and "account closure" all crammed into one chunk will score only moderately similar to any one of those topics, even though it technically contains the right answer somewhere inside it.
- **Common practical range: 200–1000 tokens per chunk, with 10–20% overlap.** This isn't a law of physics — it's an empirical sweet spot that balances "enough surrounding context to be coherent" against "specific enough to score high similarity for one topic." The right number for a given system is found by testing, which is exactly what Day 4 (RAG Evaluation) exists to measure objectively instead of guessing.

### Where LangChain and Hugging Face fit in (high-level only — full depth is scheduled later)

Nobody hand-rolls `chunkText`/`embed`/`cosineSimilarity` in production the way today's `example.js` does for learning purposes — two library ecosystems exist specifically to remove that boilerplate:

- **Hugging Face** is two things people conflate under one name: (1) a website/repository — like GitHub, but for pre-trained models and datasets, including embedding models — and (2) a Python library (`transformers`) that gives a standardized way to load and run any model hosted there, e.g. `model = AutoModel.from_pretrained("some-model-name")` works near-identically regardless of which specific model you pick. Architecturally, Hugging Face doesn't invent anything new — nearly every model hosted there is a **transformer** (the same architecture family as GPT and Claude). Hugging Face is the distribution + tooling layer sitting on top of that architecture, not a competing one.
- **LangChain** is a different kind of layer — it does no AI itself, it's **orchestration/glue**. It provides ready-made functions for the exact patterns being learned by hand today: `RecursiveCharacterTextSplitter` (chunking), vector-store wrappers (embed + store), retriever objects (topK search), prompt templates (augmentation), and chain objects that wire embed → retrieve → augment → generate into one call. Everything in this file's pipeline diagram has a LangChain equivalent — LangChain doesn't change what the pipeline IS, it just pre-builds the plumbing.

Full treatment of both is scheduled explicitly (Hugging Face / local models: Week 12, Day 2; LangChain-style orchestration: woven through the agent-orchestration weeks) — this is intentionally the "enough to not be confused by the names today" version, not the deep dive.

## ② The full pipeline, end to end

There are two separate flows in a RAG system that happen at completely different times. Conflating them is the most common source of confusion, so keep them strictly separate:

```
SETUP FLOW (runs once per document, ahead of time, offline)
──────────────────────────────────────────────────────────
Raw document
     │
     ▼
┌─────────────┐
│  1. CHUNK    │  split doc into overlapping pieces (200-1000 tokens each)
└─────────────┘
     │
     ▼
┌─────────────┐
│  2. EMBED    │  embed(chunk) for EACH chunk → one vector per chunk
└─────────────┘
     │
     ▼
┌─────────────┐
│  3. STORE    │  save {vector, original chunk text, metadata} in vector DB
└─────────────┘


QUERY FLOW (runs once per incoming user question, online, real-time)
──────────────────────────────────────────────────────────────────
User question
     │
     ▼
┌──────────────┐
│ 4. EMBED      │  embed(question) → one query vector
│    QUERY      │  (same embedding model as step 2 — Day 1's hard rule)
└──────────────┘
     │
     ▼
┌──────────────┐
│ 5. RETRIEVE   │  cosine similarity vs every stored vector → topK chunk texts
└──────────────┘
     │
     ▼
┌──────────────┐
│ 6. AUGMENT    │  build a NEW prompt: [instructions] + [topK chunk texts] + [question]
└──────────────┘
     │
     ▼
┌──────────────┐
│ 7. GENERATE   │  messages.create() with the augmented prompt → Claude's answer
└──────────────┘
```

Step 1–3 (chunk, embed, store) is the SETUP flow — it happens once when a document is first ingested, and again only if that document changes. Step 4–7 (embed query, retrieve, augment, generate) is the QUERY flow — it happens fresh, every single time a user asks a question, against documents that were already chunked/embedded/stored long before this particular question arrived.

This is why RAG systems feel fast at query time even with huge document collections: the expensive, slow part (embedding every chunk of every document) already happened ahead of time. At query time, you only embed ONE thing — the incoming question — then compare it against vectors that are already sitting there computed.

### Why step 3 stores the original text too — vectors can't be reversed

Storing `{vector, original chunk text, metadata}` together (not just the vector alone) isn't redundant belt-and-suspenders — it's structurally required, for one hard reason: **embedding is one-directional.** `embed(text)` produces a vector; there is no `unembed(vector)` that recovers the original text. The transformation is lossy on purpose (compressing a whole sentence into 1536 numbers necessarily throws information away), and the model was never trained to run backward. If only the vector were stored, retrieval would hand back `[0.023, -0.451, 0.198, ...]` — numbers with zero way to recover which sentence produced them.

So the two stored fields have two completely different jobs: **the vector is the index** (the only thing cosine similarity ever touches, used purely for comparison), and **the text is the payload** (the actual data that eventually gets pasted into Claude's prompt). This is why a vector DB record looks like a normal database row — `{ id, vector, text, metadata }` — except one column happens to be searched by similarity instead of exact match. Querying is really two steps happening inside the DB: (1) run similarity search on the `vector` column → get back matching row IDs + scores, (2) look up those IDs in the DB's own storage → return the full record, text and metadata included. It's one system, not two systems talking to each other — the vector is just the search key that the rest of the row rides along with.

### Metadata — what it is, and why it's not decoration

Metadata is any extra structured tag attached to a chunk that ISN'T itself embedded, but is available for filtering. Common fields: `source` (filename), `page`, `category`, `date_added`, or any domain-specific tag like `plan: "A"`.

Concrete reason it matters, using the Plan A/Plan B trap from Day 1: cosine similarity alone genuinely cannot tell the Plan A cancellation-fee chunk apart from the Plan B one — they're topically near-identical, same vocabulary, same structure. But if each chunk is stored with `metadata: { plan: "A" }`, a real vector DB supports a **filtered search** — "only compare against vectors where `plan == 'A'`" — combining exact structured filtering with semantic similarity in one query. That's the concrete mechanism behind Day 1's claim that real vector DBs give you metadata filtering "for free" that a plain array doesn't; metadata is what makes that filter possible at all.

## ③ Step 6 — Augmentation, the step Day 1 skipped entirely

Day 1 covered retrieval (get topK text back) and generation (call `messages.create()`) as if they connect directly. They don't — there's a step in between: **building the actual prompt string that gets sent to Claude.** This is called augmentation because you're augmenting (adding to) the user's raw question with retrieved context before it ever reaches the model.

**Augmentation is entirely your own code — no library does this step invisibly.** There's no "augmentation service" or hidden magic; it's plain string concatenation, the same as building any other prompt template. Retrieval hands you back plain text (per the "text is the payload" fact above — never a vector, Claude never sees vectors), and augmentation is just: take that plain text, take the user's question, and interpolate both into one prompt string before calling `messages.create()`. If you skip writing this step, there's nothing to skip TO — retrieval and generation don't have a default way to connect.

A minimal augmented prompt looks like this:

```
You are a support assistant. Answer the question using ONLY the context below.
If the context doesn't contain the answer, say "I don't have that information."

Context:
---
[chunk 1 text]
---
[chunk 2 text]
---
[chunk 3 text]

Question: What is the cancellation fee for Plan A?
```

Three concrete, deliberate choices are being made here, and each is a place augmentation can fail:

- **Instruction to stay grounded** ("using ONLY the context below"). Without this line, Claude will happily blend its own training-data knowledge in with the retrieved context, and you can no longer tell which parts of the answer came from YOUR documents vs. Claude's general knowledge — this is exactly the faithfulness problem Day 4's RAGAS metrics measure.
- **Explicit fallback instruction** ("say 'I don't have that information'"). Without this, if retrieval returns irrelevant chunks (a real failure mode, not hypothetical — see Day 1's "topically-similar-but-wrong" trap), Claude will still try to answer using whatever weak signal is in those chunks rather than admitting the context doesn't actually contain the answer. This is the direct cause of RAG hallucination — not the model "making things up" from nowhere, but the model doing its normal job (answer helpfully from what's in front of it) on context that was already wrong.
- **Chunk ordering and separators.** How chunks are joined (with `---`, numbered, labeled with source filenames) affects whether Claude can tell them apart as distinct pieces of evidence vs. one continuous blob. This matters more as topK grows — 5 distinct three-sentence chunks need visible boundaries or they read as one garbled paragraph.
  - The fix is a one-line formatting discipline in the string-building code, not a separate system: never join retrieved chunks with `chunks.join(" ")` or plain concatenation — always join with a visible, labeled separator per chunk, e.g. `` chunks.map((c, i) => `--- Source ${i+1} (${c.metadata.source}) ---\n${c.text}`).join("\n\n") ``. Labeling with the real source (from metadata, per the metadata section above) is strictly better than a bare `Chunk N` label when topK spans multiple different documents, since it also lets Claude cite which document an answer came from.

## ④ Where each pipeline step can fail — the actual point of today

The reason "RAG pipeline architecture" is taught as its own day, rather than folded into Day 1, is that a RAG system with each individual piece working correctly can still produce a wrong answer — because the failure isn't inside any one step, it's in how the steps compound. Walking the pipeline in order:

**Chunking failures**
- Chunk too large → dilution (Day 1's problem resurfaces): the right fact is IN the retrieved chunk, but buried among enough unrelated text that Claude may not weight it properly, or the chunk didn't score high enough on similarity to be retrieved at all.
- Chunk too small → fact retrieved but context missing: you get back "$50" with no sentence explaining what plan or scenario it refers to.
- Split mid-fact with insufficient overlap → the complete fact never exists whole in any single chunk, so no matter how good retrieval is downstream, the answer isn't recoverable — this failure is invisible at the embedding/retrieval stage because those steps work "correctly" on broken input.

**Embedding failures** (mostly inherited from Day 1, but now visible as a pipeline stage)
- Embedding model mismatch between ingestion time and query time (e.g. you switched embedding providers/model versions after documents were already stored) → cosine similarity becomes meaningless, silently, with no error thrown.
- Embedding captures topic but not fine-grained constraints (Day 1's "Plan A vs Plan B" trap) → wrong chunk retrieved with high confidence.

**Retrieval failures**
- topK too small → the right chunk exists in storage but doesn't make the cut.
- topK too large → correct chunk gets diluted by noise chunks in the final prompt, and token cost/latency rises.
- Near-duplicate flooding (Day 1) → topK slots filled with repeats of one chunk instead of K genuinely different candidates.
- Stale index → a document was updated/deleted, but its old chunks are still sitting in the vector DB and still get retrieved. **This cleanup is manual — the vector DB has no concept of "this document changed."** It only knows rows you explicitly told it to insert; nothing watches the source document for you. The standard fix is tagging every chunk with a `documentId` in its metadata at ingestion time, so an update can run `vectorDB.delete({ where: { documentId: "refund_policy_v1" } })` before re-chunking and re-inserting the new version. Without that `documentId` tag stored up front, there's no clean way to even find "every chunk that came from this now-outdated document" later — which is why metadata isn't optional decoration, it's what makes update/delete operations possible at all.

**Augmentation failures**
- Missing grounding instruction → Claude blends outside knowledge with retrieved context, breaking faithfulness.
- Missing fallback instruction → Claude answers confidently from irrelevant retrieved chunks instead of admitting it doesn't know.
- Chunks pasted with no separators/labels at high topK → Claude can't distinguish sources, answer quality degrades even though every chunk in the prompt is individually correct.

**Generation failures**
- Even with perfect context, Claude can still misread or misweight the provided text (a generation-layer error, not a retrieval error) — this is why Day 4 needs THREE separate metrics (faithfulness, relevance, context recall) rather than one: a wrong answer needs to be traceable to WHICH stage broke, and "the model just got it wrong despite correct context" is a real, distinct failure category from "retrieval handed it the wrong context."

The practical consequence: when a RAG system gives a wrong answer, debugging means walking this pipeline in order and checking each stage's output independently (were the right chunks even retrieved? was the prompt built correctly? did Claude use what it was given?) — rather than treating "RAG" as one opaque black box that either works or doesn't.
