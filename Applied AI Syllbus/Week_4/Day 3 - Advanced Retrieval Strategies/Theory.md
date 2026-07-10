# Day 3 — Advanced Retrieval Strategies

## ⓪ Where we left off, and what's missing

Days 1–2 built one retrieval method: embed the query, cosine-similarity against stored chunk vectors, take topK. That method has three concrete weaknesses already named but never fixed: (1) pure semantic search can miss exact tokens it was never trained to treat as special — an order ID, a product code, a person's name — because embedding captures *topic*, not exact characters; (2) topically-similar-but-wrong chunks (Plan A vs Plan B) score close enough to genuinely confuse topK; (3) a chunk that's the right SIZE for embedding precision is sometimes too small to give Claude enough surrounding context to answer well (the chunk-size trade-off from Day 2). Today covers four separate techniques that each patch one of these gaps: **hybrid search** (fixes weakness 1), **re-ranking** (fixes weakness 2), **parent-child chunking** (fixes weakness 3), and **HyDE** (a different kind of fix — improves the query side, not the document side). None of these replace what you built — they all sit as extra steps around the same retrieval flow from Day 2.

## ① Hybrid search — fixing exact-match blindness

### The problem, concretely

Day 1 established that semantic search beats keyword search because it matches on trained meaning-closeness rather than literal shared words — catching "refund" vs "reimbursement." But that same Day 1 Theory.md flagged the flip side: semantic search "loses exact-match precision on IDs/codes the model never learned to treat as distinct." Concretely: a query like "order #A4471-X" embeds into a vector representing roughly "a question about an order," not a vector that specially prioritizes the exact string `A4471-X`. If ten different chunks all mention different order numbers in near-identical sentence structure ("Your order #___ has shipped"), they'll all score similarly close to the query — cosine similarity has no special mechanism for weighting an exact code match higher than the surrounding sentence structure.

Old-school **keyword search** (the thing Day 1 said semantic search "beats") is bad at synonyms but is EXACTLY the right tool for exact tokens — it doesn't care about meaning at all, it counts literal word/term overlap, so `A4471-X` matching `A4471-X` scores maximally regardless of surrounding sentence.

### BM25 — the actual keyword-search algorithm used in hybrid search

"Keyword search" isn't hand-waved — it's a specific, well-defined scoring formula called **BM25** (Best Match 25), the modern standard replacing simple "count matching words." BM25 scores a document against a query based on three factors combined:

