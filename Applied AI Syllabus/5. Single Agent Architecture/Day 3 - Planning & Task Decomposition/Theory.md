# Day 3 — Planning & Task Decomposition

## ⓪ Where we left off, and the actual problem today solves

Day 1 named planning as one of the four pillars and gave it a one-paragraph treatment: an extra LLM call outputs a structured, ordered subtask list before any tool-calling begins, and your code executes that list. Day 2 then built the memory pillar in full mechanism depth. Today does the same depth pass on planning — not just "the model outputs a todo list," but exactly what breaks a plan, why some tasks need something more expensive than a straight list, and how "notice the plan is wrong, fix it" actually works as code, not just as a phrase.

**The problem, concretely:** without planning, an agent given "research competitor pricing, write a summary, and email it to the team" would have to figure out its next single action from scratch at every step, with no larger structure guiding it. That mostly works for a 1-2 tool-call task (Week 3's ReAct loop), but it degrades as tasks get longer for a specific, nameable reason: at each step the model only sees "what just happened," not "how does this fit into the overall goal" — so it can lose the thread, redo work it already did, or miss a step that isn't obviously implied by the immediately preceding result. Planning fixes this by generating the overall shape of the work ONCE (or re-generating it when needed), so every individual step happens inside a known structure instead of being decided in a vacuum.

---

## ① What a "plan" actually is, mechanically

A plan is not a new kind of object the model understands specially — it's the exact same "structured prompt in, structured text out" pattern from Week 1, just applied to the whole task instead of one action. Concretely:

```
Prompt: "Goal: research competitor pricing, write a summary, and email it
to the team. Break this into an ordered list of subtasks. For each
subtask, state: (1) a short description, (2) which subtasks it depends
on (by number), (3) which tool it will likely need."

Model's output (JSON, enforced via Week 2 Day 2's structured-output pattern):
[
  { "id": 1, "description": "Search web for competitor pricing pages", "dependsOn": [], "tool": "searchWeb" },
  { "id": 2, "description": "Extract pricing details from top 3 results", "dependsOn": [1], "tool": "fetchURL" },
  { "id": 3, "description": "Write a summary of findings", "dependsOn": [2], "tool": null },
  { "id": 4, "description": "Email the summary to the team", "dependsOn": [3], "tool": "sendMessage" }
]
```

That's the entire mechanism: one LLM call, given a goal and asked to output a structured list, using the exact same JSON-schema-enforcement technique as any other structured output call. Nothing here is a new capability of the model — it's the same token-prediction process from Week 1, just prompted to produce "a list of steps" instead of "an answer."

**What your code does with this list — the part that makes it a "plan" instead of just a JSON blob:** it becomes the thing the executor loop (Day 1 pillar 4 / Day 2's `runExecutorLoop`) consults at every iteration to decide which subtask to attempt next, instead of the executor loop asking the model to invent the next action from nothing each time. Concretely, your code walks the `dependsOn` list like a small dependency graph: a subtask is eligible to run only once every ID in its `dependsOn` array has been marked complete. This is exactly a topological sort — the same ordering problem as a build system resolving which files must compile before others, or a task runner resolving job dependencies — just with 3-6 nodes instead of thousands.

---

## ② Linear planning vs. tree-of-thought — two different amounts of exploration

Both strategies use the same underlying mechanism — an LLM call producing structured subtasks — they differ in how much alternative-generation and evaluation happens before committing to a path.

### Linear planning

Generate ONE ordered list (like the 4-step "search → extract → summarize → email" plan above), then execute it top to bottom, only deviating if something fails. This is correct by default whenever the task is well-understood upfront — there's essentially one sane way to decompose it, and exploring alternatives would just cost extra LLM calls for no benefit. "Research pricing → summarize → email" has no meaningfully different alternative decomposition; generating 3 candidate plans and picking the best would be wasted work.

### Tree-of-thought — what it actually is, one level under the name

The name sounds exotic; the mechanism is not. At a decision point where multiple genuinely different approaches exist, instead of asking the model for one next step, you ask for **N candidate next-steps in parallel**, then run a SEPARATE evaluation call that scores or ranks those candidates, then continue down whichever branch scored best — abandoning the others (or keeping a second-best as a fallback).

Concretely, for a task like "figure out why our checkout conversion rate dropped last week" — a genuinely ambiguous diagnostic task with no single obvious first move — a tree-of-thought step looks like:

```
Prompt (generate candidates): "Goal: diagnose why checkout conversion
dropped last week. Propose 3 different first investigative steps,
each pursuing a different hypothesis."

Model's output:
1. "Check for a recent deploy/code change around checkout in the last week"
2. "Check payment provider status/uptime logs for the same window"
3. "Check for a UX/A-B test change that touched the checkout flow"

Prompt (evaluate candidates) — a SEPARATE call, same pattern as Week 2
Day 2's structured output validation, but scoring instead of validating:
"Given these 3 candidate investigative steps: [list above], and this
context: [any available signals, e.g. 'no recent deploys logged'],
rank them by likelihood of finding the actual cause. Return the ranked
order with a one-sentence justification for the top choice."

Model's output: "Rank: 2, 3, 1. Justification: no deploy was logged
this week, which weakens hypothesis 1; payment provider status is the
cheapest to check and would explain a sudden drop if it correlates
with an outage window."
```

Your code then proceeds down branch 2 (check payment provider logs), generating its own next set of candidate branches once that step's real result comes back — later steps can only be built from the real, not-yet-known-in-advance output of earlier ones, just now the "later step" can itself be a fork into multiple candidates rather than a single next action.

**The actual cost/benefit, named precisely:** tree-of-thought costs roughly (N generation calls + 1 evaluation call) at each branching decision point, versus 1 call for linear planning — so for a task with even 2-3 branching points, tree-of-thought can cost 5-10x more LLM calls than linear. That cost is justified ONLY when picking the wrong first approach is expensive to recover from (e.g. hours of wasted investigation down the wrong hypothesis) — for a task where a wrong first step is cheap to notice and correct (most straightforward automation tasks), linear planning plus replanning when a step's real result invalidates a later assumption (re-running the planning call with that new information added) is strictly cheaper and just as effective.

---

## ③ Why plans go stale, and what "replanning" is as actual code

A plan is generated from the model's best guess at the START of the task, before any real tool result exists. This builds on a fact already established about agent execution generally: later steps' content can only be known after earlier steps' REAL results come back — a plan is a prediction made before those real results exist, so it can be wrong in ways only discoverable mid-execution.

**Concretely, how a plan goes stale:** using the earlier "research competitor pricing" plan — step 2 was "extract pricing details from top 3 results" assuming `searchWeb` in step 1 returns usable competitor pages. Suppose step 1's REAL result comes back as: zero relevant results, because the competitor renamed their product line and the search terms no longer match. The plan's step 2 is now impossible to execute as written — not because the model reasoned badly when it wrote the plan, but because the plan was written before this real, only-now-known fact existed.

**Replanning, mechanically — it is just the same "one LLM call outputs a structured subtask list" mechanism run again, with new information added to the prompt:**

```
Prompt: "Original goal: research competitor pricing, write a summary,
email it to the team. Original plan: 1) search web for competitor
pricing pages, 2) extract pricing details from top 3 results, 3) write
a summary of findings, 4) email the summary to the team.
Step 1 ('search web for competitor pricing pages') was executed and
returned: zero relevant results — the search terms may be outdated.
Given this REAL outcome, revise the remaining plan."

Model's output (revised list, steps 2 onward changed):
[
  { "id": 1, "description": "Search web for competitor pricing pages", "status": "done", "result": "no matches" },
  { "id": 2, "description": "Search for the competitor's likely new product name, then retry pricing search", "dependsOn": [1], "tool": "searchWeb" },
  { "id": 3, "description": "Extract pricing details from new results", "dependsOn": [2], "tool": "fetchURL" },
  ... (renumbered rest of original plan, shifted down)
]
```

There is no special "replan" capability in the model — it is the exact same structured-list-generation call used to make the original plan, just given the plan-so-far and the real outcome of whatever just executed, and asked to produce an updated list. **The mechanism that makes this different from just generating a fresh plan from scratch:** the prompt includes what's ALREADY done (so the model doesn't redundantly re-plan completed work) and the specific real result that invalidated the rest — exactly the same principle as later prompts only being buildable using the real output of what came before.

**When your executor loop decides to trigger a replan, concretely — this is a code-level check, not a model decision:** after executing each subtask, your code compares the actual tool result against what the plan's remaining steps assume to be true. Two common concrete triggers: (a) a tool call fails or returns an error/empty result where the plan's next step assumed success, and (b) a tool result contains information that directly contradicts an assumption baked into a later step (e.g. plan assumed "user has one account," result reveals "user has two accounts, ambiguous which to act on"). Absent either trigger, the executor just proceeds to the next eligible subtask in the existing plan — replanning is not run on every step by default, since that would cost an extra LLM call per step for no benefit; it's a conditional recovery step for when reality diverges from the standing plan.

---

## ④ The three named failure modes, one level under the label

Day 1's Recap named these three; here's the mechanism under each label.

**Stale plans** — a plan has no built-in mechanism to notice its own assumptions broke, because it was generated once, upfront, from predicted (not real) outcomes. The fix is not "write a better plan" (no plan can predict every real-world outcome) — it's building the executor-loop check that compares each real tool result against what the plan's remaining steps assume, and triggers a replan when they diverge.

**Over-decomposition** — the planning LLM call breaks a task into needlessly many, needlessly small subtasks (e.g. splitting "send the email" into "open email client," "type subject," "type body," "click send" as four separate plan steps instead of one `sendMessage(userId, text)` tool call). Mechanically, this happens because the planning prompt under-specifies the GRANULARITY it wants — nothing in the prompt tells the model what counts as "one step," so it defaults to whatever granularity feels natural for a text description, which is often finer than what your registered tools actually need. The concrete fix: the planning prompt should explicitly list the available tools (same list the executor will use) and instruct the model that one subtask = one tool call or one clearly distinct non-tool reasoning step — this constrains granularity to match what's actually executable, rather than leaving it to the model's unconstrained judgment.

**Under-specified subtasks** — a step like `"description": "research the competitor"` gives the executor nothing concrete to act on: no tool name, no input values, no success criterion. Mechanically this is a structured-output completeness problem, the same class of issue Week 2 Day 2's `StructuredOutputParser` was built to catch (validate, retry with error feedback if the schema isn't satisfied) — except here "satisfied" needs to mean more than "valid JSON shape"; it needs concrete, actionable fields. The fix: the plan's schema itself should REQUIRE the fields that make a step actionable (a specific tool name from the registered list, or explicit input values/placeholders) and reject/retry a generated plan where a step is missing them — same retry-on-validation-failure loop from Week 2 Day 2, applied to plan quality instead of final-answer format.

