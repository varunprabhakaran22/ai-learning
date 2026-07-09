# Day 4 — Lessons

---

## Part A — Anthropic Extended Thinking Docs

**Source:** Anthropic's extended thinking documentation.

Reference material, not core theory — the *concept* (native reasoning phase vs prompted CoT) is in Theory.md `①`. Note here after reading:

```
- How extended thinking is actually invoked (API parameter, budget
  control, whether/how the thinking content is exposed to you)
- Whether thinking tokens are billed the same as output tokens, or
  differently (ties directly into Theory.md ②'s cost tradeoff)
```

*(Fill in after reading — placeholder until you've gone through the docs.)*

---

## Part B — "Reasoning Models vs Standard LLMs — When to Use Them"

**Source:** article/search comparing reasoning and standard models.

```
- Concrete benchmark categories where the gap is largest/smallest
  (cross-check against Theory.md ③'s helps-a-lot vs overkill split)
- Any guidance on detecting "this task needs reasoning" automatically,
  vs a human deciding case by case
```

*(Fill in after reading.)*

---

## Part C — Experiment: 5 Complex Tasks, Standard vs Reasoning Model

**Source:** hands-on experiment, no external article.

```
Task:   pick 5 genuinely complex tasks (multi-step math, logic puzzles,
        constraint-juggling problems), run each on:
          1. a standard model
          2. a reasoning model (extended thinking)

Measure: accuracy, latency, token cost for each task on each model

Record: for which of the 5 tasks the reasoning model's extra cost was
        actually justified by an accuracy gain, and for which it
        wasn't (ties to Theory.md ③) — this is the evidence the
        ModelRouter's classification logic should be based on
```

*(Fill in after running the experiment.)*

---

*Next: Recap.md — your own summary, plus the ModelRouter showcase task*
