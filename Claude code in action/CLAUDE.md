# Claude Code in Action — Course Notes Guide

This folder tracks lessons from the Anthropic Skilljar course ["Claude Code in Action"](https://anthropic.skilljar.com/claude-code-in-action/303241). It is a **separate curriculum** from the rest of this repo (`Day N/` folders follow the root `CLAUDE.md` instead — do not apply this file's rules there, and don't apply the root file's rules here).

## Purpose
This is a personal learning archive, not a transcript store. The goal: come back months later, re-read a lesson file in under a minute, and walk away sharp on that topic — the kind of practical, precise Claude Code knowledge that distinguishes someone who's actually fluent in the tool from someone who's only skimmed the docs.

## When the user pastes raw lesson text
Do **not** transcribe it as-is. Process it:
1. **Condense** — cut filler, restate in tighter language, use headings/tables/bullets over prose paragraphs.
2. **Add value, not just formatting** — where it's genuinely useful, add:
   - A short **"Why it matters"** note connecting the feature to real workflows or common mistakes.
   - A **"Gotcha"** callout for non-obvious edge cases, defaults, or things easy to misuse.
   - Cross-links to related lessons already in this folder (e.g. "see also Making changes.md — effort level").
   Skip these additions when the source content is already simple/self-evident — don't pad for the sake of it.
3. **Verify before asserting** — if a claim about current Claude Code behavior (a keybinding, command name, flag) seems off or you're unsure it's still accurate, say so rather than repeating it silently. Course content can drift from the shipped product.

## File naming
One `.md` file per lesson, named after the lesson title as given (e.g. `Making changes.md`). Keep the exact filename the user specifies.

## Required structure per lesson file
```markdown
# <Lesson Title>

Source: [Claude Code in Action — <Lesson Title>](https://anthropic.skilljar.com/claude-code-in-action/303241)

## <condensed sections from the lesson, with Why it matters / Gotcha callouts where earned>

## Key takeaway
- 3-5 bullets, one line each, distilled to the point a fast re-read is enough — no re-explaining, just triggering recall.
- Keep these generic to the topic/feature itself — not tied to a specific example, filename, or project detail used earlier in the file. The user may not recall the example by the time they re-read this section, so the takeaway must stand on its own.
```

No separate `Recap.md` file for this folder — the "Key takeaway" section inside each lesson file serves that purpose.

## Editing existing lesson files
These files are living notes, not a one-shot dump. If the user gives feedback, a correction, or new experience with a feature, edit the relevant lesson file in place rather than only appending — keep it accurate and current over being a historical log.
