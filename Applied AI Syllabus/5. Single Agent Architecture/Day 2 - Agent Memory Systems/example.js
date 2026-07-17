// Day 2 showcase: an AgentMemory system — short-term sliding window +
// long-term vector store with auto-summarization. Reuses Week 4 Day 1's
// exact embed/cosineSimilarity mechanism, repointed at an agent's own
// session history instead of external documents.
//
//   New message
//        │
//        ▼
//   addToShortTerm(message) ──► sliding window (last N messages, in-context)
//
//   End of session
//        │
//        ▼
//   summarize(full session transcript)   ← one extra LLM call (Theory.md ②)
//        │
//        ▼
//   embed(summary) ──► store as episodic entry in the vector store
//
//   New session starts
//        │
//        ▼
//   embed(current task) ──► cosine similarity vs every stored entry
//        │
//        ▼
//   topK most relevant past entries ──► folded into the new prompt
//        │
//        ▼
//   buildPromptWithMemory(task, entries) ──► "Goal: ... Relevant memory: ..."
//        │
//        ▼
//   anthropic.messages.create(prompt) ──► model's next-action decision
//
//   runExecutorLoop: the loop that decides whether to call the model again
//        │
//        ▼
//   messages.create(history) ──► tool_use block? ──yes──► execute real tool
//        │                                                       │
//        │ no (plain text reply)                                ▼
//        ▼                                          push {assistant reply,
//   DONE — return final text                          real tool result} onto
//                                                       history, loop again
//                                                       (until maxIterations)

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

// Theory.md ②: auto-summarization — condense a raw session transcript
// into a short, information-dense summary BEFORE storing it. This is
// the one genuinely new mechanism today; everything else below reuses
// Week 4 Day 1's embed/store/retrieve pipeline unchanged.
async function summarizeSession(transcript) {
  const response = await anthropic.messages.create({
    model: CLAUDE_MODEL,
    max_tokens: 150,
    messages: [
      {
        role: "user",
        content: `Here is a raw session transcript:\n${transcript}\n\nWrite a 2-3 sentence summary capturing: what was attempted, the outcome, and anything a future session should know before attempting something similar.`,
      },
    ],
  });
  return response.content[0].text.trim();
}

function createAgentMemory({ maxShortTermMessages = 10 } = {}) {
  let shortTerm = []; // sliding window — Theory.md ①'s in-context memory
  const longTerm = []; // [{ text, vector, type: "episodic" | "semantic" }]

  return {
    // Short-term: just an array slice, bounded so it never blows the context window.
    addToShortTerm(message) {
      shortTerm.push(message);
      if (shortTerm.length > maxShortTermMessages) {
        shortTerm = shortTerm.slice(-maxShortTermMessages);
      }
    },
    getShortTerm() {
      return shortTerm;
    },

    // Long-term: summarize the session, embed the summary (not the raw
    // transcript), store as an episodic entry.
    async commitSessionToLongTerm(transcript) {
      const summary = await summarizeSession(transcript);
      const vector = await embed(summary);
      longTerm.push({ text: summary, vector, type: "episodic" });
      return summary;
    },

    // Semantic facts get stored the same way, just tagged differently —
    // Theory.md ①'s distinction is in meaning, not mechanism.
    async addSemanticFact(fact) {
      const vector = await embed(fact);
      longTerm.push({ text: fact, vector, type: "semantic" });
    },

    // Retrieval: identical to Week 4 Day 1's search — embed the query,
    // cosine similarity against every stored vector, keep topK.
    async retrieveRelevant(currentTask, topK = 3) {
      const queryVector = await embed(currentTask);
      return longTerm
        .map(({ text, vector, type }) => ({ text, type, score: cosineSimilarity(queryVector, vector) }))
        .sort((a, b) => b.score - a.score)
        .slice(0, topK);
    },
  };
}

// The missing link from Theory.md ③, Step 2: retrieved memory only matters
// once it's folded into the actual text sent to the model. This is that fold.
function buildPromptWithMemory(task, relevantMemories) {
  const memoryBlock = relevantMemories.map((m) => `- ${m.text}`).join("\n");
  return `Goal: ${task}\n\nRelevant memory:\n${memoryBlock}\n\nDecide your next action.`;
}

async function askClaudeWithMemory(task, relevantMemories) {
  const prompt = buildPromptWithMemory(task, relevantMemories);
  const response = await anthropic.messages.create({
    model: CLAUDE_MODEL,
    max_tokens: 300,
    messages: [{ role: "user", content: prompt }],
  });
  return response.content[0].text.trim();
}

