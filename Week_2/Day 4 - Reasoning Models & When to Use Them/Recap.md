# Day 4 Recap — Reasoning Models & When to Use Them

## Native reasoning vs prompted CoT
- Day 1's CoT: you prompt a standard model to "think step by step" — reasoning shows up as normal visible output tokens, triggered by wording.
- Reasoning models (extended thinking): the model generates an internal reasoning phase natively, built into how it was trained — not something you're tricking it into via a prompt.

## The core tradeoff: accuracy vs cost/latency
- Thinking tokens are still generated sequentially and billed like output tokens (Week 1's cost asymmetry) — more reasoning = more money + time, mechanically, not just vaguely "slower."
- Paying for deep reasoning on a task that didn't need it is pure waste, same as CoT-prompting a simple lookup does nothing (Day 1).

## When it helps vs when it's overkill
- Helps: multi-step math/logic, many simultaneous constraints, problems where a standard model's first instinct is often wrong.
- Overkill: simple facts, straightforward formatting, obvious classification — anything a standard model already nails.

## Task classification drives the routing decision
- Classify the task first (simple/complex/creative/analytical), then route to the model + preset suited to it.
- Same idea as Week 1 Day 3's ParameterPreset — model choice is just another dimension of that same routing decision, not a separate system.

## Log the routing decision, not just the answer
- Need to record *why* a task got routed where it did, so cost blowups later can be traced back to a bad classification instead of staying a mystery.
- Same instinct as Week 1's "log what was dropped" and Day 2's validation-error logging — every automated tradeoff decision should leave a trace.

## Interview gotcha — using an LLM to do the classifying is itself a risk
- If `classifyTask()` is itself an LLM call, it adds a round-trip (cost + latency) before the real work even starts.
- Worse: a misclassification fails *silently* — a complex task routed to a cheap/weak model just produces a confidently wrong answer, no crash, no error anywhere to catch it.
- Mitigate: use the cheapest possible model (or a non-LLM heuristic first-pass) for classification, log every routing decision for audit, and default to the *more* capable model when the classifier itself is low-confidence rather than guessing cheap.

## The Overall Shift
```
User:      "Just use the smartest model for everything, it can't hurt."
Engineer:  "It can — every extra reasoning token costs money and
            latency whether the task needed it or not. The model
            itself is a routing decision, same as temperature or a
            prompt preset: classify the task first, send it to the
            model that actually matches its difficulty, and log why,
            so the decision can be audited instead of trusted blindly."
```

## Still need to cover / do
- Run example.js for real — check whether classifyTask() routes all 4 sample tasks the way expected
- Run the actual 5-task standard-vs-reasoning experiment (Lessons.md Part C), record where the extra cost was/wasn't justified
- Read Anthropic extended thinking docs + reasoning-vs-standard comparison (Lessons.md Parts A/B), fill in real notes, especially how thinking tokens are billed
- Week 2 Day 5: Week 2 Integration Project — Prompt Engineering Dashboard
