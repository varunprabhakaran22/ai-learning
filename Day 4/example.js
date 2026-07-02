// Day 4 concepts in one small script: counting tokens before sending,
// sliding window trimming, and a stub showing where summarization would go.

const Anthropic = require("@anthropic-ai/sdk");
const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const MODEL = "claude-sonnet-5";
const CONTEXT_WINDOW = 200000; // model's total token capacity (input + output)
const MAX_REPLY_TOKENS = 1024; // reserved for the model's response

// Fact 3: count tokens locally BEFORE calling the API — don't eyeball it.
// The SDK exposes the same tokenizer the API itself uses, no network round-trip needed.
async function countTokens(messages, system) {
  const result = await client.messages.countTokens({
    model: MODEL,
    system,
    messages,
  });
  return result.input_tokens;
}

// Fact 4: sliding window — walk history newest -> oldest, keep what fits, drop the rest.
async function fitToBudget(history, system, newMessage) {
  const fixedCost = await countTokens(
    [{ role: "user", content: newMessage }],
    system
  );
  const budget = CONTEXT_WINDOW - MAX_REPLY_TOKENS - fixedCost;

  const kept = [];
  let runningTotal = 0;
  let droppedCount = 0;

  // walk newest -> oldest (reverse order), stop once budget would be exceeded
  for (let i = history.length - 1; i >= 0; i--) {
    const message = history[i];
    const messageTokens = await countTokens([message], system);

    if (runningTotal + messageTokens > budget) {
      droppedCount = i + 1; // everything from here backwards gets dropped
      break;
    }

    kept.unshift(message); // preserve original chronological order
    runningTotal += messageTokens;
  }

  if (droppedCount > 0) {
    console.log(`dropped ${droppedCount} oldest message(s) to fit budget`);
  }

  return kept;
}

// Placeholder for the next-step-up alternative to sliding window (not built this Day).
// Instead of dropping old messages, you'd replace them with a short model-generated
// summary that costs far fewer tokens but keeps the gist. Later-week topic.
function summarizeHistory(_droppedMessages) {
  throw new Error("summarization not implemented yet — later-week topic (see Theory.md Day 4 note)");
}

const systemPrompt = "You are a concise assistant. Answer in 1 short sentence.";

async function ask(history, userMessage) {
  const trimmedHistory = await fitToBudget(history, systemPrompt, userMessage);
  trimmedHistory.push({ role: "user", content: userMessage });

  const response = await client.messages.create({
    model: MODEL,
    system: systemPrompt,
    messages: trimmedHistory,
    max_tokens: MAX_REPLY_TOKENS,
  });

  const reply = response.content[0].text;
  trimmedHistory.push({ role: "assistant", content: reply });
  return trimmedHistory; // caller keeps this as the new history
}

(async () => {
  let history = [];

  const inputTokens = await countTokens(
    [{ role: "user", content: "What is an API rate limit?" }],
    systemPrompt
  );
  console.log(`token count for first message: ${inputTokens}`);

  history = await ask(history, "What is an API rate limit?");
  console.log(history[history.length - 1].content);

  history = await ask(history, "Give me 3 strategies to handle it");
  console.log(history[history.length - 1].content);
})();