// Theory.md ③, Steps 3-7 as runnable code: the executor loop that decides
// whether to call the model again. There is no separate "are we done?"
// check — the model re-decides this on every iteration, using the
// accumulating `history` (which now includes the real result of the step
// that just ran). The loop only stops when the model's OWN reply carries
// the DONE: signal instead of another tool_use block, or maxIterations
// is hit (the hard safety net named in Theory.md ⑤ / syllabus Week 5 Day 1).
const fakeTools = {
  getAccountStatus: ({ userId }) => ({ cardStatus: "still expired", pendingBooking: true }),
  sendMessage: ({ userId, text }) => ({ delivered: true }),
};

async function runExecutorLoop(task, relevantMemories, { maxIterations = 5 } = {}) {
  const memoryBlock = relevantMemories.map((m) => `- ${m.text}`).join("\n");
  const tools = [
    { name: "getAccountStatus", description: "Look up a user's account status", input_schema: { type: "object", properties: { userId: { type: "string" } }, required: ["userId"] } },
    { name: "sendMessage", description: "Send a message to a user", input_schema: { type: "object", properties: { userId: { type: "string" }, text: { type: "string" } }, required: ["userId", "text"] } },
  ];
  const history = [
    {
      role: "user",
      content: `Goal: ${task}\n\nRelevant memory:\n${memoryBlock}\n\nUser ID is "X". Decide your next action using the available tools. When the goal is fully done, reply with plain text starting with "DONE:" instead of calling a tool.`,
    },
  ];

  for (let step = 1; step <= maxIterations; step++) {
    const response = await anthropic.messages.create({
      model: CLAUDE_MODEL,
      max_tokens: 300,
      tools,
      messages: history,
    });

    const toolUse = response.content.find((block) => block.type === "tool_use");
    if (!toolUse) {
      const finalText = response.content.find((block) => block.type === "text")?.text.trim();
      console.log(`  [step ${step}] model replied with no tool call — treating as done:`, finalText);
      return finalText; // no tool_use block emitted => loop stops (Theory.md ③ Step 7)
    }

    const result = fakeTools[toolUse.name](toolUse.input);
    console.log(`  [step ${step}] tool_use: ${toolUse.name}(${JSON.stringify(toolUse.input)}) -> ${JSON.stringify(result)}`);

    // Push the model's real decision AND the tool's real result — next
    // iteration's prompt can only be built now, from this actual outcome
    // (Theory.md ③ Step 5's point: nobody could write this text in advance).
    history.push({ role: "assistant", content: response.content });
    history.push({
      role: "user",
      content: [{ type: "tool_result", tool_use_id: toolUse.id, content: JSON.stringify(result) }],
    });
  }

  return null; // maxIterations exhausted without a DONE signal — the safety net tripped
}

(async () => {
  const memory = createAgentMemory({ maxShortTermMessages: 5 });

  // Semantic fact — a durable truth, not tied to one episode.
  await memory.addSemanticFact("User X's account tier is Plan A.");

  // Simulate a past session ending, committing an episodic summary.
  const pastTranscript = `
    Agent attempted to book a flight for user X.
    Called chargeCard(userId: "X") -> FAILED: card expired.
    Sent message to user X: "Your card is expired, please update it."
    Session ended without completing the booking.
  `;
  const summary = await memory.commitSessionToLongTerm(pastTranscript);
  console.log("Stored episodic summary:", summary);

  // New session starts — retrieve relevant memory BEFORE acting (Theory.md ③, Step 1).
  const task = "check user X's account for pending issues";
  const relevant = await memory.retrieveRelevant(task);
  console.log("\nRetrieved relevant memory for new session:");
  console.log(relevant);

  // Fold that retrieved memory into the actual prompt and call Claude with it
  // (Theory.md ③, Step 2 — the part example.js previously stopped short of).
  const decision = await askClaudeWithMemory(task, relevant);
  console.log("\nClaude's next action, given retrieved memory:");
  console.log(decision);

  // The full executor loop (Theory.md ③, Steps 3-7): unlike askClaudeWithMemory
  // above, which stops after one reply, this keeps calling the model — using
  // each step's REAL tool result to build the next prompt — until the model's
  // own reply signals DONE, or maxIterations is hit.
  console.log("\nRunning full executor loop:");
  const finalOutcome = await runExecutorLoop(task, relevant);
  console.log("Executor loop finished with:", finalOutcome);

  // Short-term memory in action — bounded sliding window.
  for (let i = 1; i <= 8; i++) {
    memory.addToShortTerm({ role: "user", content: `message ${i}` });
  }
  console.log("\nShort-term window (should only hold the last 5):");
  console.log(memory.getShortTerm());
})();
