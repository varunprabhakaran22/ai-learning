// Day 1 showcase (extra, beyond the syllabus's design-doc task): the SAME
// small task — "write one factual sentence about a topic, then check it's
// accurate" — run three ways, so the actual code shape difference between
// the three multi-agent patterns is visible now, not just described in
// prose. Day 2-4 go on to build a much fuller Orchestrator + specialists +
// shared state on TOP of the orchestrator-worker pattern — this file is
// deliberately minimal, just enough to contrast all three patterns once.
//
// Every coordination decision below — who runs next, whether a hand-off
// happens, whether to approve/retry/escalate — is made by an ACTUAL MODEL
// CALL, not an `if` statement on a string prefix. That's a deliberate
// choice: string-prefix checks (`verdict.startsWith("INACCURATE")`) are
// fixed code standing in for judgment, which hides the real point of a
// multi-agent system — that DECIDING what happens next is itself something
// an LLM does, not something you hard-code once and reuse forever.
//
// Every console.log below is tagged [ORCHESTRATION]/[PEER HANDOFF]/
// [SUPERVISION] at the EXACT line where a model is asked to make that
// pattern's defining decision, so running this file makes the difference
// visible, not just the final printed result.
//
// ORCHESTRATOR-WORKER
//   Orchestrator (LLM call) ──decides dispatch order──► runs Writer, Checker,
//   Translator in that order ──results──► Orchestrator (LLM call) combines them
//   Workers never talk to each other or see each other's prompts — only the
//   orchestrating model call sees the full picture and decides what's next.
//
// PEER-TO-PEER
//   Writer ──writes──► Checker judges ──► CHECKER ITSELF (an LLM call) decides
//   "should I hand this back to the Writer, or is it done?" ──► if yes, Writer
//   gets the Checker's own feedback text as its next prompt, directly — no
//   outside orchestrator ever decides this hand-off should happen.
//
// SUPERVISOR
//   Worker writes, has no idea a supervisor exists ──► Supervisor (LLM call)
//   judges the output AND (LLM call) decides retry vs. escalate-to-human —
//   both decisions are model judgment, not a fixed retry-count check alone.

const Anthropic = require("@anthropic-ai/sdk");
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const CLAUDE_MODEL = "claude-sonnet-5";

async function askClaude(systemPrompt, userMessage, maxTokens = 150) {
  const response = await anthropic.messages.create({
    model: CLAUDE_MODEL,
    max_tokens: maxTokens,
    system: systemPrompt,
    messages: [{ role: "user", content: userMessage }],
  });
  return response.content[0].text.trim();
}

const WRITER_PROMPT = "You write one confident, engaging factual sentence about the given topic. Do not hedge.";
const CHECKER_PROMPT = "You are a skeptical fact-checker. Given one factual sentence, reply with 'ACCURATE' or 'INACCURATE: <reason>'. Be suspicious of anything unverifiable.";

// --- Pattern 1: Orchestrator-worker, LLM orchestrator.
// The orchestrator does NOT know in advance which workers a given task
// needs, or in what order. It's handed a task and a list of workers with
// capability descriptions, and an LLM CALL decides which worker(s) to
// dispatch to and in what order — this is what Day 2's real `Orchestrator`
// class does for real: the dispatch decision itself requires judgment
// (different tasks need different workers), so it costs an LLM call.
const WORKERS = {
  writer: { description: "Writes one confident factual sentence about a topic.", run: (input) => askClaude(WRITER_PROMPT, `Topic: ${input}`) },
  checker: { description: "Fact-checks a single sentence for accuracy.", run: (input) => askClaude(CHECKER_PROMPT, `Sentence: "${input}"`) },
  translator: { description: "Translates a sentence into French.", run: (input) => askClaude("Translate the given sentence into French. Reply with only the translation.", input) },
};

async function orchestratorWorker(task) {
  const workerList = Object.entries(WORKERS).map(([name, w]) => `- ${name}: ${w.description}`).join("\n");

  // THE ORCHESTRATING ACT, part 1 — DISPATCH: an actual model call whose
  // only job is deciding routing (which workers, in what order) for a task
  // it hasn't seen a fixed script for.
  console.log("[ORCHESTRATION] asking a model to decide which worker(s) this task actually needs, and in what order");
  const routingDecision = await askClaude(
    `You are an orchestrator. Available workers:\n${workerList}\n\nGiven a task, reply with ONLY a comma-separated ordered list of worker names to run, in order (e.g. "writer,checker").`,
    `Task: ${task}`
  );
  const workerNames = routingDecision.split(",").map((n) => n.trim()).filter((n) => WORKERS[n]);
  console.log(`[ORCHESTRATION] model chose this dispatch order: ${workerNames.join(" -> ")}`);

  let input = task;
  const stepResults = {};
  for (const name of workerNames) {
    input = await WORKERS[name].run(input);
    stepResults[name] = input;
  }

  // THE ORCHESTRATING ACT, part 2 — ASSEMBLE: another model call, combining
  // every worker's result into one coherent final answer. Neither worker
  // saw any other worker's output directly — only the orchestrator's own
  // model calls (dispatch, then assemble) ever see the full picture.
  console.log("[ORCHESTRATION] asking a model to assemble all worker results into one coherent final answer");
  const stepSummary = Object.entries(stepResults).map(([name, result]) => `${name} produced: "${result}"`).join("\n");
  const finalAnswer = await askClaude(
    "You are an orchestrator assembling results from several workers into one coherent final answer for the user.",
    `Original task: ${task}\n\nWorker results:\n${stepSummary}\n\nWrite the final answer.`
  );

  return { pattern: "orchestrator-worker", routingDecision: workerNames, stepResults, finalAnswer };
}

