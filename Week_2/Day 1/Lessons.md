# Day 1 — Lessons

---

## Part A — Chain-of-Thought Prompting Paper (Wei et al.)

**Source:** "Chain-of-Thought Prompting Elicits Reasoning in Large Language Models" (Wei et al., 2022).

Reference material, not core theory — the *concept* (CoT gives the model scratch space via its own output tokens) is in Theory.md `②`. Note here after reading:

```
- The actual experimental results (which model sizes showed the effect,
  how large the accuracy jump was on the benchmarks used)
- Any caveat the paper raises about when CoT does NOT help
  (ties back to Theory.md ② — simple lookup tasks)
```

*(Fill in after reading — placeholder until you've gone through the paper.)*

---

## Part B — Anthropic Prompt Engineering Guide

**Source:** Anthropic's prompt engineering documentation.

```
- Anthropic-specific syntax/conventions for structuring prompts
  (e.g. XML tags for sectioning context/examples/instructions)
- Any Anthropic-specific guidance on few-shot example count or ordering
```

*(Fill in after reading.)*

---

## Part C — Experiment: Zero-Shot vs CoT vs Few-Shot CoT Accuracy

**Source:** Hands-on experiment, no external article.

```
Task:   pick one math/logic problem type, run 10 trials each of:
          1. zero-shot        ("What is X?")
          2. CoT              ("Solve step by step: X")
          3. few-shot CoT     (2-3 worked examples, then X)

Measure: accuracy across the 10 runs per method

Record: which method won, and whether the gap matches the
        Theory.md ② prediction (CoT should help most on
        multi-step problems, least on simple recall)
```

*(Fill in after running the experiment.)*

---

*Next: Recap.md — your own summary, plus the PromptBuilder showcase task*
