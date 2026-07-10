// Day 2 showcase: a RAGPipeline utility — full flow from raw document
// text to a grounded, generated answer. Extends Day 1's EmbeddingSearch
// with the two steps Day 1 skipped: CHUNKING (before embedding) and
// AUGMENTATION (between retrieval and generation).
//
//   SETUP FLOW (once per document)         QUERY FLOW (once per question)
//   ───────────────────────────────        ──────────────────────────────
//   raw text                                user question
//      │                                        │
//      ▼                                        ▼
//   chunk(text)                             embed(question)
//      │                                        │
//      ▼                                        ▼
//   embed(chunk) per chunk               cosine similarity vs
//      │                                 every stored chunk vector
//      ▼                                        │
//   store {text, vector}                        ▼
//                                          topK chunk texts
//                                                │
//                                                ▼
//                                          augment(question, chunks)
//                                                │
//                                                ▼
//                                          messages.create() → answer

const OpenAI = require("openai");
const Anthropic = require("@anthropic-ai/sdk");

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const EMBEDDING_MODEL = "text-embedding-3-small";
const CLAUDE_MODEL = "claude-sonnet-5";

// Theory.md ①: split on sentence boundaries first, with overlap, so a
// fact is never cut in half across a chunk boundary if avoidable. This
// is a small hand-rolled version of what LangChain's RecursiveCharacterTextSplitter
// does — real chunk sizes are usually 200-1000 TOKENS, not characters;
// characters are used here only to keep the demo dependency-free.
function chunkText(text, chunkSize = 120, overlap = 30) {
  const sentences = text.split(/(?<=[.!?])\s+/);
  const chunks = [];
  let current = "";

  for (const sentence of sentences) {
    if ((current + " " + sentence).length > chunkSize && current) {
      chunks.push(current.trim());
      // overlap: carry the tail of the previous chunk into the next one
      current = current.slice(-overlap) + " " + sentence;
    } else {
      current += " " + sentence;
    }
  }
  if (current.trim()) chunks.push(current.trim());
  return chunks;
}

async function embed(text) {
  const response = await openai.embeddings.create({ model: EMBEDDING_MODEL, input: text });
  return response.data[0].embedding;
}

function cosineSimilarity(a, b) {
  let dot = 0, magA = 0, magB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    magA += a[i] * a[i];
    magB += b[i] * b[i];
  }
  return dot / (Math.sqrt(magA) * Math.sqrt(magB));
}

// Theory.md ③: the step Day 1 skipped — build the actual prompt string
// that gets sent to Claude, with an explicit grounding instruction and
// an explicit fallback instruction. Both are deliberate failure-mode
// guards, not boilerplate.
function augment(question, chunks) {
  const context = chunks.map((c, i) => `--- Chunk ${i + 1} ---\n${c.text}`).join("\n\n");
  return `You are a support assistant. Answer the question using ONLY the context below.
If the context doesn't contain the answer, say "I don't have that information."

Context:
${context}

Question: ${question}`;
}

function createRAGPipeline({ chunkSize = 120, overlap = 30, topK = 3 } = {}) {
  const store = []; // [{ text, vector }]

  return {
    async ingest(documents) {
      for (const doc of documents) {
        const chunks = chunkText(doc, chunkSize, overlap);
        for (const text of chunks) {
          const vector = await embed(text);
          store.push({ text, vector });
        }
      }
    },

    async query(question) {
      const queryVector = await embed(question);
      const topChunks = store
        .map(({ text, vector }) => ({ text, score: cosineSimilarity(queryVector, vector) }))
        .sort((a, b) => b.score - a.score)
        .slice(0, topK);

      const prompt = augment(question, topChunks);

      const response = await anthropic.messages.create({
        model: CLAUDE_MODEL,
        max_tokens: 300,
        messages: [{ role: "user", content: prompt }],
      });

      return { answer: response.content[0].text, retrievedChunks: topChunks, prompt };
    },
  };
}

(async () => {
  const pipeline = createRAGPipeline({ chunkSize: 100, overlap: 20, topK: 2 });

  await pipeline.ingest([
    "The cancellation fee for Plan A is $10 per month. This fee applies within the first year only. " +
      "After 12 months, cancellation is free of charge. Plan A also includes a 14-day grace period.",
    "The cancellation fee for Plan B is $25 per month. This is higher than Plan A because Plan B includes " +
      "premium support. Plan B has no grace period.",
    "Refunds for cancelled orders are processed within 5-7 business days. Contact support to start a refund request.",
  ]);

  const result = await pipeline.query("What is the cancellation fee for Plan A?");
  console.log("Answer:", result.answer);
  console.log("\nRetrieved chunks:", result.retrievedChunks.map((c) => c.text));
})();
