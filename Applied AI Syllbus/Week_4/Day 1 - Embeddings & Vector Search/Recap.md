# Day 1 Recap — Embeddings & Vector Search

## The actual problem (why any of this exists)
- Claude only knows its frozen training data + whatever text I paste into THIS prompt. It has never seen my business docs at all — not a weaker understanding, ZERO exposure.
- Can't paste all my docs into every prompt: hard token limit (context window), plus even below that limit it's slower/costlier and dilutes the model's attention with mostly-irrelevant content.
- So the real problem RAG solves: out of thousands of documents, find the FEW that are actually relevant to this question, and paste only those into the prompt. Embeddings/vector search = the "find the few relevant ones, fast" mechanism. Nothing more mystical than that.

## Vector — plain math, no AI
- A vector is just a list of numbers, e.g. `[3, 7]` — a point you could plot on a graph. Close points = similar; far points = different. This idea alone has nothing to do with AI.
- Individual numbers inside a real embedding vector are NOT independently labeled ("this number = formality") — each one is just whatever value a specific trained neuron settled on. Meaningless alone; only meaningful when comparing two full vectors against each other.

## Embedding — a trained model's fixed function, not a live decision
- `embed(text)` sends text through an ALREADY-TRAINED neural network (e.g. OpenAI's `text-embedding-3-small`) and returns one vector — same length every time, regardless of input length (one word or 40 pages → same-size array).
- Training already happened, ONCE, in the past, done by OpenAI — via contrastive learning: millions of known-similar pairs nudged closer together, known-unrelated pairs nudged farther apart, via gradient descent, repeated millions of times. I never train or nudge anything myself — I only ever call the finished, frozen model.
- Critical: `embed(oneDocument)` never compares against a query or "how relevant" anything — it's a single-input, deterministic calculation using fixed trained weights. Relevance does NOT exist yet at this step.
- Embedding models are different from chat LLMs — smaller, separate, trained only to produce vectors, never to converse. This is why Claude has no embedding API at all; Claude was never trained for this task.
- Different embedding models (OpenAI vs Voyage vs Cohere) place the SAME sentence at completely different coordinates — there's no universal embedding. Hard rule: must use the exact same embedding model for both stored documents and queries, or the comparison is meaningless (like comparing GPS coords to Minecraft coords).

## Relevance only appears at comparison time — cosine similarity
- Relevance is created by training (which arranged the vector space so related meanings land close together) but only MEASURED by cosine similarity (`dot(A,B) / (|A|*|B|)`) — a plain angle-between-two-vectors formula, computed after both vectors already exist independently.
- Cosine similarity itself has no idea what "relevant" means — it just reports geometry. It only produces a meaningful relevance score because the vectors it's comparing were placed by a model specifically trained for that geometry to correlate with meaning.
- Semantic search beats keyword search because it matches on this trained geometric closeness instead of literal shared words/tokens — catches synonyms/paraphrases keyword search misses (e.g. "refund" vs "reimbursement"), but loses exact-match precision on IDs/codes the model never learned to treat as distinct.

## `messages.create` vs `embed` — two different providers, two different jobs, fixed order
- `embed()` (OpenAI): text → vector, used for SEARCH/comparison only. Runs twice per RAG flow — once per document (ahead of time, at setup) and once per incoming query (every question, before searching).
- `messages.create()` (Anthropic/Claude): a CONVERSATION → TEXT answer, used for GENERATION only, and always LAST — after retrieval is already done. Claude never sees a vector or a similarity score, ever — only the plain retrieved TEXT gets pasted into its prompt.
- Fixed sequence per query: embed the query → compare against stored vectors (cosineSimilarity) → get back topK TEXT → build a new text prompt with that text as context → THEN call Claude.

## `topK`
- After scoring every stored doc against the query, sort by score descending, keep only the top K. Controls how much (and how relevant) context gets pasted into Claude's prompt — too small risks missing the right chunk, too large wastes tokens/dilutes attention with noise. K=3-5 is a common practical default.

## Vector database = my `store` array, industrial-strength
- My `example.js`'s plain `store` array + `.map().sort().slice()` IS a (tiny, brute-force) vector database — `addDocuments` = insert, `search` = nearest-neighbor query. Same concept, not a different one.
- Real vector DBs (Chroma/Qdrant/Pinecone) replace the full `.map()` scan (checks EVERY stored vector, O(N), too slow past thousands of entries) with an ANN index — commonly HNSW, a multi-layer graph of vectors linked to their nearest neighbors, searched via a greedy top-down walk that only touches a small subset of the data. This is WHY the result is "approximate" — the greedy walk can miss a true best match sitting outside the explored path. Same underlying math (cosine/dot-product/Euclidean), just organized to stay fast at scale.
- They also add persistence (survives a restart) and metadata filtering (e.g. "search only within category=billing") — neither of which a plain array gives me for free.

## The trap: high similarity score ≠ correct answer
- Near-duplicate flooding: repeated/boilerplate chunks can fill all topK slots with copies of the same passage instead of K genuinely different relevant ones.
- Topically-similar-but-wrong: "cancellation fee for Plan A" can score highly similar to a chunk about Plan B — same vocabulary/structure, wrong specific fact. The embedding captures topic, not the query's exact constraint. This gap (similarity vs correctness) is exactly what Day 4 (RAG Evaluation) exists to catch.

## Gap to close before Day 2 — chunking (mentioned, not yet explained)
- Theory.md flags that documents get split into small chunks before embedding (rather than embedding a whole doc at once), because a fixed-size vector diluting across too much text loses precision on specifics.
- Never actually walked through HOW/WHERE chunking happens or what "small enough" means in practice — this needs to be picked up explicitly in Day 2 (RAG Pipeline Architecture), which covers "chunking → embedding → retrieval → augmentation → generation" as its first step.

## Still need to cover / do
- Read Lessons.md sources ("text embeddings explained visually", Pinecone/Chroma/Qdrant intro docs) and log notes here.
- Run the 100-sentence embed + related/unrelated query experiment, visualize similarity scores.
- Run example.js for real (needs OPENAI_API_KEY) — including logging one real embedding vector's actual raw values, to see it's genuinely just numbers, not an abstraction.
- Week 4 Day 2: RAG Pipeline Architecture — starts with chunking, the gap flagged above.
