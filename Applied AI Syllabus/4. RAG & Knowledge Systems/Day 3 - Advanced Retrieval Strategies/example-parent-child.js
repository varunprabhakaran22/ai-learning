// Day 3 extra: parent-child chunking, hand-rolled — two SEPARATE storage
// systems, exactly like LangChain's real ParentDocumentRetriever pattern
// (vectorstore for children + docstore for parents), so the storage split
// is visible instead of hidden inside a library class.
//
//   Raw document
//        │
//        ▼
//   split into PARENT chunks (large, e.g. 1000 chars)
//        │
//        ├──────────────────────────────────┐
//        ▼                                    ▼
//   parentStore[parentId] = fullText    split PARENT further into
//   (plain object — NOT embedded,        CHILD chunks (small, e.g. 150 chars)
//    NOT in the vector DB at all)              │
//                                               ▼
//                                         embed(childText)
//                                               │
//                                               ▼
//                                    vectorStore.push({ id, vector, text,
//                                      metadata: { parentId } })
//
//   ── query time ──
//   embed(query) → cosine similarity vs vectorStore (CHILDREN ONLY)
//        │
//        ▼
//   best-matching child → read its metadata.parentId
//        │
//        ▼
//   parentStore[parentId]  ← plain lookup, NOT a similarity search
//        │
//        ▼
//   FULL parent text → this is what goes to augmentation, not the child text

const OpenAI = require("openai");
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const EMBEDDING_MODEL = "text-embedding-3-small";

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

// blind fixed-size split — same mechanism as Day 2's chunkText, reused
// here at two different sizes for two different jobs.
function splitFixed(text, size) {
  const pieces = [];
  for (let i = 0; i < text.length; i += size) pieces.push(text.slice(i, i + size).trim());
  return pieces.filter(Boolean);
}

function createParentChildStore() {
  const parentStore = {};   // { parentId: fullParentText } — plain object, no vectors, no search
  const vectorStore = [];   // [{ id, vector, text, metadata: { parentId } }] — CHILDREN ONLY

  return {
    parentStore,
    vectorStore,

    async ingest(documents, { parentSize = 400, childSize = 100 } = {}) {
      let parentCounter = 0;
      let childCounter = 0;

      for (const doc of documents) {
        const parents = splitFixed(doc, parentSize);

        for (const parentText of parents) {
          const parentId = `p${parentCounter++}`;
          parentStore[parentId] = parentText; // parent lives here — never embedded

          const children = splitFixed(parentText, childSize);
          for (const childText of children) {
            const vector = await embed(childText); // only CHILD text gets embedded
            vectorStore.push({
              id: `c${childCounter++}`,
              vector,
              text: childText,
              metadata: { parentId }, // the ONLY link between the two stores
            });
          }
        }
      }
    },

    async query(question, topK = 2) {
      const queryVector = await embed(question);

      const bestChildren = vectorStore
        .map((child) => ({ ...child, score: cosineSimilarity(queryVector, child.vector) }))
        .sort((a, b) => b.score - a.score)
        .slice(0, topK);

      // the actual parent-child step: swap each child's small text for its
      // parent's full text via a plain lookup — NOT another similarity search
      return bestChildren.map((child) => ({
        matchedChildText: child.text,       // what search actually matched on
        score: child.score,
        parentId: child.metadata.parentId,
        fullContextSentToClaude: parentStore[child.metadata.parentId], // what augmentation gets
      }));
    },
  };
}

(async () => {
  const store = createParentChildStore();

  await store.ingest(
    [
      "The cancellation fee for Plan A is $10 per month. This fee applies within the first year only. " +
        "After 12 months, cancellation is free of charge. Plan A also includes a 14-day grace period. " +
        "Customers on Plan A can also downgrade at any time without penalty.",
    ],
    { parentSize: 250, childSize: 60 }
  );

  console.log("Parent store (full docs, never embedded):");
  console.log(store.parentStore);

  console.log("\nVector store (small children, the ONLY thing searched):");
  console.log(store.vectorStore.map((c) => ({ id: c.id, text: c.text, parentId: c.metadata.parentId })));

  const results = await store.query("What is the grace period for Plan A?");
  console.log("\nQuery results — note matchedChildText is SMALL, fullContextSentToClaude is the FULL parent:");
  console.log(JSON.stringify(results, null, 2));
})();
