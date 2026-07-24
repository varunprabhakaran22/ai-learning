# Day 4 — Human-in-the-Loop Patterns

## ⓪ Where we left off, and the actual problem today solves

Day 1 named the four pillars — planning, memory, tools, action — and the executor loop that ties them together: the model decides an action, your code executes it, the result goes back in, repeat until the goal (or a separate goal-judge, per Day 3 ⑤'s `/goal` pattern) says done. Day 2 built memory in full depth. Day 3 built planning, replanning, and — critically — a goal-check that's independent of the acting model's own self-report, because a plan finishing every subtask doesn't guarantee the real-world outcome is actually correct.

Today's problem sits one layer past all of that: even a PERFECT executor loop — good plan, good memory, a goal-check that correctly verifies success — will still, at some point, be about to take an action that is wrong to just let happen automatically, no matter how confident the model is. Two concrete cases: (1) the action is irreversible or expensive if wrong (sending an email to a real customer, deleting a database row, spending real money on an API call to a paid service) — the "trigger a replan" fix from Day 3 only works for actions that ran and can be observed/corrected; if the wrong action is itself the thing that causes damage, there's nothing left to correct after the fact. (2) the model's own confidence in the plan or the specific step is low — not because anything failed, but because the situation is genuinely ambiguous (Day 3 ②'s tree-of-thought example: "user has two accounts, ambiguous which to act on" — sometimes even a good tree-of-thought ranking doesn't clearly separate the top candidate from the rest).

Both cases need the same fix: a checkpoint, inserted into the executor loop at the right places, where your code STOPS and waits for an actual human to say "yes, proceed" before the action executes — instead of the loop running straight through from plan to execution unattended. That checkpoint, and the rules for exactly when it fires, is what today builds.

---

## ① The core problem, mechanically: why "just ask a human every time" and "never ask" are both wrong

Before building the actual gate, it's worth being precise about why this isn't solved by picking one blanket rule.

**"Ask a human before every single action"** defeats the entire point of an autonomous agent — Day 1's whole motivation for building an executor loop instead of a human doing each step by hand. If a human has to approve `searchWeb(query)` (a read-only, fully reversible, free action), you've built a very expensive rubber-stamping ritual, not an agent. It also degrades the human's judgment over time: if every approval request looks the same regardless of actual risk, a human reviewing dozens of them per session starts rubber-stamping without reading — the exact failure mode "human-in-the-loop" is supposed to prevent.

**"Never ask, let the agent always act autonomously"** is what Day 1-3 already built, and it's fine for read-only or cheaply-reversible actions — but it means the FIRST time the plan is wrong about something irreversible (a wrong email sent, a wrong record deleted), there is no recovery step, because the damage already happened by the time anyone could notice via Day 3's replanning check (which reacts to a REAL result — but for an irreversible action, the "real result" IS the damage, arriving too late to prevent it).

**The actual fix is neither extreme — it's classifying actions upfront by risk, and gating only the ones that need it.** This is the same principle as Day 3 ④'s under-specification fix: you don't leave "how risky is this action" to be figured out ad hoc mid-execution; you build it into the system upfront, as an explicit, checkable property of each registered tool — exactly like Week 3 Day 1's `ToolRegistry` already requires a name, description, and input schema per tool. Today adds one more required field per tool: a risk classification.

---

## ② The three risk tiers — what determines which tier an action falls into

Every tool your agent can call gets tagged, at registration time (same place Week 3 Day 1's `ToolRegistry` already declares `name`, `description`, `inputSchema`), with one of three tiers. The tier is a property of the TOOL (and sometimes the specific INPUT to that tool call — more on that below), decided by a human designing the system upfront, not decided by the model at runtime.

### Always-ask (hard-gated)

Any action that is irreversible OR has real-world cost/consequence if wrong. Concretely: `sendMessage(userId, text)` to a real customer, `deleteRecord(id)`, `chargePayment(amount)`, `executeTransaction(...)`. The defining test: **if this action runs and turns out to be wrong, can anything in your system undo it?** If the honest answer is "no — the email is already sent, the row is already gone, the money is already charged," it's always-ask, full stop, regardless of how confident the model is on any given call.

### Never-ask (auto-approved)

Any action that is read-only or trivially, fully reversible with no side effects outside your own system. Concretely: `searchWeb(query)`, `readFile(path)`, `getCurrentDate()`, `getAccountStatus(userId)` (from Day 3 ③'s trace — reading status has no side effect at all). The test: **does running this action change anything in the real world, or does it only produce information?** Pure reads are never-ask.

### Threshold-based (conditionally gated)

This is the tier that actually needs a runtime decision, and it's the interesting one. Some actions are reversible-ish or low-but-nonzero cost, and whether to gate them depends on the model's CONFIDENCE in that specific call, not just the action's identity. Concretely: `writeFile(path, content)` overwriting an existing file is recoverable (Week 3 Day 2's tool) if you keep a backup, but still disruptive if wrong; `sendMessage` to an internal team Slack channel (not a customer) is lower-stakes than to a customer but still not nothing.

**How "confidence" is actually produced, mechanically — it is not a number the model spontaneously reports on its own initiative.** Exactly like Day 3's structured-output pattern, you EXPLICITLY ask for it in the prompt's output schema:

```
Prompt: "...Decide your next action. Along with your tool call, also
output a confidence score from 0-100 reflecting how certain you are
this is the correct action given the available information, and a
one-sentence justification."

Model's output (structured, same JSON-schema enforcement as Week 2 Day 2):
{
  "action": { "name": "writeFile", "input": { "path": "config.json", "content": "..." } },
  "confidence": 62,
  "justification": "The file exists and this looks like the right
  update, but the original request was ambiguous about which config
  key to change, so there's real uncertainty."
}
```

This confidence score is a self-reported number from the SAME model making the decision — it is a heuristic proxy for "how ambiguous did this decision feel," not a certified, independently-verified probability. It can be wrong (a model can be miscalibrated — falsely confident or falsely unsure) exactly the same way Day 3 ⑤ flagged the acting model's own self-report of task completion as unreliable. This is precisely why always-ask actions bypass confidence entirely — for irreversible actions you don't trust ANY self-reported number, high or low, because being wrong is too costly to gate on a number the model itself produced.

**The gate rule for this tier:** your code (plain code, no LLM call — same as Day 3 ①'s dependency-resolution check) compares this reported confidence against a threshold YOU set per action type (e.g. 80): `if (confidence < threshold) → pause for human approval; else → proceed automatically`. The threshold itself is a judgment call made by whoever designs the system, informed by how costly a wrong call of THAT specific action actually is — a threshold of 80 for "overwrite a config file" and a threshold of 95 for "send a Slack message to the whole team" both being defensible, because the second is harder to walk back.

---

## ③ The `HumanGate` — where this plugs into the executor loop, mechanically

This builds directly on Day 1/2/3's executor loop shape. The gate is a check inserted BETWEEN "model decided an action" and "your code executes that action" — nowhere else. Concretely, extending Day 2 ③'s worked trace:

```
STEP 3 — Model responds with a tool_use block AND a confidence score
    (per the structured-output pattern in ② above):
    { action: { name: "sendMessage", input: { userId: "X", text: "..." } },
      confidence: 90 }

STEP 3.5 — HumanGate check (NEW — inserted here, before execution):
    a) Look up the tool's tier: sendMessage → always-ask (it has a
       real-world, irreversible effect on an actual customer).
    b) Tier is always-ask → SKIP the confidence check entirely (per
       ② — confidence is never trusted for this tier, regardless of
       its value) → PAUSE the loop.
    c) Present to a human: the action, its input, the model's stated
       justification, and the confidence score (for context only,
       not as the deciding factor).
    d) Human responds: approve / reject / edit-and-approve.
       - approve → proceed to STEP 4 exactly as before, unmodified.
       - reject → do NOT execute; instead, feed "human rejected this
         action: [reason if given]" back into the prompt as the next
         step's real result — same mechanism as Day 3's replanning:
         a real outcome (a rejection) is now known, so the next
         prompt is built using it, same as any other real result.
       - edit-and-approve → execute the human's EDITED input instead
         of the model's original input; log both versions.

STEP 4 — (only reached if approved) Your code executes the REAL
    function, exactly as in Day 2's trace — nothing about execution
    itself changes; only whether/when it happens changed.
```

**The precise mechanical point:** `HumanGate` does not change what the model outputs, what a tool does, or how execution works — it inserts exactly one conditional pause between decision and execution, and what happens after a human's response (approve/reject/edit) re-enters the SAME loop machinery Day 2 and Day 3 already built (a rejection is just a new "real result" that the next prompt gets built from, identical in kind to a tool failure triggering a replan in Day 3 ③).

**Why threshold-based and always-ask need different information shown to the human:** for a threshold-tier gate, the confidence score IS load-bearing context (it's the reason the pause triggered at all — showing "62% confident, here's why" helps a human decide fast). For an always-ask tier, the confidence score is shown for context but never used to decide whether to pause (it always pauses) — this distinction matters because always-ask actions are gated by the ACTION'S identity, not by any per-call signal.

---

## ④ Cost gates — the same mechanism, different trigger signal

Everything in ②-③ gates on RISK (reversibility, real-world consequence) or CONFIDENCE (ambiguity). A third, independent trigger is COST — pausing not because the action is risky or uncertain, but because it's expensive, and cumulative expense needs a human check-in before more gets spent.

**Mechanically, this is a running counter your code maintains across the session** (not something the model tracks or reports) — e.g. total dollars spent on paid API calls this session, or total number of tool calls made. A cost gate is a plain threshold check, same shape as the confidence threshold in ②, but on a different variable:

```
Your code, checked before each action executes (regardless of that
action's risk tier):
  runningCost += estimatedCostOf(nextAction)
  if (runningCost > costThreshold) → pause for human approval
    ("This session has spent $4.80 so far; the next action would
    bring it to $5.20, over your $5.00 limit. Proceed?")
```

**Why this is a genuinely separate gate from risk/confidence, not a special case of either:** a cheap, low-risk, high-confidence action (e.g. calling a paid search API with a well-formed, obviously-correct query) can still trip a cost gate purely because the SESSION has accumulated too much spend — the gate has nothing to do with whether THIS PARTICULAR call is risky or uncertain. Conversely, a single very expensive call can trip a cost gate on its own even if it's the first action of the session. Cost gates protect against a different failure mode than risk/confidence gates: not "this one action might be wrong," but "this session, in aggregate, is burning more resources than intended" — the same class of concern Week 7 Day 3's `CostOptimizer` will build dedicated tooling around later; today's cost gate is the human-approval half of that concern, not the optimization half.

---

## ⑤ Logging every intervention — why, and what specifically gets recorded

Day 2 built memory so an agent doesn't lose context across steps and sessions. Human interventions need the same durable-record treatment, for a reason specific to this day's content: **a gate that pauses and gets approved/rejected is a data point about where the SYSTEM'S risk classification or confidence threshold was miscalibrated** — if a threshold-tier action gets rejected by a human 8 times out of 10, that's a signal the threshold is set too low (too permissive) for that action, or the action shouldn't be threshold-tier at all and belongs in always-ask. Without a log, this pattern is invisible — each rejection is seen once, in isolation, and forgotten.

**Concretely, what a `HumanGate` log entry records per intervention:**

```json
{
  "timestamp": "2026-07-17T10:32:00Z",
  "action": { "name": "sendMessage", "input": { "userId": "X", "text": "..." } },
  "tier": "always-ask",
  "modelConfidence": 90,
  "modelJustification": "...",
  "humanDecision": "reject",
  "humanReason": "wrong customer — this was meant for a different user",
  "sessionCostAtTime": 1.20
}
```

This is plain structured logging — no new mechanism beyond "write a record to a file/store each time the gate fires" — but it's what makes tiers and thresholds correctable over time instead of fixed guesses made once at design time and never revisited.

---

## ⑥ Summary

| Gate type | Triggers on | Who/what decides the threshold | Example |
|---|---|---|---|
| Always-ask | The action's identity — irreversible or real-world-consequential, full stop | Human, at tool-registration time, once | `sendMessage` to a real customer, `deleteRecord`, `chargePayment` |
| Never-ask | The action's identity — read-only, no side effects | Human, at tool-registration time, once | `searchWeb`, `readFile`, `getAccountStatus` |
| Threshold-based | The model's self-reported confidence score for THIS specific call, compared against a per-action threshold | Human sets the threshold; model produces the per-call confidence number | `writeFile` overwriting an existing file, `sendMessage` to an internal channel |
| Cost gate | A running session-level counter (spend or call count) crossing a limit | Human sets the limit | Any paid-API action, once cumulative session cost crosses a dollar threshold |

- The gate sits in exactly one place in the executor loop: between the model deciding an action and your code executing it — nowhere else.
- Risk tier is a property of the TOOL, assigned once at registration (same place Week 3 Day 1's `ToolRegistry` already declares name/description/schema) — it is not something the model decides at runtime.
- Confidence is a self-reported number produced via the same structured-output mechanism as any other structured field, and it is a heuristic proxy for ambiguity, not a certified probability — which is exactly why always-ask actions skip it entirely rather than trusting a high self-reported score.
- A human's rejection isn't a dead end — it re-enters the loop as a new real result, using the identical mechanism Day 3 used for a failed tool call triggering a replan.
- Cost gates are a third, independent trigger axis (aggregate session spend), distinct from per-action risk or per-call confidence — a cheap, high-confidence, low-risk action can still trip one.
- Logging every intervention is what makes tiers and thresholds correctable over time — a rejection pattern on one action is the concrete signal that its tier or threshold was set wrong.
