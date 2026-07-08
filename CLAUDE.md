# AI Learning Notes — Project Guide

This project is a self-directed AI/LLM engineering curriculum (see `Syllabus/AI.md`). Notes are organized in `Day N/` folders.

**Scope:** everything below applies only to `Day N/` folders. The `Claude Code in Action/` folder has its own `CLAUDE.md` with separate rules (it's a different curriculum — the Anthropic Skilljar course, not the `Syllabus/AI.md` one).

## Structure per day
- `Theory.md` — the core mental model for the day's topic: mechanics/facts the user must know and will keep referencing. Self-contained, no external source needed to make sense of it. If a concept is "core" (would show up in Recap as a must-know), it belongs here — regardless of how deep/technical it is. **Any new syntax, API field, rule, or definition introduced while writing Theory.md must be explicitly covered in Theory.md itself** — never left implicit or assumed as "obvious," even if it seems minor (e.g. what `stop_reason` is, where it comes from, why it can't be hallucinated). If it's not written down, the user will end up guessing at it instead of knowing it.
  - **Always go one level under the mechanism, not just to it.** A mock interview (2026-07-08, covering Weeks 1–3) surfaced a recurring gap: the user's answers consistently land on the right *behavior/direction* (what to do, that something is a trade-off) but stop before the *underlying mechanism* (why it happens at the token/API/architecture level) and before *concrete specifics* (a named term, an exact field, a number). Theory.md must not stop at "X is a trade-off" or "the model decides based on Y" — it must state the actual mechanism underneath: e.g. not just "temperature=0 is deterministic" but why it can still vary (greedy decoding + floating-point non-associativity in batched GPU execution); not just "structured output enforces JSON" but how (constrained decoding masks invalid tokens at the sampling layer); not just "tool descriptions matter" but naming the actual failure class when they don't (e.g. SSRF, not just "bad description"). When writing or revising Theory.md, ask "if this exact concept were probed one level deeper in an interview, is the next-level answer already written down here?" — if not, add it.
  - This mechanism-depth requirement applies to Theory.md content itself, going forward — it is separate from and does not apply to interview-style Q&A gotchas (those get captured live during mock interviews, not pre-written into Theory).
- `Lessons.md` — notes tied to a specific external source (an article, paper, video) or hands-on experiments. Always name the source at the top of each section (e.g. "Part A — The Illustrated Transformer (Jay Alammar)"). If a section has no external source and no experiment — it's core theory, and belongs in Theory.md instead.
- `Recap.md` — the user's own minimal summary of what they understood, written **after** reading Theory/Lessons. Keep this short: key facts/rules only, no long explanations, no dumping source content. Include a short "still need to cover" list pointing to what's next.
- `example.js` — small runnable code example tying together the day's concepts

## Code style for examples
- No classes. Use plain functions and plain objects/config — even if the syllabus showcase task suggests a class-based design (e.g. "Build a PersonaEngine class"). Keep the concept demonstrated, skip the class wrapper.
- Keep examples minimal — just enough to demonstrate the concept, not production-grade.

## Explanations
- Whenever explaining a flow/process (e.g. a request loop, a multi-step mechanic), lead with an ASCII flow diagram before the prose walkthrough — diagrams first makes it easier to follow.
- Every code example (`example.js`, or any `mcp-*.js`/multi-file example) must have an ASCII flow diagram showing its actual runtime flow (who calls what, in what order, what data passes between steps) in its accompanying explanation doc — not just prose walkthroughs.
