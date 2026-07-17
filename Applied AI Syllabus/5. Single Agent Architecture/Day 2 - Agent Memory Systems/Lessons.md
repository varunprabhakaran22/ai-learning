# Day 2 Lessons — Agent Memory Systems

## Part A — "agent memory systems design"
_(not yet read — log notes here after reading)_

## Part B — "episodic memory for AI agents"
_(not yet read — log notes here after reading)_

## Part C — Experiment: same task, no memory vs in-context vs retrieved memory
Per the syllabus showcase task: run the same multi-step agent task three ways and compare coherence:
1. No memory at all — each step starts fresh, no history.
2. In-context only — full raw message history stuffed into every prompt.
3. Retrieved memory — `example.js`'s `retrieveRelevant`, pulling only the topK relevant past entries.

Watch specifically for: does (1) repeat mistakes a memory-equipped run wouldn't? Does (2) start degrading in quality/focus as history grows long (the "attention dilution" problem — cramming every past action/result into context as raw text dilutes the model's attention on what's actually relevant right now)? Does (3) actually retrieve the right past entries, or does it miss something relevant that (2) would have caught just by brute-force inclusion?
