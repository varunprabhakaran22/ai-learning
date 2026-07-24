# Day 1 Lessons — Multi-Agent Patterns

## Part A — "multi-agent LLM orchestration patterns"
Search for this term and read a real-world overview of how production multi-agent systems are actually wired together. Watch specifically for: do the named patterns map cleanly onto Theory.md ②-④'s orchestrator-worker/peer-to-peer/supervisor split, or does the source use different names for the same shapes? Note any pattern the source names that Theory.md doesn't cover.
_(not yet read — log notes here after reading)_

## Part B — "AutoGen vs LangGraph architecture"
Search for this term and read a comparison of these two specific multi-agent frameworks. Watch specifically for: which of Theory.md's three patterns (orchestrator-worker/peer-to-peer/supervisor) each framework defaults to or makes easiest to build, and how each framework implements agent-to-agent communication (message-passing vs. shared state, per Theory.md ⑤).
_(not yet read — log notes here after reading)_

## Part C — Experiment: single large agent vs orchestrator + 2 specialists
Per the syllabus showcase task: run the same non-trivial task two ways and compare output quality and reliability:
1. One single agent (Week 5-style), given the whole task and left to plan/execute it alone.
2. An orchestrator + 2 specialist workers (e.g. a research specialist + a writing specialist), using the orchestrator-worker pattern from Theory.md ②.

Watch specifically for: does the single agent's output degrade or blur roles (e.g. research quality suffering because it's also trying to write well in the same context)? Does the multi-agent version's total wall-clock time actually improve (if the two workers' subtasks are genuinely independent and dispatched concurrently), or does coordination overhead eat the gain?

## Part D — Showcase deliverable: document a 3-agent system design
Architect a 3-agent system for a real use case (e.g. research + write + review). Produce:
- A sequence diagram of agent communication (who calls whom, what data passes between them, message-passing vs shared state per Theory.md ⑤).
- Written explanation of each agent's role, prompt focus, and tools.
- Post as a technical blog or GitHub doc (per the syllabus's stated format for this showcase).
