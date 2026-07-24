# Day 4 Lessons — Human-in-the-Loop Patterns

## Part A — "human in the loop AI agent design"
_(not yet read — log notes here after reading)_

## Part B — "AI agent safety patterns"
_(not yet read — log notes here after reading)_

## Part C — Experiment: a gate that triggers human approval when agent confidence is low or action is destructive
Per the syllabus showcase task: build a gate and test it against real runs.
1. Register a small tool set with mixed tiers — at least one always-ask (e.g. a fake `sendMessage`), one never-ask (e.g. `readFile`), one threshold-based (e.g. `writeFile` overwrite).
2. Run a task that hits all three tiers. Confirm never-ask actions proceed with zero pause, always-ask actions always pause regardless of stated confidence, and threshold-based actions only pause when confidence is reported below the set threshold.
3. Deliberately feed a low-confidence scenario (ambiguous input) into a threshold-tier action — confirm it pauses. Feed an unambiguous one — confirm it doesn't.
4. Reject one always-ask action and confirm the rejection reason correctly feeds into the next prompt as a real result (not silently dropped).

Watch specifically for: does the model's self-reported confidence actually track real ambiguity, or is it poorly calibrated (confidently wrong)? Does the log capture enough to tell, after the fact, whether a threshold was set too loose or too strict?
