# MCP Servers

Source: [Claude Code in Action — MCP servers](https://anthropic.skilljar.com/claude-code-in-action/303241)

## What MCP servers are
MCP (Model Context Protocol) servers extend Claude Code with new tools/abilities it doesn't have out of the box — running either locally on your machine or remotely. Playwright (browser control) is a common example, but the ecosystem covers databases, API testing, filesystem operations, cloud integrations, and more.

**Why it matters:** an MCP server turns Claude from "reads and writes code" into "can drive the actual tool" — e.g. a browser-control server lets Claude see rendered visual output, not just markup/CSS source, which changes what kind of feedback loop is possible.

## Installing a server
Run in your terminal — not inside a Claude Code session:

```
claude mcp add playwright -- npx -y @playwright/mcp@latest
```

- `playwright` names the server.
- Everything after `--` is the command that starts the server locally.
- `-y` avoids an npx confirmation prompt.

**Gotcha:** the `--` separator before the launch command is required — omitting it is a common copy-paste mistake from older examples.

Useful flags on `claude mcp add`:
- `--scope` — `local` (default), `user`, or `project`, controlling who/where the server config applies.
- `--transport` — `stdio` (default, for local process servers) or `http` (for remote servers reached by URL).

## Managing permissions
By default, Claude asks for permission the first time it uses a new server's tools, and can keep asking on each subsequent use. To pre-approve, add an entry to the `permissions.allow` array in a settings file:

```json
{
  "permissions": {
    "allow": ["mcp__playwright"],
    "deny": []
  }
}
```

The double-underscore `mcp__<servername>` pattern allows every tool from that server without further prompts.

**Gotcha:** which settings file you use changes who sees the approval:
- `.claude/settings.json` — committed to git, shared with the team.
- `.claude/settings.local.json` — gitignored, personal to your machine only.
Use `.local.json` for a personal approval you don't want to push to teammates; use the shared file if the whole team should skip the prompt.

You can also scope the allow rule to a single tool instead of the whole server, using `mcp__<server>__<tool>` (exact tool) or `mcp__<server>__<prefix>*` (glob) — e.g. `mcp__github__get_*` allows only that server's `get_`-prefixed tools.

## Practical pattern: closing the visual feedback loop
Because a browser-control server lets Claude actually see rendered output, you can ask it to open the app, generate something, evaluate the result visually, and then revise the underlying prompt/config that produced it — repeating until the output looks right. This is a materially different workflow than reviewing generated code by reading it, since layout, spacing, and color choices are often only obvious once rendered.

## Key takeaway
- MCP servers give Claude new tools (browser control, DB access, etc.) beyond its built-in capabilities — install with `claude mcp add <name> -- <launch command>` from your terminal.
- `--scope` controls where a server config applies; `--transport` distinguishes local (`stdio`) from remote (`http`) servers.
- Pre-approve a server's tools via `permissions.allow` with `mcp__<server>`, or scope down to one tool/prefix with `mcp__<server>__<tool>`.
- Committing the allowlist to `.claude/settings.json` shares it with the team; putting it in `.claude/settings.local.json` keeps it personal and gitignored.
- Tools that let Claude observe real output (visual, live data, etc.) enable a generate → observe → refine loop that reading source code alone can't.
