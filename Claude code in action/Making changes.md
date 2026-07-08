# Making Changes

Source: [Claude Code in Action — Making changes](https://anthropic.skilljar.com/claude-code-in-action/303241)

## Using screenshots for precise communication
Screenshots help Claude understand exactly what part of the UI you mean, instead of describing it in words.

- Paste with **Ctrl+V** on most platforms (this shortcut is specifically for pasting screenshots into the chat, not text).
- **Gotcha:** the exact key varies by terminal — WSL/Windows terminals that intercept `Ctrl+V` need `Alt+V`; macOS iTerm2 needs `Cmd+V` instead.
- After pasting, ask Claude to make specific changes to that area.

## Planning Mode
For complex tasks needing broad codebase exploration before making changes.

Enable with `/plan`, or **Shift+Tab twice** (once if already auto-accepting edits).

In Planning Mode, Claude:
- Reads more files in the project
- Creates a detailed implementation plan
- Shows exactly what it intends to do
- Waits for approval before proceeding

This gives you a chance to review and redirect Claude if it missed something.

**Tip:** Press **Ctrl+G** while reviewing a plan to open it in your text editor, make precise edits, then submit — Claude sees the final edited version.

## Effort level: how hard Claude thinks
By default, Claude reasons before answering (shown as "still thinking"). Press **Ctrl+O** to open the transcript viewer (detailed tool usage/execution) — this is not the same as seeing extended-thinking content. Extended thinking itself is toggled separately with **Option+T** (macOS) / **Alt+T** (Windows/Linux).

Control reasoning depth with `/effort`:
- Levels range from `low` (faster/cheaper) up through `medium`, `high`, `xhigh`, to `max`/`ultracode` (reasons longest, `ultracode` also enables automatic workflow orchestration).
- Default depends on your model and plan; `/effort` shows your current level.

**Gotcha:** the course mentions a per-prompt "ultrathink" keyword for one-off deeper reasoning — this isn't in current Claude Code docs. Use `Alt+T`/`Option+T` to toggle extended thinking, or bump `/effort` if you need more reasoning on a specific task.

## Planning Mode vs. Effort level

| Use **Planning Mode** for | Use higher **Effort** for |
|---|---|
| Tasks requiring broad codebase understanding | Complex logic problems |
| Multi-step implementations | Debugging difficult issues |
| Changes affecting multiple files/components | Algorithmic challenges |

Both can be combined for tasks needing breadth *and* depth — but both consume additional tokens, so there's a cost tradeoff.

## Key takeaway
- Paste screenshots into chat with Ctrl+V (Alt+V on WSL, Cmd+V on macOS iTerm2) instead of describing UI in words.
- Planning Mode (`/plan` or Shift+Tab twice) = read broadly, plan, wait for approval — use for multi-file/multi-step changes.
- Ctrl+G opens the plan in your editor for precise edits before submitting.
- `/effort` controls reasoning depth (`low` → `max`/`ultracode`); Ctrl+O opens the transcript viewer, not thinking content — use Alt+T/Option+T to toggle extended thinking.
- Planning Mode = breadth, Effort = depth; combine both only when a task genuinely needs both, since each costs tokens.
