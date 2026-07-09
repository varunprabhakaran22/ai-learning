# Python Fundamentals — Project Guide

Standalone Python-for-AI/ML curriculum, run in parallel with the JS `Week_N` track at an independent pace (see `Syllabus.md` here for the day-by-day roadmap). Not a mirror of the JS syllabus — different days, different topics, no day-for-day correspondence.

**Scope for now:** core Python language fundamentals only — syntax, data structures, control flow, functions, strings, error handling, file I/O, OOP basics, packaging. NumPy, Pandas, and other ML libraries are explicitly out of scope until a future folder — the goal here is comfort with the language itself first.

## Structure per day
- `Theory.md` — the core mental model for the day's topic. Self-contained, no external source needed. Build from true zero: don't open on the deep mechanism, establish the plain-language problem/concept first. Any new syntax or rule introduced must be explicitly explained here, never left implicit.
- `Recap.md` — the user's own short summary, written after reading Theory.md. Key facts/rules only. Include a "still need to cover" list.
- `example.py` — small runnable script demonstrating the day's concepts.

No `Lessons.md` unless a day references a specific external source (article/video) — same rule as the JS track.

## Code style for examples
- Favor AI/ML-flavored toy examples (word/text processing, counting, simple numeric aggregation) over generic app-building examples (todo lists, calculators) — the goal is to build comfort reading code shaped like what NumPy/Pandas/ML code will look like later, not to build apps.
- Keep examples minimal — just enough to demonstrate the day's concept.

## Explanations
- Lead with an ASCII flow diagram before prose when explaining any multi-step process (e.g. how a script executes, a loop's flow).
