# Custom Commands

Source: [Claude Code in Action — Custom commands](https://anthropic.skilljar.com/claude-code-in-action/303241)

## Creating a custom command
1. Find (or create) the `.claude/commands/` folder in your project.
2. Add a markdown file named after the command, e.g. `audit.md`.
3. The filename becomes the command: `audit.md` → `/audit`.

The file body is the prompt Claude runs when you invoke the command — e.g. an `/audit` command whose body says to run `npm audit`, apply `npm audit fix`, then run tests to confirm nothing broke.

Claude Code picks up new command files automatically within the session — no restart needed.

**Gotcha:** that live pickup applies to editing existing command files. Adding a brand-new *top-level* commands/skills directory for the first time can require a restart before it's watched.

## Commands with arguments
Use the `$ARGUMENTS` placeholder in the file body — it's replaced with whatever text follows the command name:

```
Write comprehensive tests for: $ARGUMENTS

Testing conventions:
* Use Vitest with React Testing Library
* Place test files in a __tests__ directory in the same folder as the source file
* Name test files as [filename].test.ts(x)
* Use @/ prefix for imports

Coverage:
* Test happy paths
* Test edge cases
* Test error states
```

Run it with: `/write_tests the use-auth.ts file in the hooks directory`

Arguments aren't limited to file paths — any string works, letting you pass whatever context or direction the task needs.

**Gotcha (beyond what the course covers):** `$ARGUMENTS` grabs the whole trailing string as one blob. For structured input you also get:
- Positional access: `$0`, `$1`, `$2` (0-indexed) pull individual words/tokens.
- Named arguments: declare `arguments: [issue, branch]` in frontmatter, then reference `$issue` / `$branch` in the body.

## Custom commands vs. skills
Functionally, commands and skills are the same mechanism — not two systems to choose between. Both are a markdown file with an optional frontmatter block that becomes a `/name` command. The difference is organizational:
- `.claude/commands/foo.md` — the older, simpler convention. One flat file per command.
- `.claude/skills/foo/SKILL.md` — the newer convention. Gives the command its own folder, so it can bundle supporting files (scripts, references) alongside the prompt, and unlocks a few extra frontmatter fields (`disable-model-invocation`, `paths`, `context: fork`).

Skills are the more capable superset — reach for a skill folder when a command needs supporting files or the extra controls below; a flat command file is enough for a plain prompt template.

### Frontmatter: configuring behavior before the prompt runs
Frontmatter is YAML between `---` lines at the top of the file, read before Claude executes the prompt body:

```markdown
---
description: Audits dependencies for vulnerabilities
allowed-tools: Bash(npm audit*), Bash(npm test*)
model: claude-sonnet-5
---

Run npm audit, fix issues, then run tests to confirm nothing broke.
```

- `description` — one-line summary shown in command/skill lists.
- `allowed-tools` / `disallowed-tools` — grant or restrict specific tools (e.g. `Bash(git add *) Bash(git commit *)`) so the command can run autonomously without a permission prompt each time.
- `model` / `effort` — override the model or reasoning depth just for this command.
- `disable-model-invocation: true` — command only runs when the user explicitly types it; Claude itself can never auto-trigger it based on its own judgment.
- `paths` — restricts when the command is relevant to certain file-path glob patterns (e.g. only surfaces while working under `src/api/**`).
- `context: fork` — runs the command in an isolated sub-context (like a subagent), so its work doesn't pollute the main conversation history.

**Why it matters:** without `allowed-tools`, a command like `/audit` that runs `npm audit fix` will stop and ask permission for each shell command — defeating the point of automating a repetitive task. `context: fork` matters for the opposite reason: it keeps a noisy multi-step command (lots of tool calls, intermediate output) from cluttering the conversation Claude reasons over afterward.

## Global commands
Project commands (`.claude/commands/`) are scoped to that repo. For commands you want everywhere, use the user-level folder: `~/.claude/skills/<name>/SKILL.md` (or the equivalent personal commands location) applies across all projects on your machine — same idea as `~/.claude/CLAUDE.md` from [Adding context.md](Adding context.md).

## Key takeaway
- A markdown file's name becomes the slash command; the file body is the prompt Claude runs on invocation.
- New/edited command files are picked up live, mid-session — no restart needed in the common case.
- `$ARGUMENTS` captures all trailing text as one string; positional (`$0`/`$1`) or named frontmatter args give structured access instead.
- Frontmatter (tool restrictions, model/effort overrides, invocation controls) turns a plain prompt template into a controlled, autonomous workflow.
- Commands can be scoped to one project or defined at the user level to apply across all projects.
- Commands and skills are the same underlying mechanism — skills are just the folder-based superset with room for extra files and finer-grained controls.
