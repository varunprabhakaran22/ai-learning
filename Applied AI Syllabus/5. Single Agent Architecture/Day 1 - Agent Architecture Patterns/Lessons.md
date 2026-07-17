# Day 1 Lessons — Agent Architecture Patterns

## Part A — "LLM agent architecture patterns"
_(not yet read — log notes here after reading)_

## Part B — Anthropic agent design docs
_(not yet read — log notes here after reading)_

## Part C — Experiment: map 3 real products to the four pillars
Per the syllabus showcase task: pick Cursor, Perplexity, and Claude Code, and for each one identify (as best as observable from using the product, not internal source access):
- **Tools/Action** — what can it actually do in the world? (edit files, run terminal commands, search the web, call APIs)
- **Planning** — does it visibly break a request into subtasks? Is that plan shown to the user, or implicit?
- **Memory** — what persists across a session vs across separate sessions? (e.g. Claude Code's project-level file-based memory system vs a pure in-context chat)
- **Executor** — how does it decide when it's "done" with a request? Does it ever visibly re-plan mid-task?

Write this up as the showcase task's actual deliverable: a system diagram (planner/memory/tools/executor) + written explanation per component, per product — intended to be posted as a LinkedIn article.
