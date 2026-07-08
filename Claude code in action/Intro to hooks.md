# Intro to Hooks

Source: [Claude Code in Action — Intro to hooks](https://anthropic.skilljar.com/claude-code-in-action/303241)

## What hooks are
Hooks run your own shell commands before or after Claude calls a tool. Normal flow: your query goes to the model with tool definitions → Claude decides to use a tool → Claude Code executes it → result comes back. Hooks insert a step just before or just after the "execute" step.

```
you → Claude (+ tool defs) → Claude picks a tool
                                     │
                        [PreToolUse hook runs here] → can block or allow
                                     │
                              tool actually executes
                                     │
                       [PostToolUse hook runs here] → can't block, can react
                                     │
                              result returns to Claude
```

**Why it matters:** this is how you turn "Claude edited a file" into "Claude edited a file, and it got auto-formatted / linted / logged" without asking Claude to remember to do that step itself every time.

## PreToolUse vs PostToolUse
| | Runs | Can block the tool call? | Typical use |
|---|---|---|---|
| `PreToolUse` | Before the tool executes | Yes — can reject and return an error to Claude instead | Access control (block reads/edits to specific files), validation |
| `PostToolUse` | After the tool executes | No — the action already happened | Auto-formatting, running tests, logging, giving Claude feedback on what it just did |

## Configuration
Hooks live in a Claude settings file, at one of three scopes:
- `~/.claude/settings.json` — global, applies to all projects.
- `.claude/settings.json` — project-level, shared/committed with the team.
- `.claude/settings.local.json` — project-level, personal/not committed.

Write the JSON by hand, or run `/hooks` inside Claude Code to configure interactively.

## Example: PreToolUse
```json
"PreToolUse": [
  {
    "matcher": "Read",
    "hooks": [
      { "type": "command", "command": "node /home/hooks/read_hook.js" }
    ]
  }
]
```
`matcher` targets which tool the hook fires for (here, `Read`). The command receives details of the attempted tool call and can allow it or block it with an error message sent back to Claude.

## Example: PostToolUse
```json
"PostToolUse": [
  {
    "matcher": "Write|Edit",
    "hooks": [
      { "type": "command", "command": "node /home/hooks/edit_hook.js" }
    ]
  }
]
```
`matcher` here is a regex-style alternation (`Write|Edit`) — the hook fires after either tool runs. Since the write already happened, this can't undo it, but can run a follow-up action (e.g. formatting the just-edited file) or send Claude feedback about it.

**Gotcha:** `matcher` isn't limited to a single literal tool name — the `Write|Edit` example shows it accepts alternation, so one hook entry can cover multiple tool types.

## Practical applications
- **Formatting** — auto-format files after edits (PostToolUse).
- **Testing** — run tests when relevant files change (PostToolUse).
- **Access control** — block reads/edits to specific files (PreToolUse).
- **Code quality** — run linters/type-checkers and feed results back to Claude (PostToolUse).
- **Logging** — track what Claude accessed or modified (either).
- **Validation** — enforce naming/coding conventions (PreToolUse to block, PostToolUse to flag after the fact).

## Key takeaway
- Hooks are shell commands that run immediately before (`PreToolUse`) or after (`PostToolUse`) a tool call, without Claude having to remember to trigger them.
- Only `PreToolUse` can block the tool call outright; `PostToolUse` can only react after the fact.
- `matcher` selects which tool(s) a hook applies to and supports alternation for covering multiple tools in one rule.
- Hooks are configured in a settings file at global, project-shared, or project-personal scope — same three-tier pattern as other Claude Code settings.
- Common uses split along the Pre/Post line: access control and validation belong before the call; formatting, testing, and feedback belong after.
