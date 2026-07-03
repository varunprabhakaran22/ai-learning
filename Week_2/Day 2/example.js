// Day 2 concepts in one small script: a StructuredOutputParser that takes a
// Zod schema + a prompt, validates the LLM's response against it, and
// retries (feeding back the specific validation error) up to 3 times.
//
// npm install zod @anthropic-ai/sdk

const Anthropic = require("@anthropic-ai/sdk");
const { z } = require("zod");

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const MODEL = "claude-sonnet-5";
const MAX_REPLY_TOKENS = 1024;
const MAX_ATTEMPTS = 3;

// Theory.md fact 5: JSON vs XML — pull JSON out of a response even if the
// model wraps it in prose, instead of assuming the whole reply is pure JSON.
function extractJSON(text) {
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) throw new Error("no JSON object found in response");
  return JSON.parse(match[0]);
}

// Theory.md fact 3: the schema is a shared contract — same Zod schema both
// describes the shape to the model (via .toString() below) and validates
// the response, so the two can never drift apart.
async function getStructuredOutput(prompt, schema) {
  let lastError = null;

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    // fact 4: on retries, feed back the SPECIFIC validation error, not just
    // a repeat of the same prompt — narrows what the model needs to fix.
    const fullPrompt = lastError
      ? `${prompt}\n\nYour previous response was:\n${lastError.response}\n\nThat failed validation with this error:\n${lastError.message}\n\nFix ONLY the problem described and respond again with ONLY valid JSON, no other text.`
      : `${prompt}\n\nRespond with ONLY valid JSON, no other text.`;

    const response = await client.messages.create({
      model: MODEL,
      max_tokens: MAX_REPLY_TOKENS,
      messages: [{ role: "user", content: fullPrompt }],
    });

    const rawText = response.content[0].text;

    try {
      const parsed = extractJSON(rawText);
      const validated = schema.parse(parsed); // throws ZodError on shape mismatch
      return { data: validated, attempts: attempt };
    } catch (err) {
      lastError = { response: rawText, message: err.message };
      console.log(`attempt ${attempt} failed: ${err.message}`);
    }
  }

  throw new Error(`validation failed after ${MAX_ATTEMPTS} attempts: ${lastError.message}`);
}

const personSchema = z.object({
  name: z.string(),
  age: z.number(),
  occupation: z.string(),
});

(async () => {
  const prompt = "Generate a fictional person's profile with a name, age, and occupation.";

  const result = await getStructuredOutput(prompt, personSchema);
  console.log(`\nsucceeded on attempt ${result.attempts}`);
  console.log(result.data);
})();