// --- Pattern 2: Peer-to-peer.
// There is no orchestrator deciding "should the checker hand this back to
// the writer." The CHECKER ITSELF decides that, as part of its own reply —
// the hand-off is a decision made by one peer agent, not routed by a third
// party watching from outside.
async function peerToPeer(topic) {
  let draft = await askClaude(WRITER_PROMPT, `Topic: ${topic}`);

  console.log("[PEER HANDOFF] asking the Checker to judge the draft AND decide, itself, whether to hand back to the Writer");
  let checkerReply = await askClaude(
    "You are a skeptical fact-checker AND you decide the next step yourself — you are a peer, not a subordinate reporting to a coordinator. Reply in the form 'ACCURATE' (done) or 'HANDOFF: <feedback for the writer>' if you're handing this back for a rewrite.",
    `Sentence: "${draft}"`
  );

  let handoffCount = 0;
  while (checkerReply.startsWith("HANDOFF") && handoffCount < 2) {
    handoffCount++;
    // THE PEER HAND-OFF ACT: the checker's own feedback text — its own
    // decision, not an orchestrator's — is pasted directly into the
    // writer's next prompt. Compare to orchestratorWorker above: there, no
    // worker's output ever went straight into another worker's prompt
    // without passing through an orchestrator's own model call first.
    console.log(`[PEER HANDOFF] Checker decided to hand back (attempt ${handoffCount}) — its own feedback goes straight into the Writer's next prompt`);
    draft = await askClaude(WRITER_PROMPT, `Topic: ${topic}. A peer reviewer sent this feedback directly to you: "${checkerReply}". Rewrite accordingly.`);
    checkerReply = await askClaude(
      "You are a skeptical fact-checker AND you decide the next step yourself. Reply 'ACCURATE' (done) or 'HANDOFF: <feedback for the writer>'.",
      `Sentence: "${draft}"`
    );
  }
  return { pattern: "peer-to-peer", draft, checkerReply, handoffCount };
}

// --- Pattern 3: Supervisor.
// The worker only ever sees the topic — it has no instruction about being
// judged, no idea a supervisor exists. The supervisor's only output is a
// judgment of someone else's work, and — unlike a fixed `attempt ===
// maxRetries` check — whether to retry or escalate is ALSO the
// supervisor's own model-made decision, not a hard-coded counter alone.
async function supervisor(topic, maxAttempts = 3) {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const draft = await askClaude(WRITER_PROMPT, `Topic: ${topic}`);

    // THE SUPERVISING ACT: a call whose SYSTEM PROMPT is "judge this, and
    // decide what happens next," not "do the task" — the defining feature
    // of this pattern, unlike orchestratorWorker's Checker worker (which
    // does its own domain work: fact-checking) or peerToPeer's Checker
    // (same domain work, just deciding its own hand-off).
    console.log(`[SUPERVISION] attempt ${attempt}: asking a model to judge the Writer's draft AND decide retry vs. approve vs. escalate`);
    const judgment = await askClaude(
      `You are a supervisor reviewing a worker's output. This is attempt ${attempt} of ${maxAttempts}. Judge whether the sentence is both accurate and engaging, then decide the next step yourself. Reply in the form 'APPROVE', or 'RETRY: <reason>' if worth another attempt, or 'ESCALATE: <reason>' if this should go to a human instead of retrying further.`,
      `Sentence: "${draft}"`
    );

    if (judgment.startsWith("APPROVE")) {
      return { pattern: "supervisor", draft, judgment, attempts: attempt };
    }
    if (judgment.startsWith("ESCALATE") || attempt === maxAttempts) {
      // Escalation path: the supervisor's OWN judgment (not just a counter
      // running out) can decide this isn't worth more retries and hand off
      // to a human — the same stopping-condition problem named for a
      // single agent's executor loop, now guarding a supervisor's loop.
      console.log(`[SUPERVISION] escalating to a human instead of retrying further — reason: ${judgment}`);
      return { pattern: "supervisor", draft, judgment, attempts: attempt, escalated: true };
    }
    console.log(`[SUPERVISION] supervisor decided to retry ("${judgment}") — sending Writer back`);
  }
}

(async () => {
  const topic = "the speed of light";

  console.log("=== Orchestrator-Worker ===");
  console.log(await orchestratorWorker(`Write a fact about ${topic}, check it, then translate it to French`));

  console.log("\n=== Peer-to-Peer ===");
  console.log(await peerToPeer(topic));

  console.log("\n=== Supervisor ===");
  console.log(await supervisor(topic));
})();
