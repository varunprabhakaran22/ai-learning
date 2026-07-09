# Day 1 Recap — Function Calling Fundamentals

## The model requests, your code executes
- The model never runs code itself — it outputs a structured request (tool name + input), and my code decides whether to actually call the real function.
- Nothing happens unless my code executes it — this is why tool use is safe by design, not by accident.

## What a tool definition needs
- `name` — unique identifier the model references.
- `description` — the biggest lever over whether the model calls it correctly at all.
- `input_schema` — same idea as Week 2's Zod schema, just constraining a function's arguments instead of a final answer.

## The loop, not a single call
1. Send message + tool definitions.
2. Model replies with either plain text, or a tool_use request.
3. If tool_use: my code runs the real function.
4. Send a new request with full history + the tool_use block + the tool_result.
5. Model reads the result, answers (or requests another tool — loop continues).
- Needs the full history each time because the model is still stateless — it has no memory of asking for the tool.

## The model decides IF a tool is needed
- Giving the model tools doesn't mean it always uses them — it weighs the question against the tool descriptions.
- Bad description → bad decision (calls when it shouldn't, skips when it should). This is a decision-quality issue, separate from execution mechanics.

## Why a registry
- Without one: tool definitions get copy-pasted at every call site, and the description can drift from what the function actually does.
- With one: name, description, schema, and the real function live together in one place — execution always looks up the current, correct implementation.

## The raw model has ZERO built-in capabilities — not even Read/Edit/Bash
- With `tools: []` (or no `tools:` key), the model can ONLY read the text I send and generate text back — no filesystem access, no network, no code execution, no "secretly capable but restricted." It's not a permissions issue, there's no mechanism at all until I build one.
- `name` in a `tool_use` block can ONLY be a name I personally typed into `registry.register(...)` — never a built-in like "Read"/"Grep"/"Bash". Those are Claude CODE's (the CLI product) own pre-registered tools, wired into a different harness entirely — completely unrelated to the raw Anthropic API this project uses.
- Claude Code's model *feels* capable of reading/editing files only because Anthropic (as the developer, in that product) already did steps 1-3 below — same pattern I'm building myself, not a different kind of model.
- Every capability beyond generating text requires ME to: (1) write a real function, (2) register it with name/description/schema, (3) pass it into `tools:` on the API call. Skip any step and that capability doesn't exist for the model, no matter how the prompt is worded.

## Registering a tool ≠ the model knowing about it
- `registry.register(...)` only fills my local Map — the model has zero awareness of this by itself.
- The model only learns about tools when `registry.getDefinitions()` is passed as `tools:` in the actual API call — and this happens fresh on every call (model is stateless, no memory of tools from a prior request).

## `stop_reason` — fixed API metadata, not model-written text
- It's set by the API based on what happened during generation — the model doesn't type/choose it, so it can't be hallucinated or "random."
- Fixed values only: `end_turn` (normal finished answer — positive case, not "no answer"), `tool_use` (pausing for a tool_result), `max_tokens`, `stop_sequence`.
- Always present — there's no "missing stop_reason" case.
- What CAN actually be hallucinated: the *content* inside a tool_use block (garbled input args, or a made-up tool name) — a completely different category from stop_reason.

## The Overall Shift
```
User:      "I gave the model tools, so now it can do things."
Engineer:  "The model can only REQUEST things — it outputs a structured
            intent, my code decides whether to execute it. A single
            tool-using exchange is actually a loop across multiple
            calls (request, execute, inject the result, continue), and
            the model's decision to use a tool at all depends entirely
            on how well I described it — not on the tool being present."
```

## Interview gotcha — a runtime tool failure needs a specific error back, not a silent retry
- If a tool throws at runtime (e.g. `readFile` → "file not found"), retrying the exact same call with the exact same input will fail identically every time — nothing about the situation changed, so blind retry just burns calls for free.
- Send the actual structured error back as the `tool_result` (path attempted, error type) — same "specific feedback, not generic" principle as Week 2 Day 2's Zod validation retry. Specific errors let the model choose a genuinely different next action (try another path, ask the user, give up) instead of repeating itself.

## Still need to cover / do
- Run example.js for real — confirm 0/1/2-tool-call questions route correctly through the loop
- Run the actual 3-tool decision experiment (Lessons.md Part C), note any wrong tool-use decisions
- Read Anthropic tool use docs + function calling architecture notes (Lessons.md Parts A/B), fill in real notes on request/response shape
- Week 3 Day 2: Building Real Tools
