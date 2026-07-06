# Day 5 Recap — Week 2 Full Recap (Days 1-4)

*(Day 5 itself is integration, not new theory — so this recap rolls up everything
from Days 1-4 into one week-level summary, per user/engineer contrast.)*

## Prompt Structure (Day 1)
- **User thinks:** "Just ask the question, the model figures out what I want."
- **Engineer thinks:** Few-shot fixes format, CoT fixes reasoning by giving the model scratch space in its own output tokens. Structure is what makes output reliable, not decoration.

## Structured Output (Day 2)
- **User thinks:** "Tell it to respond in JSON, that's good enough."
- **Engineer thinks:** A prompt instruction is a strong bias, not a guarantee. Schema is a shared contract feeding both the prompt and the validation. Retry loops feed back the *specific* error so the model self-corrects instead of guessing again.

## Prompt Versioning & Testing (Day 3)
- **User thinks:** "I tweaked the prompt and it looks better now."
- **Engineer thinks:** "Better" on which input? Prompts are code — need versions to diff/roll back, and a fixed test suite with real pass/fail criteria run on every version, so "better" is a table, not a feeling.

## Reasoning Models (Day 4)
- **User thinks:** "Just use the smartest model for everything, it can't hurt."
- **Engineer thinks:** Every extra reasoning token costs money and latency whether needed or not. Model choice is a routing decision like temperature or a preset — classify the task, route by difficulty, log why.

## Day 5 — How It All Wires Together
- `PromptBuilder` (Day 1) composes the prompt from independent pieces — context, examples, CoT, output format.
- That composed prompt gets validated on response via `StructuredOutputParser` (Day 2) — retry with specific error feedback, up to 3 attempts.
- Every prompt is a saved version, not an edit-in-place, and gets checked against saved test cases via the `PromptTestRunner` pattern (Day 3) — pass/fail per version is visible, not assumed.
- `ModelRouter` (Day 4) decides standard vs reasoning model based on task classification, and that decision is always shown, never hidden — matches Day 4 fact `⑤`'s logging discipline.
- Model switching mid-conversation (covered live, added as Day 4 fact `⑥`) works because history is stateless — same array, any model, on any call.
- Known gap: the Dashboard itself (Day 5's showcase) is documented as architecture only, not built — flagged, not silently skipped.

## The Overall Shift (Week 2)
```
Week 1:    "I control WHAT the model receives — parameters, tokens, context."

Week 2:    "I control HOW the model reasons and formats — few-shot/CoT
            shape reasoning, schemas + validation shape reliability,
            versioning + testing make 'better' measurable, and model
            choice itself is a routing decision with a real cost/benefit
            tradeoff. The prompt isn't a one-off string — it's a
            component with a lifecycle, same as any other code I own."
```

## Still need to cover / do
- Actually build the Prompt Engineering Dashboard as runnable code (currently docs-only — see README.md gaps)
- Push Week 2 toolkit pieces (`PromptBuilder`, `StructuredOutputParser`, `PromptTestRunner`, `ModelRouter`) to `ai-engineer-toolkit` GitHub repo
- Run all the still-pending experiments flagged across Days 1-4 (CoT accuracy, JSON failure rate, prompt version regression table, reasoning model cost/accuracy)
- Week 3 Day 1: Function Calling Fundamentals
