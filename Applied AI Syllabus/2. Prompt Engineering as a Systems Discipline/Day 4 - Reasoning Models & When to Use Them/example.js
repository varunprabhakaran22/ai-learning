// Day 4 concepts in one small script: a ModelRouter that classifies an
// incoming task (simple/complex/creative/analytical), routes it to the
// right model + parameter preset, and logs the routing decision with
// the reasoning behind it — so the decision can be audited later.

const Anthropic = require("@anthropic-ai/sdk");
const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const STANDARD_MODEL = "claude-sonnet-5";
const REASONING_MODEL = "claude-sonnet-5"; // swap for an extended-thinking-capable model/config
const MAX_REPLY_TOKENS = 1024;

// Week 1 Day 3 concept reused: presets carry justified parameter values per task type.
const presets = {
  factual: { temperature: 0 },
  creative: { temperature: 1.0 },
  structured: { temperature: 0 },
  analytical: { temperature: 0.3 },
};

// Theory.md fact 4: classify BEFORE calling any model — the classification
// decides both which model and which preset get used.
function classifyTask(task) {
  const lower = task.toLowerCase();

  const complexSignals = /step by step|solve|prove|calculate.*and.*then|multiple constraints/;
  const creativeSignals = /write a story|poem|brainstorm|imagine/;
  const analyticalSignals = /compare|analyze|evaluate|trade-?off/;

  if (complexSignals.test(lower)) {
    return { type: "complex", reason: "detected multi-step/solve language" };
  }
  if (creativeSignals.test(lower)) {
    return { type: "creative", reason: "detected creative-writing language" };
  }
  if (analyticalSignals.test(lower)) {
    return { type: "analytical", reason: "detected comparison/evaluation language" };
  }
  return { type: "simple", reason: "no complexity/creativity/analysis signals found" };
}

// Theory.md fact 4: routing table — task type -> model + preset.
function routeTask(classification) {
  switch (classification.type) {
    case "complex":
      return { model: REASONING_MODEL, preset: presets.analytical, useExtendedThinking: true };
    case "creative":
      return { model: STANDARD_MODEL, preset: presets.creative, useExtendedThinking: false };
    case "analytical":
      return { model: STANDARD_MODEL, preset: presets.analytical, useExtendedThinking: false };
    case "simple":
    default:
      return { model: STANDARD_MODEL, preset: presets.factual, useExtendedThinking: false };
  }
}

// Theory.md fact 5: log the decision, not just the result — needed to audit
// whether the classifier is over/under-triggering the expensive path later.
function logRoutingDecision(task, classification, route) {
  console.log({
    task,
    classification: classification.type,
    reason: classification.reason,
    model: route.model,
    extendedThinking: route.useExtendedThinking,
    temperature: route.preset.temperature,
  });
}

async function routeAndCall(task) {
  const classification = classifyTask(task);
  const route = routeTask(classification);
  logRoutingDecision(task, classification, route);

  const response = await client.messages.create({
    model: route.model,
    max_tokens: MAX_REPLY_TOKENS,
    temperature: route.preset.temperature,
    messages: [{ role: "user", content: task }],
  });

  return response.content[0].text;
}

(async () => {
  const tasks = [
    "What year did the Berlin Wall fall?",
    "Write a short poem about autumn rain.",
    "Solve step by step: a train leaves at 3pm going 60mph, another leaves 30 minutes later going 75mph on the same route — when does the second catch the first?",
    "Compare the trade-offs of REST vs GraphQL for a mobile app backend.",
  ];

  for (const task of tasks) {
    const answer = await routeAndCall(task);
    console.log(answer, "\n---");
  }
})();
