# Day 3 Recap — Multi-Step Tool Chains

## ReAct is just the 4-word loop — no hidden step
- Reason → Act → Observe → Repeat. That's the entire concept, nothing more hidden underneath.
- Reason = the model's own inference inside the API call (I write no code for this).
- Act = my code executes the tool for real. Observe = the real result goes back to the model. Repeat = model reasons again, now informed.

## There is no special "ReAct implementation" — it IS the Day 1 loop
- `while (stop_reason === "tool_use")` from Day 1 already **is** ReAct — I don't build a different loop on top of it, I just don't defeat it.
- "Implementing ReAct" = keep that loop as-is + design tools so real dependencies exist + add guardrails once chains can run unpredictably many times (below).

## What actually FORCES multi-step chaining: schema, not description
- The strong lever: a required schema field (e.g. `getTransactions` requiring `userId`) that has NO way to be filled except from a prior tool's real output. This structurally forces 2+ steps — the model literally cannot construct the input otherwise.
- The soft lever: description text ("use this only after you already have a userId") — helps the model choose correctly, but doesn't prevent it from hallucinating a value and skipping ahead. Schema dependency is what actually enforces order; description is just a hint on top.

## Day 1 (independent tools) vs Day 3 (dependent tools) — the real difference
- Day 1: both tools' inputs are known immediately from the user's own sentence → model can request both in the SAME response → loop can finish in 1 iteration even with 2 tools.
- Day 3: tool #2's input literally doesn't exist until tool #1's real result comes back → loop is FORCED to run 2+ iterations, not just "may run more than once."
- Same loop code both times — the difference is whether a later tool's input is knowable up front or only after observing an earlier real result. See side-by-side diagrams now added to both Day 1 and Day 3 example.js headers.

## Interview gotcha — two failure modes look identical from the outside, but need different fixes
- A max-iteration cap is the blunt stop, but "the loop has been running for 20 iterations" can mean two very different things underneath, and treating both as the same bug is wrong:
  1. **Infinite/circular reasoning** — the model keeps calling the same tool with the same or trivially different input, never converging (e.g. misreading a result and re-querying). This is a real bug — fix by better prompting, or by detecting repeated identical tool calls and forcibly breaking the loop.
  2. **Legitimately long multi-step task** — the task genuinely needs many sequential steps and each iteration is making real progress. This is NOT a bug — an iteration cap set too low kills valid work. Fix by raising the cap or decomposing into sub-tasks, not by "debugging" something that isn't broken.
- Telling them apart requires reading the actual trace of what each iteration did (Day 1's full request/response log), not just counting iterations.

## Still need to cover / do
- Read Lessons.md sources (ReAct pattern, agentic loop design) and log the 3+ sequential tool call experiment results here, including the intentional-failure recovery observation.
- Run example.js for real, confirm the dependent 2-tool chain (getUserId -> getTransactions) and the failure-case recovery both work.
- Week 3 Day 4: MCP (Model Context Protocol)
