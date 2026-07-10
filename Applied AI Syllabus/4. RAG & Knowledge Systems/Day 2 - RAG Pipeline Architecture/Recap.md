# Day 2 Recap — RAG Pipeline Architecture

## Chunking — the gap Day 1 left open
- A fixed-size embedding (e.g. 1536 numbers) blending across a whole document dilutes specific facts into a vague average. Chunking = split BEFORE embedding, once, at ingestion time, so each vector represents one small specific piece of meaning.
- Fixed-size chunking is a blind substring cut (`text.slice(0, 500)...`) — no understanding of meaning. This can slice a fact in half across a boundary.
- Overlap (repeating the last N tokens of the previous chunk at the start of the next) doesn't eliminate the boundary problem, just makes it statistically rare.
- Better than fixed-size: split on natural boundaries (paragraph/sentence/heading) so a fact is never cut in the first place — LangChain's `RecursiveCharacterTextSplitter` tries paragraph → sentence → hard cut, in that fallback order.
- Chunk size is a trade-off, not a fixed number: too small = precise but no surrounding context; too large = back to the dilution problem. Common practical range: 200–1000 tokens, 10–20% overlap — found by testing (Day 4), not guessed.

## Dimensionality is model-specific, not universal
- 1536 is just OpenAI `text-embedding-3-small`'s choice, baked into that model's architecture at training time. Other models: `text-embedding-3-large` → 3072, Cohere → 1024, Voyage → 1024, Google → 768.
- More dimensions ≠ automatically better — it's a cost/nuance trade-off the model creator picked.
- Consequence: vectors from different-dimension models can't even be compared positionally — not just "different coordinates" (Day 1) but literally different-sized coordinate systems.

## Ecosystem jargon (Transformer / Hugging Face / LangChain / LangGraph / LangSmith)
Moved to the syllabus's own Jargon Decoder table (`Syllabus/AI.md`), where these terms already lived — added a "private mental-map hook" column there instead of duplicating a new table here. Today's pipeline (chunk → embed → store → retrieve → augment → generate) is a straight line, which is LangChain's shape; an agent that must branch/loop needs LangGraph instead.

## The two flows — setup vs query
- **Setup flow** (once per document, offline): chunk → embed each chunk → store `{vector, text, metadata}`.
- **Query flow** (every question, real-time): embed question → cosine similarity vs stored vectors → topK text → augment into a prompt → generate via Claude.
- RAG feels fast at query time because the expensive part (embedding every chunk of every document) already happened ahead of time — query time only embeds ONE thing, the question.

## Why the vector DB stores text too, not just the vector
- Embedding is one-directional — no `unembed(vector)` exists to recover the original text. Storing only the vector would make retrieval return meaningless numbers.
- **Vector = the index** (only thing cosine similarity touches). **Text = the payload** (what actually gets pasted into Claude's prompt).
- A vector DB record is a normal row `{id, vector, text, metadata}` — querying is (1) similarity search on the vector column → matching IDs, (2) look up those IDs → return the full row. One system, not two.

## Metadata
- Extra structured tags NOT embedded, but available for filtering: `source`, `page`, `category`, `documentId`, domain tags like `plan: "A"`.
- Concrete use: cosine similarity can't tell Plan A's fee chunk from Plan B's (same vocab/structure) — but `metadata: {plan: "A"}` enables a **filtered search** (exact-match filter + semantic similarity combined), which is what "real vector DBs give you metadata filtering for free" (Day 1) actually means mechanically.

## Augmentation — fully developer-owned, no library magic
- There is no hidden "augmentation service." It's plain string concatenation: retrieved text (always plain text, never a vector — Claude never sees vectors) + the question, interpolated into one prompt template, before `messages.create()`.
- Two deliberate instructions belong in that template: (1) a grounding instruction ("use ONLY the context below") — without it, Claude blends in outside training knowledge and faithfulness breaks; (2) a fallback instruction ("say you don't know if the context doesn't have it") — without it, Claude tries to answer from irrelevant retrieved chunks instead of admitting the gap, which is the actual mechanism behind most RAG hallucination.
- Chunk separators matter: never `chunks.join(" ")` — always join with a visible, labeled separator (ideally the real source filename from metadata), or multiple chunks read as one garbled blob once topK grows.

## Stale index cleanup is manual
- The vector DB has no concept of "this source document changed" — it only holds rows you explicitly inserted.
- Fix: tag every chunk with a `documentId` in metadata at ingestion time, so an update can `delete({where: {documentId: ...}})` the old chunks before re-inserting the new version. Without that tag stored up front, there's no clean way to find "every chunk from this document" later.

## Where each pipeline step can fail (the actual point of the day)
- Chunking: too large → dilution; too small → missing context; mid-fact split with poor overlap → fact unrecoverable no matter how good retrieval is downstream.
- Embedding: model mismatch between ingestion and query time → similarity becomes meaningless, silently, no error thrown.
- Retrieval: topK too small/large, near-duplicate flooding, stale index.
- Augmentation: missing grounding/fallback instructions, unlabeled chunk boundaries.
- Generation: Claude can still misweight even perfect context — a distinct failure category from retrieval handing it the wrong context, which is why Day 4 needs 3 separate metrics (faithfulness, relevance, context recall), not one.
- Debugging a wrong RAG answer = walk the pipeline stage by stage, not treat RAG as one opaque black box.

## Still need to cover / do
- Read Lessons.md sources ("RAG pipeline production best practices", "chunking strategies for RAG").
- Run the no-context / bad-chunks / good-chunks experiment and log the quality difference.
- Run `example.js` for real (needs OPENAI_API_KEY + ANTHROPIC_API_KEY).
- RAG & Knowledge Systems Day 3 — Advanced Retrieval Strategies — hybrid search, re-ranking, parent-child chunking, HyDE.
