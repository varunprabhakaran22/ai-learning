# Day 1 — Embeddings & Vector Search

---

## ⓪ Start Here — the Problem That Makes Any of This Necessary

Before embeddings, vectors, or vector DBs mean anything, pin down the actual problem being solved, because every later section is just "how do we solve ⓪ well."

**The problem:** an LLM only knows what's in its training data (frozen at a cutoff date) plus whatever you type into the current prompt. If you want it to answer questions about *your* data — your company's docs, your codebase, a PDF you just got — you can't retrain the model every time your data changes. So instead, the pattern is: **find the small handful of relevant pieces of YOUR data, and paste them into the prompt** before asking the question. That's Retrieval-Augmented Generation (RAG) — "retrieval" is the finding part, "augmented generation" is pasting-then-asking.

```
User asks: "What's our refund policy for Plan A?"
                        │
                        ▼
        Step 1 (RETRIEVAL — this is Day 1's whole job):
        search through 10,000 stored documents/paragraphs,
        find the 3 that are actually about refunds/Plan A
                        │
                        ▼
        Step 2 (AUGMENTED GENERATION — Day 2 covers this):
        paste those 3 paragraphs into the prompt, THEN ask
        Claude the question — now it has the actual facts
```

**So the entire question Day 1 answers is: "given 10,000 stored pieces of text, how do I quickly find the 3 that are actually relevant to a query?"** Everything below — embeddings, vectors, cosine similarity, vector databases — exists purely as the answer to that one search problem. Keep re-anchoring to this if any later section feels abstract: it's all in service of "find the relevant paragraph, fast."

**Why not just use `Ctrl+F` / SQL `LIKE` for this?** Because exact/keyword matching fails the moment the user's wording doesn't match the document's wording — asking "how do I get a refund" won't find a paragraph that says "reimbursement process," even though it's the exact right answer. Solving THIS specific gap is what embeddings are for (② below).

---

## ① What a Vector Is, Physically — Before Embeddings Even Enter the Picture

Strip away "AI" for a second. A **vector**, in the plain math sense, is just a list of numbers, e.g. `[3, 7]`. You already have geometric intuition for this: `[3, 7]` can be plotted as a point on a 2D graph — 3 steps right, 7 steps up from the origin.

```
  y
  8 |
  7 |        • [3, 7]
  6 |
  5 |
  4 |
  3 |
  2 |
  1 |
  0 +---------------------- x
    0  1  2  3  4  5
```

Two points that are physically close together on that graph (e.g. `[3, 7]` and `[3.2, 6.9]`) are "similar" in an obvious, visual sense — small distance between them. Two points far apart (`[3, 7]` and `[20, 1]`) are "different." **This is the entire intuition the rest of Day 1 rests on** — everything from here on is this exact same idea, just with more numbers per point than 2, and applied to text instead of arbitrary dots.

**Why more than 2-3 numbers?** Because "meaning" has more independent aspects than a flat 2D graph can capture — topic, tone, formality, sentiment, subject matter, and hundreds of other learned aspects, each roughly corresponding to one number ("dimension") in the vector. A vector with 1536 numbers is a point in a 1536-dimensional space — impossible to literally draw, but mathematically no different from the 2D dot above: it's still just "a list of numbers representing a point," and "closeness between two points" is still a well-defined, computable thing (③ makes this exact).

---

## ② What an Embedding Is — Turning Text Into One of Those Points

An **embedding** is the specific vector you get when you feed a piece of text into a trained neural network built for this one job (an "embedding model" — e.g. OpenAI's `text-embedding-3-small`, or Voyage AI's `voyage-3`). Concretely:

```
embed("the cat sat on the mat")
  → [0.0123, -0.0456, 0.0891, ..., 0.0034]   ← a real array, e.g. 1536
                                                numbers long (exact count
                                                depends on which model
                                                you use — 1536, 1024,
                                                3072 are common)
```

That's it — the "embedding" is nothing but the output array. Not a metaphor, not "a representation of meaning" in some fuzzy sense — a literal array of floats you can `console.log` and inspect, same category of object as `[3, 7]` above, just with far more numbers.

**Where do the numbers come from — what is the model actually doing?** An embedding model is a transformer network (the same family of architecture as Claude, GPT, etc. — layers of attention + feed-forward math processing tokens). Normally a transformer's job is predicting the next token (that's how Claude generates text). An embedding model is trained differently: instead of using its internals to predict a next word, it takes the network's internal numeric state after processing the whole input (pooled/averaged across all the tokens it read) and returns THAT as the output vector. So the embedding is literally "a snapshot of what this specific neural network was internally computing while reading this text" — turned into a fixed-size list of numbers instead of a next-word prediction.

