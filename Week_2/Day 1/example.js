// Day 1 concepts in one small script: a PromptBuilder that composes a prompt
// from independent pieces (context, few-shot examples, chain-of-thought,
// output format) and a comparison of zero-shot vs CoT on the same question.

const Anthropic = require("@anthropic-ai/sdk");
const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const MODEL = "claude-sonnet-5";
const MAX_REPLY_TOKENS = 1024;

// Theory.md fact 5: a prompt is a composition of independent, addable pieces —
// not one hand-written string. Each piece can be changed/tested in isolation.
function createPromptBuilder() {
  const parts = { context: null, examples: [], chainOfThought: false, outputFormat: null };

  return {
    addContext(text) {
      parts.context = text;
      return this;
    },
    addExamples(examples) {
      // fact 4: examples must be CONSISTENT in format so the model locks onto one pattern
      parts.examples = examples;
      return this;
    },
    addChainOfThought() {
      // fact 2: gives the model scratch space — reasoning tokens it can read back
      parts.chainOfThought = true;
      return this;
    },
    addOutputFormat(text) {
      parts.outputFormat = text;
      return this;
    },
    build(question) {
      const sections = [];

      if (parts.context) {
        sections.push(`Context:\n${parts.context}`);
      }

      if (parts.examples.length > 0) {
        const examplesText = parts.examples
          .map((ex) => `Q: ${ex.question}\nA: ${ex.answer}`)
          .join("\n\n");
        sections.push(`Examples:\n${examplesText}`);
      }

      sections.push(`Q: ${question}`);

      if (parts.chainOfThought) {
        sections.push("Think step by step before giving your final answer.");
      }

      if (parts.outputFormat) {
        sections.push(`Output format: ${parts.outputFormat}`);
      }

      return sections.join("\n\n");
    },
  };
}

async function callLLM(prompt) {
  const response = await client.messages.create({
    model: MODEL,
    max_tokens: MAX_REPLY_TOKENS,
    messages: [{ role: "user", content: prompt }],
  });
  return response.content[0].text;
}

(async () => {
  const question = "A farmer has 17 sheep. All but 9 die. How many are left?";

  // Zero-shot: just the raw question, no scaffold
  const zeroShotPrompt = createPromptBuilder().build(question);
  const zeroShotAnswer = await callLLM(zeroShotPrompt);
  console.log("--- Zero-shot ---");
  console.log(zeroShotAnswer);

  // Few-shot: consistent example pattern, no reasoning shown
  const fewShotPrompt = createPromptBuilder()
    .addExamples([
      { question: "A baker has 10 cakes. All but 3 are sold. How many are left?", answer: "3" },
      { question: "A shop has 20 pens. All but 5 are given away. How many are left?", answer: "5" },
    ])
    .build(question);
  const fewShotAnswer = await callLLM(fewShotPrompt);
  console.log("\n--- Few-shot ---");
  console.log(fewShotAnswer);

  // Chain-of-thought: ask the model to reason step by step, no examples
  const cotPrompt = createPromptBuilder().addChainOfThought().build(question);
  const cotAnswer = await callLLM(cotPrompt);
  console.log("\n--- Chain-of-thought ---");
  console.log(cotAnswer);

  // Few-shot CoT + explicit output format: all pieces composed together
  const fullPrompt = createPromptBuilder()
    .addContext("These are classic misdirection riddles — read carefully, don't just pattern-match the numbers.")
    .addExamples([
      { question: "A baker has 10 cakes. All but 3 are sold. How many are left?", answer: "3 (\"all but 3\" means 3 remain)" },
    ])
    .addChainOfThought()
    .addOutputFormat("End with a single line: 'Final answer: <number>'")
    .build(question);
  const fullAnswer = await callLLM(fullPrompt);
  console.log("\n--- Few-shot + CoT + output format ---");
  console.log(fullAnswer);
})();
