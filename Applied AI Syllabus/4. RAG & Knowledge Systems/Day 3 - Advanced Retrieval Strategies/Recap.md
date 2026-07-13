# Day 3 Recap — Advanced Retrieval Strategies

## The three weaknesses being patched
- Pure semantic search (Days 1-2) misses exact tokens (order IDs, codes) — embedding captures topic, not exact characters. → fixed by **hybrid search**.
- Topically-similar-but-wrong chunks (Plan A vs Plan B) score too close for topK to reliably separate. → fixed by **re-ranking**.
- Chunk-size trade-off (Day 2): small chunk = precise but sparse context; large chunk = rich context but diluted embedding. → fixed by **parent-child chunking**.
- Query-vs-document style mismatch (question-shaped query vs statement-shaped document) is a different asymmetry entirely — not a chunking/scoring problem. → fixed by **HyDE**, on the query side, not the document side.
- These four stack, they don't compete — a production pipeline can run all four together in sequence (HyDE → hybrid search → re-rank → parent-child lookup → augment).

## Hybrid search — the formula is real, not simplified for teaching
`final_score = α × normalized_semantic + (1-α) × normalized_bm25` is the actual production pattern (LangChain's `EnsembleRetriever`, Elasticsearch/Weaviate hybrid search all use this weighted-sum shape) — only the chosen `α` value varies per use case, the formula itself doesn't. `α=1` → pure semantic (the `(1-α)` term zeroes out); `α=0` → pure BM25 (the `α` term zeroes out) — falls directly out of the algebra, not a special-cased rule.

## BM25 and semantic search are two fully independent pipelines — not sequential stages
- **Semantic search** operates on **vectors**: embed → cosine similarity → (at scale) HNSW graph walk. A trained-model-based mechanism.
- **BM25** operates on **raw text/term statistics only** — tokenize, count term frequency (capped, diminishing returns), inverse document frequency (rare terms score higher), document-length normalization. No vectors, no neighbor graphs, no trained model, no embeddings involved at any point.
- BM25 is not "post-embedding" and doesn't run "in retrieval space vs storage space" as a meaningful distinction — it simply never touches the vector column at all. Delete every embedding line from a pipeline and BM25 still works identically.
- BM25 isn't an "architecture" (no training, no learned weights, no layers) — it's a fixed algebraic scoring formula. "BM25 score" = the number that formula outputs for one (query, document) pair.
- Both run at the same TIME (query time), but in completely separate SPACES (text-statistics vs vector-geometry) — that's the accurate framing, not a pipeline ordering.

## Why normalize before combining
Cosine similarity is mathematically bounded to [-1, 1]. BM25 has no fixed upper bound — could be 0.3 or 40 depending on term rarity/document length. Adding raw scores together would let BM25's bigger numbers silently dominate the sum regardless of `α`, not because BM25 is more relevant but purely because its scale runs bigger. Min-max normalizing both score lists to 0-1 first is what makes `α` actually control the relative trust between the two signals — the entire reason the knob works as intended.

## Re-ranking — bi-encoder vs cross-encoder
Stage 1 (retrieval) uses a **bi-encoder**: query and each document embedded SEPARATELY, independently, compared afterward via cosine similarity — fast, pre-computable ahead of time, but can't reason about how THIS query's specific words interact with THIS specific chunk. Stage 2 (re-ranking) uses a **cross-encoder**: query + one candidate chunk fed in TOGETHER as one input, scored jointly — catches nuance (Plan A vs Plan B) a bi-encoder misses, but can't be pre-computed (score only exists once both texts are present) so it's only run on a small shortlist (e.g. top 20), never the full collection.

## Parent-child chunking — exact storage layout
Only child chunks get embedded and enter the vector DB. A real vector DB (Chroma/Pinecone) record is `{id, vector, text, metadata}` — child chunks get `metadata: {parentId: "p1"}`; the parent's full text is NOT embedded and NOT stored in the vector column at all. Parent chunks live in a separate, ordinary store — a plain key-value store, Postgres/Redis/MongoDB, or even a JSON object — keyed by `parentId`, looked up (not searched) by direct ID after a child chunk is matched. This is LangChain's actual `ParentDocumentRetriever` pattern: a vector store for children + a separate document store for parents. Flow: embed(query) → cosine similarity, but this only ever searches CHILD vectors → matched child's `metadata.parentId` → look up that ID in the separate parent store → the FULL parent text (not the child text) proceeds to augmentation.

## HyDE — the precise mechanism, and what it does NOT use the user's query for
The real asymmetry HyDE fixes: a document chunk is declarative/statement-style (written by the source author); a user's question is interrogative-style. Statement-style text embeds closer to other statement-style text than question-style text does, regardless of who authored either side or whether content is factually correct. Mechanism: send the user's question to Claude, ask for a plausible (possibly fabricated/wrong) declarative-style answer, embed THAT hypothetical answer, and use that vector for similarity search against real document chunks. Claude's authorship carries no special status — using an LLM is just the practical way to reliably produce fluent statement-shaped text from an arbitrary question. The user's original question is never embedded in a HyDE flow — after generating the hypothetical answer, the literal question is discarded from retrieval entirely; only `embed(hypothetical answer)` gets compared against stored vectors. The hypothetical answer itself is also discarded after search — never shown to the user, never included in the final augmented prompt; only the REAL retrieved chunks proceed to generation.

## Using LangChain doesn't remove the decisions, it relocates them
LangChain (or any framework) ships tested, pre-built versions of every mechanical piece here — `RecursiveCharacterTextSplitter`, hybrid retrievers (`EnsembleRetriever`), re-ranking wrappers (`ContextualCompressionRetriever`), parent-child (`ParentDocumentRetriever`). You won't hand-write BM25 or a cross-encoder call in production. But the library can't pick `chunkSize`, `alpha` (hybrid weight), `topN` before re-ranking, `topK` after, or whether parent-child/HyDE is even needed for your data — those stay 100% your call, informed by understanding what each knob actually controls. The real engineering skill is diagnosis, not typing: figuring out WHICH pipeline stage is failing (wrong chunk retrieved? right chunk too sparse? query phrasing mismatched?) is what tells you which pre-built component to reach for — hand-rolling `bm25Scores` today means `alpha` in a real `EnsembleRetriever` is a known quantity later, not a magic default to copy-paste.

## Still need to cover / do
- Read Lessons.md sources ("advanced RAG techniques 2025", "re-ranking in RAG pipelines").
- Run the 20-query basic vs hybrid vs re-ranked benchmark experiment, scoring relevance per query (not just aggregate pass/fail).
- Run `example.js` for real (needs OPENAI_API_KEY + ANTHROPIC_API_KEY) and inspect actual BM25/hybrid/rerank scores on the order-ID and Plan A/B queries.
- Optional: extend `example.js` with an actual parent-child implementation (separate parent store keyed by `parentId`, looked up before augmentation) and a HyDE step, since both are theory-only today.
- RAG & Knowledge Systems Day 4 — RAG Evaluation — faithfulness, relevance, groundedness, RAGAS framework.