---

## ⑤ Real-world tie-in — Claude Code's `/goal` command (2026) and Task Budgets

Two shipped mechanisms map directly onto this day's content, both already flagged briefly in earlier days — here's the full depth.

**`/goal` — decoupling the actor from the stopping-condition judge.** In a plain executor loop (Day 2's `runExecutorLoop`), the SAME model that's doing the work also decides when it's done — which Day 2's Recap already flagged as a real bug risk (a model can be wrong about being finished, or never emit the expected stop signal). Claude Code's `/goal` command fixes this architecturally: you write a plain-language completion condition upfront (e.g. "done when all tests pass and the diff has no lint errors"), and after every turn, a SEPARATE model call — not the acting model, typically a cheaper/faster one — is given the goal text plus the current state and asked only "is this condition satisfied, yes or no." Only that separate judge's "yes" stops the loop; the acting model's own beliefs about being finished are never consulted for the stop decision at all.

**Why this matters for planning specifically, not just for the Day 2 executor loop:** a plan can complete every listed subtask and still not satisfy the actual goal (e.g. the plan's last step ran, but the email that got sent doesn't actually contain the summary due to a formatting bug) — checking "is the plan's task list empty" is a WEAKER signal than checking "is the actual goal condition true," and `/goal`'s separate-judge pattern is what closes that gap. A plan-driven executor that only checks "have I executed every subtask" can report false success; one that also runs an independent goal-check catches cases where the subtasks completed but the real-world outcome still doesn't match intent.

**Task Budgets (Opus 4.7, 2026 beta) — a related but distinct resource-management knob, full depth deferred to Week 7 Day 3.** Briefly: the model is given an advisory token budget with a running countdown, so it self-prioritizes toward wrapping up gracefully as the budget depletes, rather than being forcibly cut off by a hard `maxIterations` cap (Week 3 Day 3 / Day 2's safety net) with no awareness the cutoff is coming. The mechanism difference from `maxIterations`: a hard cap is external and abrupt (the loop just stops, whatever state it's in); a task budget is information GIVEN TO the model so its own planning/replanning decisions (which subtasks to prioritize, when to stop exploring alternatives in a tree-of-thought branch) account for the remaining budget. This is directly relevant to the linear-vs-tree-of-thought cost tradeoff (tree-of-thought costs roughly N generation calls plus 1 evaluation call per branch point, versus 1 call for linear) — a model aware of a shrinking budget could, in principle, choose linear over tree-of-thought exploration on its own when budget is tight, instead of your code having to hard-code that choice upfront.

---

## ⑥ Summary

| Concept | What it actually is | Cost | When to use |
|---|---|---|---|
| Linear planning | One LLM call → ordered subtask list with dependencies, executed top to bottom | 1 call | Task is well-understood upfront, no meaningfully different alternative decomposition |
| Tree-of-thought | N candidate next-steps generated in parallel + 1 separate evaluation call to rank them, continue down the winner | ~N+1 calls per branch point | Genuinely ambiguous task where a wrong first step is expensive to recover from |
| Replanning | The SAME planning call as linear planning, re-run with the plan-so-far + a real outcome that broke an assumption, added to the prompt | 1 call, triggered conditionally | A tool result fails or contradicts an assumption a later step depends on — not run on every step by default |
| Dependency resolution | Your code walks each subtask's `dependsOn` list as a topological sort — a subtask is eligible only once its dependencies are marked complete | Plain code, no LLM call | Every plan-driven executor, to decide execution order |

- A plan is not a new model capability — it's Week 1's structured-prompt-in/structured-text-out pattern, applied once to the whole task instead of once per action.
- Tree-of-thought's cost is precisely N generation calls + 1 evaluation call per branch point versus linear's 1 call — that multiple is what must be justified by a genuinely expensive-to-recover-from wrong first guess, not used by default.
- Stale plans, over-decomposition, and under-specified subtasks all trace back to one root cause each: no built-in staleness check, unconstrained granularity in the planning prompt, and a schema that doesn't require actionable fields, respectively — all three have concrete, code-level fixes, not just "prompt better" advice.
- Claude Code's `/goal` is the shipped, robust version of "how do we know the goal is achieved" — a separate judge model checking the real completion condition, independent of whether the plan's subtask list is empty and independent of the acting model's own self-report.
