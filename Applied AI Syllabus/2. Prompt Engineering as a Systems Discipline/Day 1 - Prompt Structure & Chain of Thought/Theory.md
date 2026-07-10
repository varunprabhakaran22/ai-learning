# Day 1 — Prompt Structure & Chain of Thought

---

## ① Zero-Shot vs Few-Shot vs Chain-of-Thought — Three Different Levers

All three are ways of shaping the model's output *without* touching weights — just changing what's in the prompt. They solve different problems:

```
Zero-shot:        Just ask. No examples, no reasoning scaffold.
                  "What is 17 * 24?"

Few-shot:         Show 2-5 example input→output pairs before the real question.
                  Teaches the FORMAT/STYLE by demonstration, not instruction.
                  "Q: 3*4? A: 12. Q: 5*6? A: 30. Q: 17*24? A:"

Chain-of-Thought: Ask the model to show intermediate reasoning steps before
                  the final answer, instead of jumping straight to it.
                  "Solve step by step: 17 * 24 = ?"
```

**Key distinction:** few-shot fixes *format/style* problems (model doesn't know how you want the answer shaped). CoT fixes *reasoning* problems (model jumps to a wrong answer because it never "worked through" the problem). They're orthogonal — you can combine them (few-shot CoT: show examples that *themselves* contain reasoning steps).

---

## ② Why CoT Works: Tokens Are the Model's Only "Scratch Space"

A transformer has no hidden internal working memory across generation steps beyond the tokens it has already produced — each new token is predicted using everything generated so far (Week 1's stateless/sequential-generation fact, reused here).

```
Without CoT: the model must produce the final answer as close to
             immediately as possible — all the "thinking" has to happen
             in a single forward pass with no scratch space.

With CoT:    each reasoning step the model writes becomes part of the
             input for predicting the next step. The model is literally
             using its own output as external memory to build up to
             a harder answer than it could produce in one shot.
```

**This is why CoT reliably improves accuracy on multi-step problems (math, logic, multi-hop questions) but does roughly nothing for simple lookups** — a fact retrieval doesn't need scratch space, so forcing "steps" just adds tokens without adding reasoning capacity.

---

## ③ Structure Improves Reliability, Not Just Quality

The syllabus's framing: prompt structure isn't about making outputs "nicer" — it's about making them **consistent enough to depend on in a system.**

```
Unstructured prompt → output format varies run to run → downstream code
                       parsing that output breaks unpredictably

Structured prompt   → output format is constrained (few-shot examples pin
                       the shape, CoT pins the reasoning path, explicit
                       output-format instructions pin the final structure)
                       → downstream code can trust the shape
```

Reliability here means: **run the same prompt N times, and the variance in output shape/quality goes down.** That's a testable, measurable property — which is why Prompt Engineering as a Systems Discipline Day 3 — Prompt Versioning & Testing treats prompts as things you score across runs, not just read once and judge by eye.

---

## ④ Few-Shot Examples Teach by Pattern-Matching, Not Instruction

A model given examples doesn't "learn a rule" the way training does — it pattern-matches the shape of the demonstrations and continues that pattern. This has practical consequences:

```
Bad few-shot: examples are inconsistent with each other in format
              → model has no single pattern to lock onto → format still varies

Bad few-shot: examples don't cover edge cases you actually care about
              → model has no precedent for those cases → falls back to
                its own default behavior on them

Good few-shot: 2-5 examples, CONSISTENT format, covering the range of
               inputs you expect (including at least one edge case)
```

**Order and recency matter too** — Week 1's "lost in the middle" fact applies here: the last example shown has outsized influence on the immediate next output, since it's closest to the actual question.

---

## ⑤ Building Prompts as Composable Pieces

The showcase task (`PromptBuilder`) reflects a specific mental model: a prompt is not one hand-written string, it's a **composition of independent, addable pieces**:

```
context          → background info the model needs but isn't the question itself
examples          → the few-shot demonstrations (③, ④)
chain-of-thought  → an instruction/scaffold telling the model to reason before answering
output format     → explicit shape constraint for the final answer (sets up Day 2)
```

Treating these as separate, addable pieces (rather than one prose paragraph) is what makes prompts **versionable and testable** — you can change just the CoT instruction and re-run the same test suite, isolating what changed instead of re-writing the whole prompt and losing track of why output shifted.

---

## Summary — The Shift From Week 1

```
Week 1 gave you:   the model as a stateless, probabilistic, token-metered
                    function. You controlled temperature/params and
                    managed context window budget.

Prompt Engineering as a Systems Discipline Day 1 — Prompt Structure & Chain of Thought adds: the model's OUTPUT QUALITY is also something you
                    engineer via prompt structure — not just parameters.
                    Few-shot fixes format, CoT fixes reasoning (by giving
                    the model scratch space in its own output tokens),
                    and both exist to make outputs reliable enough for
                    code downstream to depend on.
```

---

*Next: Lessons.md — chain-of-thought prompting paper, Anthropic prompt engineering guide, and the zero-shot/CoT/few-shot-CoT accuracy experiment*
