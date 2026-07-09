# Day 1 Recap — Prompt Structure & Chain of Thought

## Zero-shot / Few-shot / CoT
- **Zero-shot:** just the question, no examples.
- **Few-shot:** a few example Q→A pairs shown first, so the model copies the pattern/format.
- **CoT:** ask the model to show its reasoning step by step before the final answer.

## Why CoT actually works
- The model has no hidden thinking space — the only "memory" it has while generating is the tokens it has already written.
- CoT makes it write out intermediate steps, which then get read back in as input for the next step — like using scratch paper instead of doing it all in your head.
- Helps a lot on multi-step problems (math, logic). Does basically nothing on simple lookups — there's no reasoning to offload.

## Few-shot vs CoT — different jobs
- Few-shot fixes **format/style** problems (model doesn't know how you want the answer shaped).
- CoT fixes **reasoning** problems (model jumps to a wrong answer without working through it).
- They're not competing — can combine them (few-shot examples that themselves show reasoning steps).

## Structure = reliability, not just nicer output
- The real goal isn't "prettier answers" — it's making output consistent enough that downstream code can trust its shape.
- Testable: run the same prompt N times, structure should reduce variance across runs.

## Prompts as composable pieces
- Built `PromptBuilder`: context, examples, chain-of-thought, output format — each addable independently.
- Point of splitting them up: can change one piece (e.g. just the CoT flag) and re-test, instead of rewriting one big prompt string and losing track of what changed.

## Interview gotcha — a system prompt rule vs. a user's conflicting request
- Example: system prompt says "always cite reasoning," a later user message says "skip explanations, just the answer." System prompt has the training-taught positional bias, but that's a soft bias, not a hard guarantee — a persistent/clever user message can still erode it over turns.
- Don't leave the resolution to chance. Design the precedence explicitly into the system prompt itself (e.g. "you may omit reasoning from the *visible* response, but internal reasoning is otherwise mandatory"), or enforce it in code — always run CoT internally regardless of what's shown, strip it from the final response only if the user opted out. Safety-critical constraints belong in code, not in hoping the model arbitrates correctly.

## The Overall Shift
```
User:      "Just ask the question, the model will figure out what I want."
Engineer:  "The prompt IS the interface. Few-shot fixes format,
            CoT fixes reasoning by giving the model scratch space
            in its own output tokens. Structure isn't decoration —
            it's what makes output reliable enough to depend on."
```

## Still need to cover / do
- Run example.js for real — compare the zero-shot vs CoT answers on the sheep riddle, confirm CoT gets it right more consistently
- Run the actual 10-trial accuracy experiment (Lessons.md Part C) — zero-shot vs CoT vs few-shot CoT
- Read the CoT paper (Lessons.md Part A) and Anthropic's prompt engineering guide (Part B), fill in real notes
- Week 2 Day 2: Output Formatting & Structured Outputs
