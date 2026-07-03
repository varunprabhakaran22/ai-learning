// Day 3 concepts in one small script: a PromptTestRunner that loads prompt
// versions, runs a fixed set of test cases against each, and prints a
// version x test-case comparison table (pass/fail) — the deliverable that
// makes "v3 is better" a checkable claim instead of an eyeballed guess.

const Anthropic = require("@anthropic-ai/sdk");
const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const MODEL = "claude-sonnet-5";
const MAX_REPLY_TOKENS = 256;

// Theory.md fact 3: versions kept side by side, not overwritten in place.
// In a real project these would be separate JSON files (prompts/summarize_v1.json,
// etc.) — inlined here to keep the example self-contained.
const promptVersions = {
  v1: (input) => `Summarize this in one sentence: ${input}`,
  v2: (input) => `Summarize this in exactly one sentence, under 20 words: ${input}`,
  v3: (input) => `Summarize this in exactly one sentence, under 20 words. Do not include opinions, only facts stated in the text: ${input}`,
};

// Theory.md fact 4: criteria check a PROPERTY of the output, not an exact
// string match — wording varies run to run even when the answer is correct.
const testCases = [
  {
    name: "word_limit",
    input: "The company reported record profits this quarter, beating analyst expectations by 15%, and announced plans to expand into three new international markets next year.",
    criteria: (output) => output.trim().split(/\s+/).length <= 20,
  },
  {
    name: "single_sentence",
    input: "The meeting covered budget cuts, a new hiring freeze, and a delayed product launch.",
    criteria: (output) => (output.match(/[.!?]/g) || []).length <= 1,
  },
  {
    name: "no_opinion_words",
    input: "The new policy is a disaster and will clearly hurt small businesses across the region.",
    criteria: (output) => !/disaster|clearly|unfortunately|great|terrible/i.test(output),
  },
];

async function callLLM(prompt) {
  const response = await client.messages.create({
    model: MODEL,
    max_tokens: MAX_REPLY_TOKENS,
    messages: [{ role: "user", content: prompt }],
  });
  return response.content[0].text;
}

// Theory.md fact 5: the grid itself is the deliverable — run every version
// against every test case, don't stop at the one case you were editing for.
async function runPromptTests(versions, cases) {
  const results = {};

  for (const [versionName, buildPrompt] of Object.entries(versions)) {
    results[versionName] = {};

    for (const testCase of cases) {
      const prompt = buildPrompt(testCase.input);
      const output = await callLLM(prompt);
      results[versionName][testCase.name] = testCase.criteria(output) ? "PASS" : "FAIL";
    }
  }

  return results;
}

function printComparisonTable(results, cases) {
  const testNames = cases.map((c) => c.name);
  const header = ["version", ...testNames].join("\t");
  console.log(header);

  for (const [versionName, testResults] of Object.entries(results)) {
    const row = [versionName, ...testNames.map((name) => testResults[name])];
    console.log(row.join("\t"));
  }
}

(async () => {
  const results = await runPromptTests(promptVersions, testCases);
  printComparisonTable(results, testCases);
})();
