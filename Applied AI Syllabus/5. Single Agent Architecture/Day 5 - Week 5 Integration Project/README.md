# Week 5 Integration Project — Autonomous Task Agent

`example.js` wires together every pillar built across Days 1-4 into one runnable executor loop. Nothing here is a new mechanism — this document explains how the four pieces plug into each other and why each architectural decision was made where it was.

**`example_production.py`** is the same agent, rebuilt with real production packages (LangGraph's `StateGraph` for the executor/planning loop, `InMemorySaver`/`InMemoryStore` for short-term/long-term memory, `langgraph.types.interrupt`/`Command` for a REAL human-approval pause — not a function call that returns instantly, but genuine execution suspension resumed later with a real decision). This is the only production file for all of Week 5 — Days 1-4 each teach one pillar in isolation, too conceptual individually for a standalone production file to make sense; this integration project is the first point where a full production build has a single, substantial answer worth writing out.

## Architecture

```
Goal (natural language)
   -> memory.retrieveRelevant()      [Day 2, reused as-is]
   -> generatePlan()                 [Day 3 ①: one structured-output call]
   -> EXECUTOR LOOP:
        nextEligibleSubtask()        [Day 3 ①: topological sort, plain code]
        decideAction()               [LLM: tool + input + confidence]
        gate.check()                 [Day 4 ③: tier lookup, pause or proceed]
        execute real tool            [Day 1 pillar 1]
        detect broken assumption     [Day 3 ③]
        replan if needed             [Day 3 ③: same generatePlan(), fed the new fact]
   -> memory.commitSessionToLongTerm() [Day 2: summarize + store]
   -> print execution log + gate log
```

## Why each component lives where it does

**Memory is retrieved once, before planning — not per subtask.** The plan itself is generated from the goal plus whatever relevant memory exists at the START of the session (Day 2's exact retrieval mechanism: embed the goal, cosine similarity against stored entries, keep topK). Retrieving memory per-subtask instead would mean re-running a vector search on every loop iteration for no benefit — the relevant context for "should the model know about last Tuesday's expired-card incident" doesn't change subtask-to-subtask within one session.

**The plan is a JSON subtask list with `dependsOn`, and dependency resolution is plain code, never an LLM call.** `nextEligibleSubtask()` is a linear scan checking that every ID in a subtask's `dependsOn` is already marked `done` — this is deliberately NOT delegated to the model. Day 3 ① names this exactly: walking a dependency list is a topological sort, the same class of problem a build system already solves without needing a model in the loop. Asking an LLM "which subtask should run next" on every iteration would be strictly worse: slower, costlier, and non-deterministic for a question that has one correct, checkable answer.

**`HumanGate` sits in exactly one place: between the model's tool decision and the tool's execution.** Not around `decideAction()`, not around `generatePlan()` — only around the moment a real side effect is about to happen. This follows directly from Day 4's core finding: an LLM call has no real-world side effect on its own (it only predicts tokens), so gating it would add friction with no corresponding risk reduction. `TOOL_REGISTRY` tags each tool with a tier ONCE, at registration — `getAccountStatus` is `never-ask` (pure read), `sendMessage` is `always-ask` (irreversible, real-world-consequential), `writeFile` is `threshold-based` (gated on the model's self-reported confidence against an 80 threshold). The tier is never decided at runtime by the model.

**Confidence is requested explicitly in the same call that decides the action, not inferred after the fact.** `decideAction()` asks the model to state a confidence score and justification alongside its tool call, then parses it out of the response text. This mirrors Day 4 ②'s point directly: confidence is a self-reported heuristic proxy for felt ambiguity, not a certified probability — which is also why `always-ask` tools bypass it entirely in `HumanGate.check()` rather than trusting a high self-reported number.

**A human rejection and a broken-assumption tool result both funnel into the SAME replanning call.** `generatePlan()` takes an optional `priorPlanContext` argument used identically whether the trigger was a human saying "no, wrong customer" or a tool returning a result that contradicts what a later step assumed (e.g. `cardStatus: still expired` after the plan assumed the issue would be resolved). This is a deliberate architectural choice reflecting Day 3 ③ + Day 4 ③'s shared point: from the executor's perspective, "human rejected this action" and "tool returned an unexpected result" are the same KIND of event — a real, only-now-known fact that invalidates part of the standing plan — so they should trigger the identical recovery path rather than two separate ad hoc branches.

**`simulateHumanReview()` is the one deliberately fake piece, isolated to a single function.** Everything upstream of it (planning, dependency resolution, tool decisions, tier lookup, confidence scoring) runs for real against the actual Anthropic/OpenAI APIs. The human approval step itself is simulated so the script can run unattended end-to-end — in a real deployment this function is replaced with an actual prompt to a person (CLI input, a web UI, a Slack approval button), and nothing else in the file needs to change, because `HumanGate.check()` was written against the return shape (`{decision, reason}`) rather than against any particular UI.

**The execution log and the gate log are kept as two separate arrays.** `executionLog` records the agent's own operational trace (plans, subtask completions, replans, tool results) — the same kind of record Day 2's episodic memory summarizes at session end. `gateLog` records only human-in-the-loop events (every tier lookup, every confidence check, every approval/rejection) — this is Day 4 ⑤'s point that intervention logs need to answer a different question ("was this tier/threshold calibrated correctly over many runs?") than the operational log answers ("what did the agent actually do this session?"). Merging them would make it harder to later ask "how often does `writeFile` actually get gated" without filtering out unrelated plan/tool noise.

## What's simplified relative to a production version

- `simulateHumanReview` auto-approves everything — a real system pauses and blocks on actual human input here.
- Tool functions (`getAccountStatus`, `sendMessage`, `writeFile`) are fakes returning canned results, not real API/DB/filesystem calls — same simplification Day 2 and Day 4's standalone examples used.
- The broken-assumption detector (`brokeAssumption` in the executor loop) is one hardcoded condition for this specific goal, not a general-purpose comparator — a production version would need a more general way to express "what does the remaining plan assume, and does this result contradict it."
- Cost gates (Day 4 ④) are not implemented here — this integration focuses on risk-tier gating and replanning, the two mechanisms most directly tied to Days 1-4's core content.