1. **Term frequency (TF)** — how many times does the query term appear in this document? More occurrences = higher relevance, but with **diminishing returns** (BM25 deliberately caps how much repeated occurrences keep adding score, unlike naive word-counting, so a document that says "refund" 50 times doesn't score 50x higher than one that says it twice).
2. **Inverse document frequency (IDF)** — how RARE is this term across the whole document collection? A term like "the" appears everywhere and is nearly worthless as a relevance signal; a term like "A4471-X" appears in exactly one place and is a very strong signal. IDF automatically down-weights common words and up-weights rare, distinctive ones — this is precisely the mechanism that makes BM25 good at exact codes/IDs: a rare exact-match token gets a large score boost specifically because it's rare.
3. **Document length normalization** — a longer document has more chances to contain any given word by pure chance, so BM25 penalizes raw term counts in long documents relative to short ones, so length alone doesn't win.

BM25 needs zero training and zero embedding model — it's pure statistics over the literal text, computed fresh at query time (or pre-indexed, the same way search engines have worked for two decades before embeddings existed).

### Hybrid search = run both, combine the scores

**Hybrid search = compute BM25 score AND cosine-similarity score for every candidate chunk, then combine them into one final ranking**, instead of picking one method exclusively. A common combination formula:

```
final_score = (α × normalized_semantic_score) + ((1 - α) × normalized_bm25_score)
```

`α` (alpha) is a tunable weight between 0 and 1 controlling how much to trust semantic vs. keyword scoring — `α = 1` is pure semantic search (Day 1–2's method), `α = 0` is pure keyword search, `α = 0.5` weighs both equally. "Normalized" matters here because BM25 scores and cosine similarity scores live on completely different numeric scales (BM25 has no fixed range; cosine similarity is bounded -1 to 1) — you can't add them directly without first rescaling both into a comparable range (commonly min-max scaling each score list to 0–1 before combining).

**Why this actually fixes the problem:** a chunk containing the exact order ID gets a strong BM25 boost (rare, exact match) even if its semantic score is only mediocre — so it surfaces in the combined ranking even when pure cosine similarity alone would have buried it among ten similarly-phrased "order shipped" chunks.

## ② Re-ranking — fixing topically-similar-but-wrong

### The problem, concretely

Hybrid search improves WHICH candidates get pulled into consideration, but doesn't fix Day 1's Plan A/Plan B trap: two chunks about different cancellation fees, same vocabulary, same sentence structure — hybrid search's BM25 component won't help here either, since both chunks share the same keywords too (both say "cancellation," "fee," "Plan"). The retrieval step (whether pure semantic or hybrid) is fundamentally a **fast, approximate first pass** — it has to score potentially thousands of chunks quickly, so the similarity math it uses (cosine similarity, BM25) is deliberately cheap and doesn't deeply understand nuance like "which specific plan is THIS query asking about."

### Re-ranking — a second, slower, smarter pass on a small shortlist

**Re-ranking = take the initial retrieval's top candidates (say, top 20) and re-score just those 20 with a slower, more accurate model, then keep only the new top K (say, top 3) from that re-scored list.** This is a two-stage funnel:

```
All chunks (thousands)
        │
        ▼
┌────────────────────┐
│ STAGE 1: RETRIEVE   │  cheap, fast, approximate (cosine similarity / hybrid)
│ cast a WIDE net      │  → top 20 candidates
└────────────────────┘
        │
        ▼
┌────────────────────┐
│ STAGE 2: RE-RANK     │  expensive, slow, precise (cross-encoder model)
│ narrow to the BEST   │  → top 3 final chunks
└────────────────────┘
        │
        ▼
   passed to augmentation
```

The re-ranker itself is typically a **cross-encoder model** — mechanically different from the embedding model used in stage 1. Recall from Day 1: an embedding model (a **bi-encoder**) embeds the query and each document SEPARATELY and independently (`embed(query)` and `embed(doc)` never see each other, comparison happens afterward via cosine similarity) — this is exactly why it's fast enough to pre-compute document vectors ahead of time. A **cross-encoder** instead takes the query AND one candidate chunk TOGETHER, as one combined input, and the model directly outputs a single relevance score for that specific pair — it can actually reason about how the query's specific words interact with THIS particular chunk's specific words (catching that the query says "Plan A" and this chunk is about "Plan B"), because it's not compressing each side into a fixed vector independently — it sees both texts side by side.

**Why cross-encoders aren't used for ALL retrieval, only re-ranking:** a cross-encoder has to run a full forward pass through the model for EVERY (query, document) pair, at query time, live — there is no way to pre-compute anything ahead of time, because the score only exists once you have BOTH the query and a specific document together. Running that against every chunk in a large collection would be far too slow. Running it against just the top 20 candidates a fast bi-encoder already shortlisted is fast enough to do live, while still catching what the bi-encoder's fast approximation missed. This is why re-ranking is always a SECOND stage, never a replacement for stage 1 — it needs stage 1 to already narrow thousands of chunks down to a manageable shortlist first.

## ③ Parent-child chunking — fixing the chunk-size trade-off

### The problem, concretely

Day 2's chunk-size section named a real trade-off with no clean resolution: small chunks are precise (score well on similarity, since they're topically narrow) but lack surrounding context; large chunks have context but dilute the embedding (score worse on similarity, since they blend multiple topics). Every fixed chunk size picks ONE point on that trade-off — you can't have a chunk that's simultaneously small (for precise retrieval) and large (for rich context), because chunk size is used for BOTH jobs at once in the Day 2 design.

### Parent-child chunking — decouple the two jobs

**Parent-child chunking splits documents at TWO different granularities and uses each one for a different job:**

- **Child chunks** — small (e.g. 100–200 tokens). These are what actually get embedded and searched against — small enough to stay topically precise, exactly the property that makes retrieval scoring accurate.
- **Parent chunks** — large (e.g. 1000+ tokens), each containing several child chunks within it. These are NEVER embedded or searched directly — they exist purely as a lookup: each child chunk stores a reference (e.g. `parentId`) to which parent chunk it came from.

The flow: retrieval still runs on the small, precise child chunks (so search stays accurate) — but once a child chunk is selected as a topK result, **you don't send the child chunk's text to augmentation, you look up and send its PARENT chunk's full text instead.** Claude receives the larger, context-rich parent passage, even though the search that FOUND it was powered by the smaller, precise child.

```
Document
   │
   ▼
Parent chunk (1000 tokens) ──contains──► Child A (150 tok) ──embedded, searched
                             ──contains──► Child B (150 tok) ──embedded, searched
                             ──contains──► Child C (150 tok) ──embedded, searched

Query matches Child B (precise match)
   → look up Child B's parentId
   → retrieve the FULL parent chunk (1000 tokens)
   → that full parent chunk is what gets sent to augmentation
```

This is a genuinely different move from "just increase chunk size" or "just decrease chunk size" — it keeps the SEARCH INDEX built on small units (accuracy) while the AUGMENTATION PAYLOAD is built on large units (context), instead of forcing one chunk size to serve both purposes.

## ④ HyDE (Hypothetical Document Embeddings) — fixing the query side, not the document side

### The problem, concretely, and why it's a different kind of problem than ①–③

Every technique so far improves how documents are chunked, scored, or re-ranked. HyDE targets a different asymmetry: **queries and documents are written in structurally different styles**, even when they're about the exact same fact. A user query is typically a short question: "What's the cancellation fee for Plan A?" A document chunk that answers it is typically a declarative statement: "The cancellation fee for Plan A is $10 per month, applicable within the first year." These are semantically related but embedding models were mostly trained on (and are best at matching) similar-style text to similar-style text — a question and a statement, despite being "about the same thing," don't always embed as closely together as two statements about the same thing would.

### HyDE — have the LLM write a fake answer first, then embed THAT

**HyDE's mechanism:** before doing any retrieval, send the user's question to an LLM (e.g. Claude) and ask it to generate a plausible-sounding, hypothetical answer — even though this hypothetical answer might be completely fabricated/wrong, since the LLM hasn't seen your actual documents yet. Then, instead of embedding the user's original question, **embed the hypothetical answer**, and use THAT vector to search your document store.

```
User question: "What's the cancellation fee for Plan A?"
        │
        ▼
Ask Claude (no documents given): "Write a plausible answer to this question"
        │
        ▼
Hypothetical answer (possibly wrong): "The cancellation fee for Plan A is typically
around $15, charged if you cancel within the first few months of service."
        │
        ▼
embed(hypothetical answer)  ← NOT embed(original question)
        │
        ▼
cosine similarity vs stored document chunks
        │
        ▼
topK real chunks (this part uses REAL documents — the hypothetical answer
was only ever a search aid, its content never reaches the final prompt)
```

**Why this works despite the hypothetical answer being potentially factually wrong:** correctness of the hypothetical answer's specific facts doesn't matter — what matters is that a hypothetical ANSWER (declarative statement style) embeds more closely to a REAL document chunk (also declarative statement style) than the original QUESTION (interrogative style) would have. HyDE is purely a style-matching trick at the embedding level — it exploits the fact that "statement embeds close to statement" is a stronger signal than "question embeds close to statement," even when the statement's content is invented. The hypothetical answer is discarded after search — it's never shown to the user and never included in the final augmented prompt; only the REAL retrieved chunks proceed to generation.

## ⑤ How these four combine — they stack, not compete

None of these techniques are mutually exclusive alternatives — a production RAG system commonly runs several together, in this order:

```
User question
     │
     ▼
[HyDE]  question → hypothetical answer → query vector for search
     │  (optional: skip straight to embedding the real question if HyDE isn't used)
     ▼
[Hybrid search]  BM25 + cosine similarity on CHILD chunks → wide candidate set (e.g. top 20)
     │
     ▼
[Re-ranking]  cross-encoder re-scores those 20 → narrow to top K (e.g. top 3)
     │
     ▼
[Parent-child lookup]  each of the K child chunks → replaced by its PARENT chunk's full text
     │
     ▼
Augmentation (Day 2) → Generation (Day 2)
```

Each technique patches a different, independent weak point in the base pipeline from Days 1–2 — which is why "advanced retrieval" is worth a dedicated day: it's not one upgrade, it's four separable upgrades that compose.
