// Day 3 showcase: upgrade Day 2's RAGPipeline with hybrid search
// (BM25 + semantic) and a re-ranking step. Benchmarks basic retrieval
// vs advanced retrieval on the exact Plan A / Plan B trap named since
// Day 1 — both plans share vocabulary, so pure cosine similarity
// struggles to tell them apart.
//
//   User question
//        │
//        ▼
//   embed(question) ──────────┐
//        │                    │
//        ▼                    ▼
//   cosine similarity     BM25 score
//   vs every chunk         vs every chunk
//        │                    │
//        └────────┬───────────┘
//                  ▼
//         combine into hybrid score
//         (normalize both, weighted sum)
//                  │
//                  ▼
//         top 20 candidates (wide net)
//                  │
//                  ▼
//         RE-RANK: ask Claude to score each
//         candidate's relevance to the exact question
//         (stand-in for a dedicated cross-encoder model)
//                  │
//                  ▼
//         top K after re-ranking (narrow, precise)
//                  │
//                  ▼
//         augment(question, topK) → generate

const OpenAI = require("openai");
const Anthropic = require("@anthropic-ai/sdk");

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const EMBEDDING_MODEL = "text-embedding-3-small";
const CLAUDE_MODEL = "claude-sonnet-5";

function chunkText(text, chunkSize = 120, overlap = 30) {
  const sentences = text.split(/(?<=[.!?])\s+/);
  const chunks = [];
  let current = "";
  for (const sentence of sentences) {
    if ((current + " " + sentence).length > chunkSize && current) {
      chunks.push(current.trim());
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

// Theory.md ①: BM25 — term frequency (capped), inverse document
// frequency (rare terms score higher), length normalization. This is a
// minimal hand-rolled version; real systems use a library (e.g. `bm25`
// npm package or Elasticsearch's built-in BM25) at scale.
function tokenize(text) {
  return text.toLowerCase().match(/[a-z0-9]+/g) || [];
}

function bm25Scores(query, documents, { k1 = 1.5, b = 0.75 } = {}) {
  const queryTerms = tokenize(query);
  const docTokens = documents.map(tokenize);
  const avgDocLen = docTokens.reduce((sum, t) => sum + t.length, 0) / docTokens.length;

  const docFreq = {}; // how many documents contain this term at least once
  for (const tokens of docTokens) {
    const seen = new Set(tokens);
    for (const term of seen) docFreq[term] = (docFreq[term] || 0) + 1;
  }
  const N = documents.length;

  return docTokens.map((tokens) => {
    const termCounts = {};
    for (const t of tokens) termCounts[t] = (termCounts[t] || 0) + 1;

    let score = 0;
    for (const term of queryTerms) {
      const tf = termCounts[term] || 0;
      if (tf === 0) continue;
      const df = docFreq[term] || 0;
      const idf = Math.log((N - df + 0.5) / (df + 0.5) + 1); // rare terms → higher idf
      const lengthNorm = 1 - b + b * (tokens.length / avgDocLen);
      score += idf * ((tf * (k1 + 1)) / (tf + k1 * lengthNorm)); // diminishing returns on tf
    }
    return score;
  });
}

function normalize(scores) {
  const max = Math.max(...scores);
  const min = Math.min(...scores);
  if (max === min) return scores.map(() => 0);
  return scores.map((s) => (s - min) / (max - min));
}

// Theory.md ①: hybrid = normalize both score lists onto 0-1, then
// weighted-sum them. alpha=1 is pure semantic, alpha=0 is pure BM25.
function hybridSearch(queryVector, query, store, { topN = 20, alpha = 0.5 } = {}) {
  const semanticScores = store.map(({ vector }) => cosineSimilarity(queryVector, vector));
  const keywordScores = bm25Scores(query, store.map((s) => s.text));

  const normSemantic = normalize(semanticScores);
  const normKeyword = normalize(keywordScores);

  return store
    .map((chunk, i) => ({
      ...chunk,
      score: alpha * normSemantic[i] + (1 - alpha) * normKeyword[i],
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, topN);
}

// Theory.md ②: re-ranking — a slower, precise second pass on a small
// shortlist. A real system would use a dedicated cross-encoder model
// (e.g. Cohere Rerank, a local cross-encoder). Here Claude itself plays
// that role: given the query AND one candidate TOGETHER, score relevance
// 0-10 — this is the cross-encoder property (seeing both texts jointly,
// not independently) even though the underlying model is a chat LLM.
async function rerank(query, candidates, topK = 3) {
  const scored = await Promise.all(
    candidates.map(async (candidate) => {
      const response = await anthropic.messages.create({
        model: CLAUDE_MODEL,
        max_tokens: 10,
        messages: [
          {
            role: "user",
            content: `Question: "${query}"\nPassage: "${candidate.text}"\n\nOn a scale of 0-10, how directly does this passage answer the question? Reply with ONLY the number.`,
          },
        ],
      });
      const rerankScore = parseFloat(response.content[0].text.trim()) || 0;
      return { ...candidate, rerankScore };
    })
  );

  return scored.sort((a, b) => b.rerankScore - a.rerankScore).slice(0, topK);
}

function augment(question, chunks) {
  const context = chunks.map((c, i) => `--- Chunk ${i + 1} ---\n${c.text}`).join("\n\n");
  return `You are a support assistant. Answer the question using ONLY the context below.
If the context doesn't contain the answer, say "I don't have that information."

Context:
${context}

Question: ${question}`;
}

async function generate(question, chunks) {
  const prompt = augment(question, chunks);
  const response = await anthropic.messages.create({
    model: CLAUDE_MODEL,
    max_tokens: 300,
    messages: [{ role: "user", content: prompt }],
  });
  return response.content[0].text;
}

function createAdvancedRAGPipeline({ chunkSize = 120, overlap = 30, topK = 3, alpha = 0.5 } = {}) {
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

    // basic = Day 2's method: pure cosine similarity, no re-ranking
    async queryBasic(question) {
      const queryVector = await embed(question);
      const topChunks = store
        .map(({ text, vector }) => ({ text, score: cosineSimilarity(queryVector, vector) }))
        .sort((a, b) => b.score - a.score)
        .slice(0, topK);
      return { answer: await generate(question, topChunks), retrievedChunks: topChunks };
    },

    // advanced = hybrid search (wide net) → re-rank (narrow, precise)
    async queryAdvanced(question) {
      const queryVector = await embed(question);
      const candidates = hybridSearch(queryVector, question, store, { topN: 20, alpha });
      const topChunks = await rerank(question, candidates, topK);
      return { answer: await generate(question, topChunks), retrievedChunks: topChunks };
    },
  };
}

(async () => {
  const pipeline = createAdvancedRAGPipeline({ chunkSize: 100, overlap: 20, topK: 2, alpha: 0.5 });

  await pipeline.ingest([
    "The cancellation fee for Plan A is $10 per month. This fee applies within the first year only. " +
      "After 12 months, cancellation is free of charge. Plan A also includes a 14-day grace period.",
    "The cancellation fee for Plan B is $25 per month. This is higher than Plan A because Plan B includes " +
      "premium support. Plan B has no grace period.",
    "Refunds for cancelled orders are processed within 5-7 business days. Contact support to start a refund request.",
    "Order #A4471-X shipped on schedule. Order #B2290-Y is delayed due to warehouse backlog.",
  ]);

  const queries = [
    "What is the cancellation fee for Plan A?",
    "What's the status of order #A4471-X?",
  ];

  for (const question of queries) {
    console.log(`\n=== Query: "${question}" ===`);

    const basic = await pipeline.queryBasic(question);
    console.log("\n[BASIC — cosine similarity only]");
    console.log("Answer:", basic.answer);
    console.log("Retrieved:", basic.retrievedChunks.map((c) => c.text));

    const advanced = await pipeline.queryAdvanced(question);
    console.log("\n[ADVANCED — hybrid search + re-rank]");
    console.log("Answer:", advanced.answer);
    console.log("Retrieved:", advanced.retrievedChunks.map((c) => c.text));
  }
})();
