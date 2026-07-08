# Controlling Context

Source: [Claude Code in Action — Controlling context](https://anthropic.skilljar.com/claude-code-in-action/303241)

## Interrupting with Escape
Press **Escape** to stop Claude mid-response and redirect it. Claude keeps the work done so far — it doesn't discard progress, just stops generating further.

**Why it matters:** if Claude starts scoping a task too broadly (e.g. you asked for tests on one function and it plans tests for five), interrupt and narrow the ask instead of letting it run to completion and re-explaining.

## Escape + Memory: fixing repeated mistakes
When Claude makes the same mistake across conversations:
1. Press **Escape** to stop the current response.
2. Run `/memory` (opens `CLAUDE.md` — and any `CLAUDE.local.md`/rules files loaded in the session — in your editor) or edit the file directly, and add the correction.
3. Continue the conversation with the fix in place.

This is how a one-off correction becomes a standing rule instead of something you repeat every session. See also [Adding context.md](Adding context.md) for what belongs in `CLAUDE.md`.

**Gotcha:** the course material mentions an older `#` shortcut for quick-adding memories, superseded by `/memory`. This isn't documented in current Claude Code — treat it as retired/unverified rather than relying on it.

## Rewinding conversations
Press **Escape twice** (when the input box is empty), or run `/rewind` (alias `/checkpoint`), to open a menu of earlier points in the conversation and jump back.

Use this to drop accumulated noise — e.g. a long debugging detour — while keeping the useful parts (Claude's built-up understanding of your codebase) intact.

## `/compact` vs `/clear`
| Command | Effect | Use when |
|---|---|---|
| `/compact` | Summarizes the whole conversation so far, preserving key learned context (optionally pass focus instructions) | Continuing to related tasks in a long conversation — you want to keep what Claude has learned |
| `/clear` | Starts a new conversation with empty context | Switching to an unrelated task where old context would just confuse Claude |

**Gotcha:** `/clear` doesn't delete anything — the old conversation stays reachable via `/resume`.

## Key takeaway
- Escape = stop and redirect mid-response; work done so far is kept.
- Escape+`/memory` = the pattern for turning a repeated mistake into a permanent `CLAUDE.md` rule.
- Double-Escape / `/rewind` = jump back to an earlier point, shedding distracting context while keeping useful understanding.
- `/compact` preserves learned context for related follow-up work; `/clear` wipes context for unrelated work (but `/resume` can always bring the old conversation back).
- The `#` quick-memory shortcut from older material isn't confirmed in current Claude Code — use `/memory` instead.
