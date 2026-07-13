// Day 4 showcase: a RAGEvaluator — runs an eval set of Q&A pairs
// through a (deliberately simple) RAG pipeline, then scores each
// answer on the four metrics from Theory.md: two retrieval-surface
// (Context Precision, Context Recall), two generation-surface
// (Faithfulness, Answer Relevance). Every judgment is LLM-as-judge
// (Theory.md ③/④) — Claude scoring Claude's own retrieval/answer.
//
//   evalSet: [{question, groundTruthAnswer, groundTruthContext}]
//        │
//        ▼
//   for each item: run the RAG pipeline
//        │
//        ├──► retrieve(question) ──► retrievedChunks
//        │                                │
//        │                                ▼
//        └──► generate(question, retrievedChunks) ──► answer
//
//   then score, per item:
//        retrievedChunks ──► Context Precision  (LLM judge: relevant? y/n, per chunk)
//        retrievedChunks + groundTruthContext ──► Context Recall (LLM judge: claim supported? y/n)
//        answer + retrievedChunks ──► Faithfulness (LLM judge: claim supported by context? y/n)
//        answer + question ──► Answer Relevance (generate reverse questions, embed, cosine similarity)
//
//   aggregate all four scores across the whole evalSet → report

const OpenAI = require("openai");
const Anthropic = require("@anthropic-ai/sdk");

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const EMBEDDING_MODEL = "text-embedding-3-small";
const CLAUDE_MODEL = "claude-sonnet-5";

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

async function askClaude(prompt, maxTokens = 300) {
  const response = await anthropic.messages.create({
    model: CLAUDE_MODEL,
    max_tokens: maxTokens,
    messages: [{ role: "user", content: prompt }],
  });
  return response.content[0].text.trim();
}

// --- A minimal RAG pipeline (brute-force retrieval, Day 1 style) so
// this file can run standalone — the evaluator below works the same
// way against Day 2/3's fuller pipelines.
function createSimplePipeline(documents) {
  const store = []; // [{ text, vector }]

  return {
    async ingest() {
      for (const text of documents) store.push({ text, vector: await embed(text) });
    },
    async retrieve(question, topK = 2) {
      const queryVector = await embed(question);
      return store
        .map(({ text, vector }) => ({ text, score: cosineSimilarity(queryVector, vector) }))
        .sort((a, b) => b.score - a.score)
        .slice(0, topK);
    },
    async generate(question, chunks) {
      const context = chunks.map((c) => c.text).join("\n");
      return askClaude(
        `Answer using ONLY the context below. If it's not there, say "I don't have that information."\n\nContext:\n${context}\n\nQuestion: ${question}`
      );
    },
  };
}

// --- Theory.md ③: Context Precision — of what we retrieved, how much
// was actually relevant to the question? LLM-as-judge per chunk.
async function contextPrecision(question, retrievedChunks) {
  if (retrievedChunks.length === 0) return 0;
  const verdicts = await Promise.all(
    retrievedChunks.map(async (chunk) => {
      const verdict = await askClaude(
        `Question: "${question}"\nChunk: "${chunk.text}"\n\nIs this chunk relevant to answering the question? Reply with ONLY "yes" or "no".`,
        10
      );
      return verdict.toLowerCase().includes("yes");
    })
  );
  return verdicts.filter(Boolean).length / verdicts.length;
}

// --- Theory.md ③: Context Recall — of the ground-truth claims, how
// many are actually supported by SOMETHING in the retrieved context?
async function contextRecall(groundTruthAnswer, retrievedChunks) {
  const claimsRaw = await askClaude(
    `Break this answer down into its individual factual claims, one per line, no numbering:\n\n"${groundTruthAnswer}"`,
    200
  );
  const claims = claimsRaw.split("\n").map((c) => c.trim()).filter(Boolean);
  if (claims.length === 0) return 0;

  const retrievedText = retrievedChunks.map((c) => c.text).join("\n");
  const verdicts = await Promise.all(
    claims.map(async (claim) => {
      const verdict = await askClaude(
        `Retrieved context:\n${retrievedText}\n\nClaim: "${claim}"\n\nIs this claim supported by the retrieved context above? Reply with ONLY "yes" or "no".`,
        10
      );
      return verdict.toLowerCase().includes("yes");
    })
  );
  return verdicts.filter(Boolean).length / verdicts.length;
}

