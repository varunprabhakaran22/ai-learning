# AI Learning Notes — Project Guide

This project is a self-directed AI/LLM engineering curriculum (see `Syllabus/AI.md`). Notes are organized in `Day N/` folders.

## Structure per day
- `Theory.md` — the core mental model for the day's topic: mechanics/facts the user must know and will keep referencing. Self-contained, no external source needed to make sense of it. If a concept is "core" (would show up in Recap as a must-know), it belongs here — regardless of how deep/technical it is.
- `Lessons.md` — notes tied to a specific external source (an article, paper, video) or hands-on experiments. Always name the source at the top of each section (e.g. "Part A — The Illustrated Transformer (Jay Alammar)"). If a section has no external source and no experiment — it's core theory, and belongs in Theory.md instead.
- `Recap.md` — the user's own minimal summary of what they understood, written **after** reading Theory/Lessons. Keep this short: key facts/rules only, no long explanations, no dumping source content. Include a short "still need to cover" list pointing to what's next.
- `example.js` — small runnable code example tying together the day's concepts

## Code style for examples
- No classes. Use plain functions and plain objects/config — even if the syllabus showcase task suggests a class-based design (e.g. "Build a PersonaEngine class"). Keep the concept demonstrated, skip the class wrapper.
- Keep examples minimal — just enough to demonstrate the concept, not production-grade.
