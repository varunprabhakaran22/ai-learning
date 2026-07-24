# Day 3 Recap — Planning & Task Decomposition

## What a plan actually is
Not a new model capability — the same "structured prompt in, structured text out" pattern as any other call, just applied once to the whole task instead of once per action: one LLM call outputs an ordered subtask list, each with a description, a `dependsOn` list (by subtask ID), and which tool it likely needs. Your code then walks `dependsOn` as a dependency graph (a topological sort) to decide which subtask is eligible to run next — a subtask can't start until every ID in its `dependsOn` is marked complete.

**From our discussion:** the diff/branching approach at any point (one path vs. several candidates) is a choice made by the PROMPT your code sends, not something the model spontaneously decides at runtime — your code chooses whether to ask for "one next step" or "N candidate next-steps" at that decision point.

## Linear planning vs. tree-of-thought
Both use the identical underlying mechanism (an LLM call producing structured subtasks); they differ only in how much alternative-generation and evaluation happens before committing.
- **Linear planning:** one ordered list, executed top to bottom. Correct by default when the task is well-understood upfront — there's no meaningfully different alternative decomposition worth paying extra calls for.
- **Tree-of-thought:** at a genuinely ambiguous decision point, generate N candidate next-steps in parallel, run a SEPARATE evaluation call to rank them, continue down the winner, abandon the rest. Costs roughly N generation calls + 1 evaluation call per branch point — 5-10x linear's cost for a task with 2-3 branch points — justified only when a wrong first guess is expensive to recover from.

**From our discussion:** replanning and tree-of-thought are NOT the same thing, even though both can look like "the model considers a different approach." Tree-of-thought is about upfront ambiguity at ONE decision point (generate alternatives, rank, pick one, then proceed linearly again). Replanning is a reaction to a plan going stale AFTER a real result comes back — it can happen to a purely linear plan just as easily as to a ToT-chosen branch; it's a different axis (staleness) from ToT's axis (breadth of exploration at a decision point).

## Why plans go stale, and what replanning is as code
A plan is generated upfront from the model's best GUESS, before any real tool result exists — so it can be wrong in ways only discoverable mid-execution (e.g. a search step assumed to return usable results comes back empty because the competitor renamed their product line). Replanning is the exact same structured-list-generation call run again, but now given the plan-so-far (what's already done) plus the specific real outcome that broke an assumption — not a fresh plan from scratch, and not a special model capability.

The trigger is a code-level check, not a model decision: after each subtask executes, your code compares the real tool result against what the plan's remaining steps assume. Two concrete triggers: (a) a tool call fails/returns empty where success was assumed, (b) a result directly contradicts a later step's assumption. Replanning is NOT run by default on every step — only conditionally, when one of these triggers fires.

## The three named failure modes, one level under the label
- **Stale plans** — no built-in mechanism to notice a broken assumption, because the plan was generated once from predicted (not real) outcomes. Fixed by the executor-loop check above, not by "writing a better plan."
- **Over-decomposition** — the planning prompt under-specifies granularity, so the model defaults to a finer breakdown than the registered tools need (e.g. splitting "send the email" into 4 fake steps instead of one `sendMessage` call). Fix: explicitly list available tools in the planning prompt and state that one subtask = one tool call or one distinct reasoning step.
- **Under-specified subtasks** — a step like "research the competitor" has no tool name, no input, no success criterion. Same class of problem as Week 2 Day 2's structured-output validation, just applied to plan quality: the plan's schema should REQUIRE actionable fields (a real tool name, concrete inputs) and retry-on-failure if a generated step is missing them.

## Claude Code's `/goal` — decoupling actor from stopping-condition judge
In a plain executor loop, the SAME model doing the work also decides when it's done — a real bug risk (a model can be wrong about being finished). `/goal` fixes this architecturally: a plain-language completion condition is written upfront, and after every turn a SEPARATE model call (often cheaper) is asked only "is this condition satisfied, yes/no" — only that judge's "yes" stops the loop, never the acting model's own self-report.

**From our discussion:** yes, our own executor/`TaskPlanner` can build the identical pattern by hand — fire a second LLM call after each subtask (or at the end) with the plain-language goal + current state, and let ONLY that call's yes/no answer stop the loop, instead of checking "is the subtask list empty." Same primitive as `/goal`, just hand-built instead of shipped as a product feature — checking "all subtasks done" is a weaker signal than checking "the actual goal condition is true," because a plan can finish every listed step and still not satisfy the real intent (e.g. last step ran, but the email that got sent doesn't actually contain the summary due to a formatting bug).

## Task Budgets (brief mention, full depth deferred to Week 7 Day 3)
An advisory token budget with a running countdown, so the model self-prioritizes toward wrapping up gracefully as budget depletes — different from a hard `maxIterations` cap, which is external/abrupt with no awareness given to the model that a cutoff is coming.

## Still need to cover / do
- Read Lessons.md Parts A/B ("task decomposition LLM agents", "tree of thoughts paper") — not yet read.
- Run Lessons.md Part C's experiment: same 5-step task under no-planning vs. plan-first vs. dynamic-replanning, compare thread-loss/recovery/cost tradeoff.
- `example.js` for Day 3 deferred — no separate TaskPlanner example built yet; folding into a later combined example instead of one per day going forward.
- Single Agent Architecture Day 4 — Human-in-the-Loop Patterns — next up.