**Why does that snapshot end up meaning anything?** Only because of *how the model was trained* — this isn't automatic. Training uses millions of example pairs: sentences known to be similar (e.g. paraphrases, or a question next to its correct answer) are used to push the model toward producing close-together vectors for that pair, while unrelated sentence pairs get pushed toward far-apart vectors. This training method is called **contrastive learning** — "contrast" because every training step involves both a positive pair (pull together) and negative pairs (push apart). After enough of this, the model has learned an internal numeric layout where semantic closeness in the real world corresponds to spatial closeness in vector space. Similarity is a **learned side-effect of this training objective — not an inherent property of text or of neural networks in general.** A model trained on a different objective would place the exact same sentences at completely different, meaningless coordinates.

**One fixed size, no matter the input length.** `embed("cat")` and `embed("a 40-page document about cats")` both come back as the *same length* array (e.g. always 1536 numbers for that model) — a single word and an entire document both collapse down to one fixed-size point. This matters concretely: cramming too much text into one `embed()` call forces a huge amount of content to be squeezed into a fixed number of slots, diluting how much any one of those numbers can capture about specifics — this is exactly why real RAG pipelines split documents into small chunks before embedding them (Day 2's "chunking" step), rather than embedding a whole document at once.

---

## ③ Measuring "Closeness" Between Two Vectors — Cosine Similarity, the Actual Formula

Once text is turned into points (②), "find similar text" becomes "find points that are close together" — a concrete, computable geometry problem, not a vague AI concept. The standard way embedding search measures "close" is **cosine similarity**: the cosine of the angle between two vectors.

```
cosine_similarity(A, B) = dot(A, B) / (|A| * |B|)

dot(A, B)  = sum of (A[i] * B[i]) across every position i
|A|, |B|   = each vector's length/magnitude — sqrt(sum of A[i]^2)

Result range: -1 to 1
  1  → vectors point in the EXACT same direction (as similar as possible)
  0  → vectors are perpendicular (unrelated)
 -1  → vectors point in exactly opposite directions
```

**Why angle, not straight-line distance?** Straight-line distance would be thrown off by vector *length* — a longer sentence might naturally produce a "bigger" vector (larger magnitude) even when it's about the exact same topic as a shorter one. Cosine similarity deliberately ignores magnitude (that's what dividing by `|A| * |B|` does) and measures only *direction* — which is what actually correlates with the learned "meaning" from ②'s training process. In practice, embedding models are trained specifically so that this direction-only comparison works well; scores for genuinely related text typically land in a narrow positive band (commonly ~0.7-0.95), not spread evenly across -1 to 1.

**Concrete worked example, connecting straight back to ⓪'s actual problem:**

```
Query:  "How do I get a refund?"
Doc A:  "Steps to request a reimbursement for a cancelled order"
Doc B:  "How do I get a discount code applied to my cart?"

KEYWORD search (matches shared words/tokens):
  Doc A shares ZERO exact words with the query ("refund" ≠ "reimbursement")
    → scored LOW, might not be retrieved at all
  Doc B shares the literal phrase structure "how do I get a ___"
    → scored HIGH — WRONG document wins

SEMANTIC search (cosine similarity between embeddings):
  embed("refund") lands geometrically NEAR embed("reimbursement") —
  purely because contrastive training (②) pulled synonymous concepts
  close together, nothing to do with shared letters
    → Doc A scores HIGH (correct), Doc B scores LOWER
```

This is the concrete mechanism behind "semantic search beats keyword search" — it isn't a vague claim, it's this exact formula applied to vectors placed where training put them.

**Where keyword search still wins:** exact identifiers — order numbers, error codes, part numbers, anything the embedding model never learned to treat as meaningfully distinct (e.g. "invoice #INV-88213" vs "#INV-88214" might embed almost identically, since the model was never trained to care about that one-digit difference). Embeddings compress meaning, which is precisely what throws away exact-match precision. This is why production systems often combine both (hybrid search) — covered as "advanced retrieval strategies" in Day 3, not a Day 1 requirement.

---

## ④ Why You Need a "Vector Database" at All — the Scale Problem

Everything in ③ works perfectly with 5 documents: embed all 5, embed the query, compute cosine similarity against each of the 5, sort, done. The problem is scale: real systems have thousands to millions of stored chunks, and comparing a query against *every single one* every time (a brute-force scan) gets slow.

