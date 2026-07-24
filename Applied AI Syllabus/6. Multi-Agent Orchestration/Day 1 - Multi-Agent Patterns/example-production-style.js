// Day 1 showcase, extra file: what changes between the toy example.js and
// how a REAL production system would actually build the supervisor
// pattern. Two concrete differences, both shown here:
//
// 1. STRUCTURED OUTPUT INSTEAD OF STRING PARSING. example.js asked the
//    model to reply "APPROVE" / "RETRY: <reason>" / "ESCALATE: <reason>"
//    as free text, then checked `judgment.startsWith(...)`. Production
//    code uses Week 3's tool_use mechanism instead: the model is FORCED to
//    call a function with a typed schema (`decision` can ONLY be one of
//    three enum values) — you branch on `decision.input.verdict === "retry"`,
//    a property check, not a substring check. This is not "avoiding
//    startsWith for style" — a free-text model reply can drift ("Approved!",
//    "I'll allow it", "Looks fine to me") in ways a human reading it
//    understands but `.startsWith("APPROVE")` silently misses; an enum
//    field CANNOT return anything outside the three allowed values.
//
// 2. A REAL RETRY/BACKOFF LIBRARY INSTEAD OF A HAND-ROLLED FOR LOOP. Real
//    systems don't hand-write "for attempt = 1 to maxAttempts" with no
//    delay between attempts — a transient failure (rate limit, momentary
//    API error) benefits from a delay before retrying, and production code
//    uses a retry library (shown here hand-implemented with exponential
//    backoff, the actual technique those libraries wrap) rather than
//    hammering the API instantly on every attempt.
//
//   Worker writes ──► tool_use call FORCES a typed decision ──►
//   decision.input.verdict is a real property, not parsed text ──►
//   branch on that property ──► if retry: wait (exponential backoff) ──►
//   loop ──► if escalate: call a real human-notification hook (not console.log)

const Anthropic = require("@anthropic-ai/sdk");
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const CLAUDE_MODEL = "claude-sonnet-5";

const WRITER_PROMPT = "You write one confident, engaging factual sentence about the given topic. Do not hedge.";

async function writeDraft(topic) {
  const response = await anthropic.messages.create({
    model: CLAUDE_MODEL,
    max_tokens: 150,
    system: WRITER_PROMPT,
    messages: [{ role: "user", content: `Topic: ${topic}` }],
  });
  return response.content[0].text.trim();
}

// The supervisor's decision schema — Week 3's input_schema mechanism,
// reused here to FORCE a typed decision instead of free text. "verdict"
// literally cannot be any value other than these three strings; there is
// no equivalent of the model phrasing itself ambiguously.
const SUPERVISOR_TOOLS = [
  {
    name: "submit_verdict",
    description: "Submit your judgment on the worker's draft.",
    input_schema: {
      type: "object",
      properties: {
        verdict: { type: "string", enum: ["approve", "retry", "escalate"] },
        reason: { type: "string", description: "Why you reached this verdict." },
      },
      required: ["verdict", "reason"],
    },
  },
];

// THE SUPERVISING ACT, production-shaped: the model is forced to call
// submit_verdict — tool_choice below removes the model's option to just
// reply with plain text, so there's no "what if it forgets the format"
// failure mode at all, unlike the toy example's `judgment.startsWith(...)`
// which silently breaks if the model's phrasing drifts even slightly.
async function getSupervisorVerdict(draft, attempt, maxAttempts) {
  const response = await anthropic.messages.create({
    model: CLAUDE_MODEL,
    max_tokens: 200,
    system: `You are a supervisor reviewing a worker's output. This is attempt ${attempt} of ${maxAttempts}.`,
    tools: SUPERVISOR_TOOLS,
    tool_choice: { type: "tool", name: "submit_verdict" }, // model MUST call this — no free-text escape hatch
    messages: [{ role: "user", content: `Sentence: "${draft}"` }],
  });

  const toolUse = response.content.find((block) => block.type === "tool_use");
  return toolUse.input; // { verdict: "approve" | "retry" | "escalate", reason: "..." }
}

// Exponential backoff — the actual technique a production retry library
// (e.g. a library wrapping this exact pattern) implements: each retry
// waits LONGER than the last, so a transient failure gets breathing room
// instead of hammering the API instantly, back to back.
function backoffDelayMs(attempt) {
  return Math.min(1000 * 2 ** (attempt - 1), 8000); // 1s, 2s, 4s, 8s (capped)
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// A real escalation hook would page a human (Slack webhook, PagerDuty,
// a ticket queue) — not console.log. Stubbed here to keep the example
// runnable without real integrations, but the SHAPE (a dedicated function,
// called with full context) is what production code actually does.
async function escalateToHuman(topic, draft, reason) {
  console.log(`[ESCALATION HOOK] would page a human here — topic="${topic}" draft="${draft}" reason="${reason}"`);
}

async function supervisorProduction(topic, maxAttempts = 3) {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const draft = await writeDraft(topic);

    console.log(`[SUPERVISION] attempt ${attempt}: forcing a structured verdict via tool_use (no free-text parsing)`);
    const { verdict, reason } = await getSupervisorVerdict(draft, attempt, maxAttempts);

    // Property check, not string matching — this is the actual production
    // difference from example.js's `judgment.startsWith("APPROVE")`.
    if (verdict === "approve") {
      return { pattern: "supervisor (production-style)", draft, verdict, reason, attempts: attempt };
    }

    if (verdict === "escalate" || attempt === maxAttempts) {
      await escalateToHuman(topic, draft, reason);
      return { pattern: "supervisor (production-style)", draft, verdict: "escalate", reason, attempts: attempt, escalated: true };
    }

    // verdict === "retry": back off before trying again, instead of
    // looping instantly — the real reason production retry logic isn't
    // just "a for loop."
    const delay = backoffDelayMs(attempt);
    console.log(`[SUPERVISION] verdict=retry ("${reason}") — waiting ${delay}ms before retrying (exponential backoff)`);
    await sleep(delay);
  }
}

(async () => {
  console.log(await supervisorProduction("the speed of light"));
})();
