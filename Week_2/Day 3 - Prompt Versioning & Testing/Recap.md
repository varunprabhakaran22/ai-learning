# Day 3 Recap — Prompt Versioning & Testing

## Prompts are code
- A prompt change carries the same risk as a code change — it can silently break behavior that was working, and without a test suite you only find out in production.
- "Improving" a prompt without testing is a guess, not a measured claim.

## Why eyeballing doesn't scale
- Editing a prompt while staring at one example only proves that one example got better.
- The same prompt handles a range of other inputs in production — some may have relied on wording that just changed.

## Versions, not overwrites
- Keep old versions alongside new ones (v1, v2, v3) instead of editing in place.
- Lets you: compare versions side by side on the same test cases, roll back instantly, and keep a changelog of what changed and why.

## Test cases use criteria, not exact match
- LLM output wording varies run to run even when correct — exact string match would fail a right answer just for different phrasing.
- Criteria checks a *property* instead: contains a number, is valid JSON, stays under a word limit, doesn't mention X. (Day 2's schema validation is one kind of criteria.)

## The comparison table is the deliverable
- Grid of version × test case → pass/fail.
- Catches regressions eyeballing would miss: a version fixed for one case can quietly break others that used to pass — invisible without seeing the whole grid at once.

## Interview gotcha — a higher average can hide a worse prompt
- v3 scoring higher *on average* than v2 isn't automatically the better ship candidate — check variance across test cases too.
- High variance (some near-perfect, some much worse) means the prompt is unreliable: which case a real user's input resembles is unpredictable, so the worst-case behavior is what actually matters in production.
- A lower-but-consistent average (bounded, known worst case) is often the safer ship than a higher-but-volatile one — investigate *why* the variance exists before shipping the higher-average version.

## The Overall Shift
```
User:      "I tweaked the prompt and it looks better now."
Engineer:  "Looks better on WHICH input? A prompt is code — it needs
            versions I can diff and roll back, and a fixed set of test
            cases with real pass/fail criteria, checked on EVERY
            version, so 'better' is a table I can point to, not a
            feeling from the one example I was staring at while editing."
```

## Still need to cover / do
- Run example.js for real — check whether v3 actually passes all 3 cases or regresses on something v1/v2 got right
- Run the actual 3-version/5-test-case experiment (Lessons.md Part C) with your own prompt (not the summarizer stand-in)
- Read prompt versioning best practices + LangSmith/Braintrust docs (Lessons.md Parts A/B), fill in real notes
- Week 2 Day 4: Reasoning Models & When to Use Them