```
Brute force (comparing against every stored vector):
  cost grows linearly with how much you've stored — call it O(N)
  — perfectly fine for a few thousand vectors (Day 1's showcase task
  scale), genuinely too slow once you're at millions

A vector database's actual job:
  pre-organize stored vectors at INSERT time into a structure that
  lets a query check only a SMALL SUBSET of them, not all of them
  — this pre-organization is called an index, same general idea as
  a database index on a normal SQL column, just built for
  "nearest neighbor in high-dimensional space" instead of "exact
  match on a value"
```

**The specific technique most local vector DBs (Chroma, Qdrant) use by default: HNSW — Hierarchical Navigable Small World graphs.** Mechanically: every stored vector becomes a node in a graph, connected to a handful of its nearest neighbor vectors (not all of them). The graph has multiple layers — the top layer has very few nodes with long-distance connections (for fast, coarse jumps across the whole space), and lower layers have progressively more nodes with short-distance connections (for fine-grained precision). A search starts at an entry point in the top layer and **greedily walks toward whichever connected neighbor is closest to the query vector**, dropping down a layer each time it stops improving, until it converges on a small handful of close candidates near the bottom layer — all without ever touching most of the dataset.

**Why this makes the result "approximate," not exact:** the greedy walk can get stuck exploring one region of the graph and completely miss a true best match that happens to sit in a different, unexplored region. This is a deliberate, tunable trade-off — more graph connections per node = higher accuracy but slower search and more memory; fewer connections = faster but occasionally wrong. This is precisely what "ANN" stands for — **Approximate Nearest Neighbor** — as opposed to guaranteed-exact nearest neighbor (which is what brute force gives you, just slowly).

**Concretely, what the showcase task is asking you to do:** call `chroma.query(queryVector, topK)` (or Qdrant's equivalent) and the library runs this exact HNSW graph walk internally — it is not a black box magic trick, it's this specific graph-traversal algorithm, doing the same cosine-similarity comparison from ③, just against a small smart subset of vectors instead of all of them.

---

## ⑤ The Trap: a Good Similarity Score Is Not the Same Claim as "This Is the Right Answer"

Everything above computes and returns a similarity *score* — a number describing geometric closeness. It is easy to mistake a high score for a guarantee of correctness. It is not. Two concrete, named failure modes:

```
Failure 1 — near-duplicate flooding:
  If your stored data has 5 near-identical chunks (a document
  embedded twice by accident, or repeated boilerplate text across
  many pages), your top-K results fill up with near-copies of the
  SAME passage — instead of K genuinely different relevant passages.
  The similarity math did its job correctly; your DATA had a problem.

Failure 2 — high similarity, wrong specific fact:
  Query: "What is the cancellation fee for Plan A?"
  A chunk about "the cancellation fee for Plan B" uses almost
  identical vocabulary and sentence structure — it will score HIGH,
  despite answering the wrong plan entirely. The embedding captured
  TOPIC similarity (fee, cancellation, plan), not the specific
  constraint (A, not B) that actually determines correctness.
```

Both failures happen with the math working exactly as designed — cosine similarity did correctly measure geometric closeness in both cases. The gap is between "close in vector space" and "actually the correct answer to this specific query," and closing that gap is the entire subject of Day 4 ("RAG Evaluation") — a top-K retrieval call succeeding is not the same claim as the system being correct, and that gap is where most real-world RAG bugs live.

---

## Summary — the Full Chain, ⓪ Through ⑤

```
⓪ The problem:     LLMs don't know your private/current data — find
                    the few relevant pieces of it and paste them into
                    the prompt before asking (RAG).

① A vector:        just a list of numbers = a point in space. Close
                    points = similar; far points = different. (Plain
                    math, nothing AI-specific yet.)

② An embedding:     a vector produced by feeding text through a neural
                    net trained via contrastive learning, so that
                    LEARNED semantic similarity becomes spatial
                    closeness. Fixed size regardless of input length.

③ Cosine            the actual formula measuring closeness between two
   similarity:       vectors — angle-based, ignores magnitude, range
                    -1 to 1. This is HOW semantic search beats keyword
                    search: matching by meaning-driven proximity
                    instead of literal shared words.

④ Vector DB /       once you have too many vectors to brute-force
   ANN / HNSW:       compare against every query, an ANN index (HNSW
                    graph traversal is the common one) trades a small,
                    tunable accuracy loss for large speed gains.

⑤ The catch:        a high similarity score means "geometrically
                    close," not "factually correct" — near-duplicates
                    and topically-similar-but-wrong chunks both score
                    well. Day 4 (RAG Evaluation) exists because of
                    exactly this gap.
```

---

*Next: Lessons.md — "text embeddings explained visually", Pinecone/Chroma/Qdrant intro docs, and the 100-sentence embed + similarity-score experiment*
