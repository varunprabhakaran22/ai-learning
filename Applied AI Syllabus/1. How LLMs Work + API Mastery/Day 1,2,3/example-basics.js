// Day 1 concepts in one small script: stateless calls, manual history, temperature, system prompt.

const Anthropic = require("@anthropic-ai/sdk");
const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// Fact 5: you construct the model's reality — system prompt sets behavior.
const systemPrompt = "You are a concise assistant. Answer in 1 short sentence.";

// Fact 1: no memory between calls — this array IS the memory, managed by you.
const history = [];

async function ask(userMessage, temperature = 0, top_p = 1.0) {
  history.push({ role: "user", content: userMessage });

  const response = await client.messages.create({
    model: "claude-sonnet-5",
    system: systemPrompt,
    messages: history,       // full history resent every single call
    max_tokens: 200,
    temperature,              // reshapes odds of ALL words (0 = deterministic, 0.7-1 = varied)
    top_p,                    // bouncer: only keeps top words summing to top_p% (1.0 = no cut, default)
  });

  const reply = response.content[0].text;
  history.push({ role: "assistant", content: reply }); // you append it yourself
  return reply;
}

(async () => {
  console.log(await ask("What is an API rate limit?", 0, 1.0));        // temp 0: consistent fact
  console.log(await ask("Give me a creative analogy for it", 1.0, 0.9)); // top_p 0.9: cut weird tail, keep creativity
  console.log(await ask("What did I just ask you about?", 0, 1.0));   // proves "memory" = history array
})();