// --- Theory.md ④: Faithfulness — of the claims IN THE ANSWER, how many
// are actually supported by the retrieved context (not invented)?
async function faithfulness(answer, retrievedChunks) {
  const claimsRaw = await askClaude(
    `Break this answer down into its individual factual claims, one per line, no numbering:\n\n"${answer}"`,
    200
  );
  const claims = claimsRaw.split("\n").map((c) => c.trim()).filter(Boolean);
  if (claims.length === 0) return 0;

  const retrievedText = retrievedChunks.map((c) => c.text).join("\n");
  const verdicts = await Promise.all(
    claims.map(async (claim) => {
      const verdict = await askClaude(
        `Retrieved context:\n${retrievedText}\n\nClaim: "${claim}"\n\nIs this claim directly supported by the retrieved context above (not just plausible, but actually stated there)? Reply with ONLY "yes" or "no".`,
        10
      );
      return verdict.toLowerCase().includes("yes");
    })
  );
  return verdicts.filter(Boolean).length / verdicts.length;
}

// --- Theory.md ④: Answer Relevance — reverse-engineer questions this
// answer would be a good response to, then compare (via embeddings) how
// close those are to the ORIGINAL question.
async function answerRelevance(question, answer) {
  const generatedRaw = await askClaude(
    `Here is an answer: "${answer}"\n\nGenerate 3 different questions that this answer would be a good, direct response to. One per line, no numbering.`,
    200
  );
  const generatedQuestions = generatedRaw.split("\n").map((q) => q.trim()).filter(Boolean);
  if (generatedQuestions.length === 0) return 0;

  const originalVector = await embed(question);
  const similarities = await Promise.all(
    generatedQuestions.map(async (q) => cosineSimilarity(originalVector, await embed(q)))
  );
  return similarities.reduce((sum, s) => sum + s, 0) / similarities.length;
}

// --- Ties it together: run the pipeline on every eval item, score all
// four metrics, and produce both a per-question and aggregate report.
function createRAGEvaluator(pipeline) {
  return {
    async evaluate(evalSet) {
      const results = [];
      for (const item of evalSet) {
        const retrievedChunks = await pipeline.retrieve(item.question);
        const answer = await pipeline.generate(item.question, retrievedChunks);

        const [precision, recall, faith, relevance] = await Promise.all([
          contextPrecision(item.question, retrievedChunks),
          contextRecall(item.groundTruthAnswer, retrievedChunks),
          faithfulness(answer, retrievedChunks),
          answerRelevance(item.question, answer),
        ]);

        results.push({
          question: item.question,
          answer,
          retrievedChunks: retrievedChunks.map((c) => c.text),
          scores: {
            contextPrecision: precision,
            contextRecall: recall,
            faithfulness: faith,
            answerRelevance: relevance,
          },
        });
      }

      const aggregate = {};
      for (const key of ["contextPrecision", "contextRecall", "faithfulness", "answerRelevance"]) {
        aggregate[key] = results.reduce((sum, r) => sum + r.scores[key], 0) / results.length;
      }

      return { results, aggregate };
    },
  };
}

(async () => {
  const pipeline = createSimplePipeline([
    "The cancellation fee for Plan A is $10 per month. This fee applies within the first year only.",
    "The cancellation fee for Plan B is $25 per month. Plan B includes premium support.",
    "Refunds for cancelled orders are processed within 5-7 business days.",
    "Our office is located in downtown Chennai.",
  ]);
  await pipeline.ingest();

  const evalSet = [
    {
      question: "What is the cancellation fee for Plan A?",
      groundTruthAnswer: "The cancellation fee for Plan A is $10 per month.",
      groundTruthContext: "The cancellation fee for Plan A is $10 per month. This fee applies within the first year only.",
    },
    {
      question: "How long do refunds take?",
      groundTruthAnswer: "Refunds are processed within 5-7 business days.",
      groundTruthContext: "Refunds for cancelled orders are processed within 5-7 business days.",
    },
  ];

  const evaluator = createRAGEvaluator(pipeline);
  const report = await evaluator.evaluate(evalSet);

  console.log(JSON.stringify(report, null, 2));
  console.log("\n=== Aggregate scores ===");
  console.log(report.aggregate);
})();
