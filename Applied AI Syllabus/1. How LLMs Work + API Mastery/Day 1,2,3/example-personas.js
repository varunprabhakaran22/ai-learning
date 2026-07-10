// Day 2: system prompt = highest-weighted text in context, still just a string.

const Anthropic = require("@anthropic-ai/sdk");
const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

async function ask(systemPrompt, userMessage, temperature = 0) {
  const response = await client.messages.create({
    model: "claude-sonnet-5",
    system: systemPrompt,
    messages: [{ role: "user", content: userMessage }],
    max_tokens: 300,
    temperature,
  });
  return response.content[0].text;
}

// Same question, 3 different system prompts — compare format/tone/refusal behavior.
const question = "Should I use React or Vue for a new project?";

const personas = {
  strictJson: `You are a strict JSON API.
Respond ONLY with valid JSON: {"recommendation": string, "reason": string}.
No prose outside the JSON.`,

  friendly: `You are a warm, encouraging assistant.
Tone: conversational, simple language.`,

  expertAnalyst: `You are a senior staff engineer.
Mention concrete tradeoffs. No fluff. Tone: precise and direct.`,
};

(async () => {
  for (const [name, systemPrompt] of Object.entries(personas)) {
    const answer = await ask(systemPrompt, question, 0); // temp 0: isolate persona effect from randomness
    console.log(`\n--- ${name} ---`);
    console.log("→", answer);
  }
})();
