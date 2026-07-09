// Day 1 showcase: an EmbeddingSearch utility — embeds documents, stores
// them in a local vector store, returns top-K most relevant chunks for
// a query. The vector "database" here is a plain in-memory array +
// brute-force cosine similarity (Theory.md fact 3's baseline) — small
// enough to see every step; swap in Chroma/Qdrant once the concept is
// solid and the dataset is bigger than a brute-force scan can handle.
//
//   Documents                          Query
//      │                                 │
//      ▼                                 ▼
//  embed(doc) for each doc         embed(query)
//      │                                 │
//      ▼                                 │
//  [{doc, vector}, ...]  ◄── stored ──►  queryVector
//      │                                 │
//      └───────────────┬─────────────────┘
//                       ▼
//         cosine similarity(queryVector, each stored vector)
//                       │
//                       ▼
//         sort by score DESC, take top K
//                       │
//                       ▼
//              [{doc, score}, ...]  ← returned to caller

const OpenAI = require("openai");
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const EMBEDDING_MODEL = "text-embedding-3-small";

// Theory.md fact 1: an embedding is just a fixed-length float array —
// this function is the ONLY place that turns text into that array.
async function embed(text) {
  const response = await openai.embeddings.create({ model: EMBEDDING_MODEL, input: text });
  return response.data[0].embedding;
}

// Theory.md fact 2: cosine similarity — dot(A,B) / (|A| * |B|) — the
// fixed formula that measures the angle between two vectors, regardless
// of which model produced them.
function cosineSimilarity(a, b) {
  let dot = 0, magA = 0, magB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    magA += a[i] * a[i];
    magB += b[i] * b[i];
  }
  return dot / (Math.sqrt(magA) * Math.sqrt(magB));
}

// Theory.md fact 3: this is a BRUTE-FORCE store (checks every vector,
// O(N) per query) — real vector DBs (Chroma/Qdrant) replace this loop
// with an ANN index (e.g. HNSW) so it stays fast past a few thousand
// entries. The similarity math itself doesn't change, only how many
// vectors get compared before returning an answer.
function createEmbeddingSearch() {
  const store = []; // [{ text, vector }]

  return {
    async addDocuments(texts) {
      for (const text of texts) {
        const vector = await embed(text);
        store.push({ text, vector });
      }
    },
    async search(query, topK = 3) {
      const queryVector = await embed(query);
      return store
        .map(({ text, vector }) => ({ text, score: cosineSimilarity(queryVector, vector) }))
        .sort((a, b) => b.score - a.score)
        .slice(0, topK);
    },
  };
}

(async () => {
  const search = createEmbeddingSearch();

  await search.addDocuments([
    "Steps to request a reimbursement for a cancelled order",
    "How do I get a discount code applied to my cart?",
    "The cancellation fee for Plan A is $10 per month",
    "The cancellation fee for Plan B is $25 per month",
    "Our office is located in downtown Chennai",
  ]);

  // Theory.md fact 2's exact example: semantic search should surface the
  // refund doc despite ZERO shared words with the query ("refund" vs
  // "reimbursement") — a keyword search would likely miss this entirely.
  console.log("Query: 'How do I get a refund?'");
  console.log(await search.search("How do I get a refund?", 2));

  // Theory.md fact 4's failure mode: both Plan A/B cancellation-fee docs
  // will score highly similar to each other for this query — inspect
  // the scores to see how CLOSE they are despite one being the wrong answer.
  console.log("\nQuery: 'What is the cancellation fee for Plan A?'");
  console.log(await search.search("What is the cancellation fee for Plan A?", 2));
})();
