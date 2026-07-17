# Day 4 — Reasoning Models & When to Use Them

---

## ① CoT You Write vs. CoT the Model Does Itself

Day 1 built chain-of-thought by *prompting* a standard model to show its steps — you asked for it, and the reasoning appeared as regular visible output tokens. Reasoning models (Claude with extended thinking, o3, etc.) do a version of this **natively**, without you needing to ask:

```
Standard model + CoT prompt:
  you write: "think step by step" → model writes visible reasoning
  as part of its normal output → then the final answer
  (this is Day 1's technique — prompting-level control)

Reasoning model:
  the model generates an internal reasoning process BEFORE producing
  the final answer — often in a separate "thinking" section, sometimes
  using more extensive/deeper exploration than a standard model would
  produce even if CoT-prompted
  (this is architectural/training-level — built into how the model
  was trained to behave, not something you're triggering with wording)
```

**Key distinction:** Day 1's CoT is a technique you apply to any model via the prompt. Extended thinking is a *mode* specific models have, where the reasoning step is a first-class part of how the model was trained to respond — you're not tricking a standard model into showing work, you're using a model built to think before answering.

---

## ② The Core Tradeoff: Accuracy vs Cost and Latency

Reusing the fact that output tokens are generated one at a time — each new token requires re-processing everything before it, so it can't be parallelized like reading input can, making output tokens both pricier and slower than input tokens: reasoning models spend extra tokens on the thinking phase *before* the visible/final answer, and those thinking tokens are still generated sequentially — so the tradeoff is direct and mechanical, not just a vague "smarter but slower":

```
Standard model:    input → (relatively few generation steps) → answer
                    fast, cheap, good enough for straightforward tasks

Reasoning model:    input → (many internal reasoning steps, billed as
                    output tokens even if not always shown) → answer
                    slower, costlier, but more accurate on genuinely
                    hard multi-step problems
```

**Why this isn't "always use the smarter one":** the extra thinking tokens cost money and time whether or not the task actually needed them. Day 1 already showed CoT does roughly nothing for simple lookups, since a fact retrieval needs no "scratch space" to reason through — reasoning models have the same ceiling: paying for deep internal reasoning on a task that had no reasoning to do is pure waste, not "extra safety."

---

## ③ When Reasoning Models Help vs When They're Overkill

```
Helps a lot:
  - multi-step math/logic problems
  - tasks with many constraints to juggle simultaneously
  - problems where a standard model's first instinct is
    often wrong and needs correction through deeper exploration
  - ambiguous problems benefiting from considering multiple
    approaches before committing to one

Overkill / no benefit:
  - simple factual lookups ("what's the capital of France")
  - straightforward formatting/rewriting tasks
  - classification into a handful of obvious categories
  - anything where a standard model already gets it right
    close to 100% of the time — the reasoning phase has
    nothing to add, you're just paying for idle thinking tokens
```

This is the same shape as Day 1's finding that CoT helps multi-step reasoning but does nothing for simple lookups, just moved up a level: the *decision of which model to use* now carries the same "does this task actually need reasoning" judgment that CoT-vs-no-CoT required per prompt.

---

## ④ Task Classification as the Routing Decision

Since the tradeoff between accuracy and cost/latency depends entirely on task type, the practical system design is: classify the incoming task *before* calling any model, then route to the model/preset suited to that classification.

```
incoming task
      ↓
classify: simple / complex / creative / analytical
      ↓
   simple      → standard model, factual preset (Week 1 Day 3 — Temperature, Top-P, and Parameter Control)
   complex     → reasoning model (pay the extra cost — task warrants it)
   creative    → standard model, creative preset (higher temperature)
   analytical  → reasoning model or standard model depending on depth needed
```

**This directly reuses Week 1 Day 3 — Temperature, Top-P, and Parameter Control's `ParameterPreset` system** — reasoning-model-or-not is now another dimension of the same routing decision that temperature/top-p already was. The showcase task (`ModelRouter`) is the piece of code that makes this decision automatically instead of you manually picking a model every time.

---

## ⑤ Log the Routing Decision, Not Just the Result

Because the classification step determines which model gets used and thus a cost/latency outcome, a routing system needs to record *why* it sent a task where it did — otherwise you can't audit whether the router is making good decisions over time.

```
Without logging:  task comes in → routed somewhere → answer comes back
                   → if costs balloon later, you have no way to tell
                     whether misclassification is the cause

With logging:      task comes in → classified as "complex" (reasoning
                   trigger: detected multi-step math) → routed to
                   reasoning model → logged: {task, classification,
                   model_used, reasoning}
                   → later, you can review: was "complex" actually
                     complex, or is the classifier over-triggering?
```

This is the same instinct as Day 4 Week 1's "log what was dropped" for the sliding window, and Day 2's validation-error logging — every automated decision that trades cost for something (context, retries, model tier) should leave a trace explaining itself.

---

## ⑥ Switching Models Mid-Conversation — Why the History Doesn't Care

Because the model is stateless — every API call starts fresh with no memory of past calls — "conversation history" was never actually stored by the model — it's an array of messages *you* resend on every call. That fact has a direct consequence for routing: **switching which model you call mid-conversation is just changing the `model` field on the next call.** The same history array works with any model, because no model has an ongoing relationship with past calls — every call is independent, reading whatever messages you hand it.

```
Prompt 1-5 (classified "simple"):
  history = [msg1, reply1, ..., msg5, reply5]
  each call: create({ model: STANDARD_MODEL, messages: history })

Prompt 6 (classified "complex"):
  same history array, no special handling needed to "hand off"
  create({ model: REASONING_MODEL, messages: history })
```

**What actually needs attention when switching, though:**

```
- Tokenizer differences: different model families can tokenize the
  same text differently (Week 1 Day 4 — Token Economics & Context Management). Re-count tokens against the
  NEW model's tokenizer before budgeting, don't reuse the old count.
- Context window differences: if the new model has a smaller window,
  history that fit before may now overflow — re-run the sliding
  window (Week 1 Day 4 — Token Economics & Context Management) against the new budget, not the old one.
- Extended-thinking content: some reasoning-model responses include a
  distinct "thinking" block type in the message. Check whether that
  block needs to be stripped before replaying the history to a
  DIFFERENT model that doesn't expect it.
```

**The core idea:** there is no stateful "session" tied to one model. The routing decision — which model/preset a task gets classified into and sent to — can change every single call without any migration step — the array of past turns is the only thing carried forward, and it's plain data, not something owned by whichever model produced it.

---

## Summary — The Shift From Day 3

```
Day 3 gave you:    prompts have a lifecycle — versioned, tested,
                    compared via a table before you trust a change.

Day 4 adds:        the MODEL CHOICE itself is a lever with the same
                    kind of cost/benefit tradeoff prompting choices
                    have. Reasoning models do CoT natively rather
                    than via prompt trick, cost more in tokens and
                    latency for that reasoning, help a lot on genuinely
                    hard problems and do nothing on easy ones — so the
                    task classification that decides WHICH model to
                    use becomes as important as the prompt itself, and
                    needs the same logging discipline as any other
                    automated tradeoff decision.
```

---

*Next: Lessons.md — Anthropic extended thinking docs, reasoning-vs-standard comparison notes, and the 5-task accuracy/latency/cost experiment*
