// Day 5 — Week 1 Integration Project: Smart CLI Assistant
// Combines Day 1-4: stateless calls + system prompts, parameter presets,
// token counting, and sliding-window history management, into one CLI tool.

const readline = require("node:readline");
const Anthropic = require("@anthropic-ai/sdk");
const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const MODEL = "claude-sonnet-5";
const CONTEXT_WINDOW = 200000;
const MAX_REPLY_TOKENS = 1024;

// Day 4 Lessons Part B — check current pricing before trusting these numbers.
const PRICE_PER_MTOK = { input: 3, output: 15 };

const SYSTEM_PROMPT = "You are a helpful assistant. Be clear and concise.";

// --- Day 3: Parameter Presets ---------------------------------------------
// Each preset has a justified reason, not just a number (syllabus requirement).
const PRESETS = {
  factual: {
    temperature: 0.2,
    top_p: 1.0,
    reason: "facts/code need low temperature — consistent, not creative",
  },
  creative: {
    temperature: 1.0,
    top_p: 0.9,
    reason: "creative writing needs high temperature; top_p 0.9 trims the weird 0.1% tail",
  },
  structured: {
    temperature: 0,
    top_p: 1.0,
    reason: "structured output (JSON/lists) needs temp 0 — same shape every time",
  },
  conversational: {
    temperature: 0.7,
    top_p: 1.0,
    reason: "everyday chat — balanced between consistent and varied",
  },
};

// --- Day 3: Question Classification ----------------------------------------
// Simple keyword heuristic, not a model call — instant, no extra cost (per plan).
function classify(question) {
  const q = question.toLowerCase();

  if (/\b(write a story|imagine|poem|creative|brainstorm)\b/.test(q)) {
    return "creative";
  }
  if (/\b(json|list only|format as|schema|table)\b/.test(q)) {
    return "structured";
  }
  if (/\b(what is|explain|define|how does|why does|calculate)\b/.test(q)) {
    return "factual";
  }
  return "conversational";
}

// --- Day 4: Token Counting ---------------------------------------------
async function countTokens(messages, system) {
  const result = await client.messages.countTokens({ model: MODEL, system, messages });
  return result.input_tokens;
}

function estimateCost(inputTokens, outputTokens) {
  const inputCost = (inputTokens / 1_000_000) * PRICE_PER_MTOK.input;
  const outputCost = (outputTokens / 1_000_000) * PRICE_PER_MTOK.output;
  return inputCost + outputCost;
}

// --- Day 4: Sliding Window ----------------------------------------------
async function fitToBudget(history, system, newMessage) {
  const fixedCost = await countTokens([{ role: "user", content: newMessage }], system);
  const budget = CONTEXT_WINDOW - MAX_REPLY_TOKENS - fixedCost;

  const kept = [];
  let runningTotal = 0;
  let droppedCount = 0;

  for (let i = history.length - 1; i >= 0; i--) {
    const message = history[i];
    const messageTokens = await countTokens([message], system);

    if (runningTotal + messageTokens > budget) {
      droppedCount = i + 1;
      break;
    }
    kept.unshift(message);
    runningTotal += messageTokens;
  }

  if (droppedCount > 0) {
    console.log(`  (dropped ${droppedCount} oldest message(s) to fit budget)`);
  }
  return kept;
}

// --- Session state ---------------------------------------------------------
let history = [];
let sessionTokens = { input: 0, output: 0 };

async function ask(userMessage) {
  const preset = PRESETS[classify(userMessage)];
  const trimmedHistory = await fitToBudget(history, SYSTEM_PROMPT, userMessage);
  trimmedHistory.push({ role: "user", content: userMessage });

  const response = await client.messages.create({
    model: MODEL,
    system: SYSTEM_PROMPT,
    messages: trimmedHistory,
    max_tokens: MAX_REPLY_TOKENS,
    temperature: preset.temperature,
    top_p: preset.top_p,
  });

  const reply = response.content[0].text;
  trimmedHistory.push({ role: "assistant", content: reply });
  history = trimmedHistory;

  sessionTokens.input += response.usage.input_tokens;
  sessionTokens.output += response.usage.output_tokens;

  return { reply, preset };
}

// --- CLI loop ---------------------------------------------------------
const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

console.log("Smart CLI Assistant — type your question, or 'exit' to quit.\n");

function promptLoop() {
  rl.question("> ", async (question) => {
    if (question.trim().toLowerCase() === "exit") {
      const cost = estimateCost(sessionTokens.input, sessionTokens.output);
      console.log(`\nSession totals: ${sessionTokens.input} input tokens, ${sessionTokens.output} output tokens`);
      console.log(`Estimated cost: $${cost.toFixed(6)}`);
      rl.close();
      return;
    }

    const { reply, preset } = await ask(question);
    console.log(`\n[preset: ${Object.keys(PRESETS).find((k) => PRESETS[k] === preset)} — ${preset.reason}]`);
    console.log(reply, "\n");

    promptLoop();
  });
}

promptLoop();
