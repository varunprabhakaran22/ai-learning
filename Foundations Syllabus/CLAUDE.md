# Foundations Syllabus — Project Guide

This project is the **classical ML / DL / NLP foundations layer**, sourced from `02.Terminologies Mastery.pdf` (the "Agentic AI Program Prerequisites" PDF — 80 terms, 30 days, across Python/ML/DL/NLP). It is scheduled to start **after** `Applied AI Syllbus/` (the JS-based, hand-built-primitives AI Engineer track) is finished — see `MI syllabus/Syllabus.md`, which already flagged this as "Layer 1+2 — deferred until after the AI Engineer path."

**Relationship to other curricula in this repo (all separate, independently paced):**
- `Applied AI Syllbus/` — JS/TS, hand-rolls LLM/agent/RAG primitives before naming the framework. Different domain (applied AI engineering, not classical ML). No day-for-day correspondence, but **this syllabus's depth bar matches it exactly** — see below.
- `MI syllabus/` — the meta-map explaining why this foundations layer exists and where it sits relative to the AI Engineer vs ML Engineer paths. Read this first if the "why" is unclear.

There is no separate Python-fundamentals folder — it was removed. **This syllabus is the only place core Python and the data-science stack are taught**, covering the PDF's own Python-topic term list end-to-end (data structures, control flow, functions, OOP, modules, NumPy, Pandas, etc. — see `Syllabus/Foundations.md`).

**Scope:** exactly the 4 topic areas and 80 terms from the PDF — Python (full language + data-science stack), Machine Learning (classical, scikit-learn-based), Deep Learning (neural net fundamentals, framework-agnostic with PyTorch/Keras examples), NLP (classical + into transformers/LLMs, bridging back into `Applied AI Syllbus` territory at the very end). **The PDF supplies the topic list and day counts only — not the depth.** No topics are added beyond the PDF's 80 terms; depth of coverage is decided per-day when actually writing content, not by the PDF.

## Workflow — interactive, not written upfront

Content is **not** pre-written for all days in one pass. Per day, the loop is:

1. Write `Theory.md` for the day's topic(s), at the depth bar below.
2. User reads it and raises doubts/questions — possibly with an example or diagram walked through live.
3. **Rewrite `Theory.md`** to actually close the gap the doubt revealed — not a patch/addendum, fold the clarification into the flow so it reads as one coherent document, per the "one continuous flow" rule below.
4. Only once the user is satisfied, `Recap.md` gets written.
5. Move to the next day.

Do not get ahead of this loop by pre-writing multiple days' `Theory.md` files in advance.

## Structure per day

Same contract as `Applied AI Syllbus/CLAUDE.md` — full depth, no lighter treatment for Python/data-science topics just because they're "fundamentals":

- `Theory.md` — the core mental model for the day's topic: mechanics/facts the user must know and will keep referencing. Self-contained, no external source needed. **Build from true zero** — never open on the deep mechanism; establish the plain-language problem first, then layer in depth. Any new syntax, API call, formula, or term introduced must be explicitly explained here, never left implicit or assumed obvious. **No forward-referencing a term to a later day as a substitute for explaining it now** — if a term is named to support an argument, explain it to at least a working level in that same file, even if it gets fuller treatment later.
  - **Target bar:** dense enough to cover the topic at the depth a serious ML/AI interview would probe, while still assuming zero prior knowledge of that specific concept — depth and beginner-friendliness are not a trade-off, per the same rule already proven out in `Applied AI Syllbus/CLAUDE.md`. This applies equally to core Python topics (e.g. decorators, generators, OOP) as it does to ML/DL/NLP topics — no topic in this syllabus gets a shallower "just the basics" pass.
  - Read top-to-bottom as one continuous flow — never "if you're familiar with X..." or assume a skip is safe within the same file. Carrying forward a concept already built up in an **earlier day** of this same syllabus is fine.
  - Lead with an ASCII flow/diagram before prose whenever explaining a multi-step process (e.g. gradient descent's update loop, the attention mechanism, a training loop, how the Python interpreter executes a script).
- `Recap.md` — the user's own short summary, written after the `Theory.md` ↔ doubt ↔ revise loop above has settled. Key facts/rules only, no long explanations. Include a short "still need to cover" list.
- `example.py` — a small runnable script demonstrating the day's concept.

No `Lessons.md` unless a day references a specific external paper/article/video.

## Code style for examples

- AI/ML-flavored toy examples throughout — text/number crunching, small classification/regression tasks on tiny built-in or synthetic datasets — never generic app-building (todo lists, calculators).
- Use the standard data-science stack where the topic calls for it: NumPy, Pandas, Matplotlib/Seaborn, Scikit-learn (ML topics), PyTorch or Keras (DL topics — pick one and stay consistent throughout), NLTK/spaCy (NLP topics, classical only — transformer-era NLP defers to Hugging Face, already used in `Applied AI Syllbus`).
- Keep examples minimal — just enough to demonstrate the day's concept, not production-grade.

## Explanations

- Whenever explaining a flow/process (training loop, forward/backward pass, tokenization pipeline, interpreter execution), lead with an ASCII flow diagram before the prose walkthrough.

## Status

Only `Syllabus/Foundations.md` (the full 30-day roadmap across all 4 topic areas — day titles and sequencing only, no per-term coverage table) is written so far. Per-day `Theory.md`/`Recap.md`/`example.py` files are authored one at a time, interactively, following the workflow loop above.
