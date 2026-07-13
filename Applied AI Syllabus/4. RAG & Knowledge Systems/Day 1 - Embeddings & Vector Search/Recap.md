# Day 1 Recap — Embeddings & Vector Search

## The actual problem (why any of this exists)
An LLM only knows its frozen training data plus whatever text is pasted into the current prompt — it has zero exposure to private/current data (your docs, your codebase), not just a weaker understanding of it. You can't paste every document into every prompt: there's a hard context-window token limit, and even below that limit it's slower, costlier, and dilutes the model's attention with mostly-irrelevant content. RAG's actual job: out of thousands of documents, find the FEW that are actually relevant to this question, and paste only those into the prompt. Embeddings and vector search are the "find the few relevant ones, fast" mechanism — nothing more mystical than that.

## Vector — plain math, no AI yet
A vector is just a list of numbers, e.g. `[3, 7]` — a point you could plot on a graph. Close points are similar; far points are different. This idea alone has nothing to do with AI — it only becomes "embeddings" once the numbers come from a trained model (next section). Individual numbers inside a real embedding vector aren't independently labeled ("this number = formality") — each is just whatever value a specific trained neuron settled on, meaningless alone, only meaningful when comparing two full vectors against each other.

## Embedding — a trained model's fixed function, not a live decision
`embed(text)` sends text through an already-trained neural network (e.g. OpenAI's `text-embedding-3-small`) and returns one vector — same length every time regardless of input length (one word or 40 pages → same-size array). Training already happened, once, in the past, via contrastive learning: millions of known-similar pairs nudged closer together, known-unrelated pairs nudged farther apart, via gradient descent, repeated millions of times. Calling `embed()` never trains or nudges anything — it only runs the finished, frozen model.

`embed(oneDocument)` never compares against a query or "how relevant" anything — it's a single-input, deterministic calculation using fixed trained weights; relevance doesn't exist yet at this step. Embedding models are different from chat LLMs — smaller, separate, trained only to produce vectors, never to converse, which is why Claude has no embedding API at all.

Different embedding models (OpenAI vs Voyage vs Cohere) place the same sentence at completely different coordinates — there's no universal embedding space. Hard rule: the exact same embedding model must be used for both stored documents and queries, or the comparison is meaningless (like comparing GPS coordinates to Minecraft coordinates).

## Relevance only appears at comparison time — cosine similarity
Relevance is created by training (which arranged the vector space so related meanings land close together) but only measured by cosine similarity — `dot(A,B) / (|A|*|B|)`, a plain angle-between-two-vectors formula, computed after both vectors already exist independently. Cosine similarity itself has no idea what "relevant" means — it just reports geometry; it only produces a meaningful relevance score because the vectors it's comparing were placed by a model specifically trained for that geometry to correlate with meaning. Semantic search beats keyword search because it matches on this trained geometric closeness instead of literal shared words/tokens — catches synonyms/paraphrases keyword search misses ("refund" vs "reimbursement"), but loses exact-match precision on IDs/codes the model never learned to treat as distinct.

## `messages.create` vs `embed` — two providers, two jobs, fixed order
`embed()` (OpenAI): text → vector, used for search/comparison only. Runs twice per RAG flow — once per document (ahead of time, at setup) and once per incoming query (every question, before searching). `messages.create()` (Anthropic/Claude): a conversation → text answer, used for generation only, and always last, after retrieval is already done — Claude never sees a vector or a similarity score, only the plain retrieved text gets pasted into its prompt. Fixed sequence per query: embed the query → compare against stored vectors → get back topK text → build a new text prompt with that text as context → then call Claude.

## `topK`
After scoring every stored doc against the query, sort by score descending, keep only the top K. Controls how much (and how relevant) context gets pasted into Claude's prompt — too small risks missing the right chunk, too large wastes tokens/dilutes attention with noise. K=3-5 is a common practical default.

## Vector database = your `store` array, industrial-strength
A plain `store` array + `.map().sort().slice()` IS a (tiny, brute-force) vector database — `addDocuments` = insert, `search` = nearest-neighbor query, same concept, not a different one. Real vector DBs (Chroma/Qdrant/Pinecone) replace the full `.map()` scan (checks every stored vector, O(N), too slow past thousands of entries) with an ANN index — commonly HNSW, a multi-layer graph of vectors linked to their nearest neighbors, searched via a greedy top-down walk that only touches a small subset of the data. This is why the result is "approximate" — the greedy walk can miss a true best match sitting outside the explored path. Same underlying math (cosine/dot-product/Euclidean), just organized to stay fast at scale. Real vector DBs also add persistence (survives a restart) and metadata filtering (e.g. "search only within category=billing") — neither of which a plain array gives for free.

## The trap: high similarity score ≠ correct answer
Two named failure modes where the math works exactly as designed but the result is still wrong:
- **Near-duplicate flooding** — repeated/boilerplate chunks can fill all topK slots with copies of the same passage instead of K genuinely different relevant ones.
- **Topically-similar-but-wrong** — "cancellation fee for Plan A" can score highly similar to a chunk about Plan B — same vocabulary/structure, wrong specific fact. The embedding captures topic, not the query's exact constraint.

This gap between "geometrically close" and "factually correct" is exactly what Day 4 (RAG Evaluation) exists to catch — retrieval succeeding at the similarity math isn't the same claim as the system being correct.

## Still need to cover / do
- Read Lessons.md sources ("text embeddings explained visually", Pinecone/Chroma/Qdrant intro docs) and log notes here.
- Run the 100-sentence embed + related/unrelated query experiment, visualize similarity scores.
- Run example.js for real (needs OPENAI_API_KEY) — including logging one real embedding vector's actual raw values, to see it's genuinely just numbers, not an abstraction.
- RAG & Knowledge Systems Day 2 — RAG Pipeline Architecture — starts with chunking, a gap this day flagged but didn't explain.
