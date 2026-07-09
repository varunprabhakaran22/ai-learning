# Day 3 — Prompt Versioning & Testing

---

## ① Prompts Are Code — They Need the Same Discipline

Days 1-2 treated a prompt as something you write once and use. Today's shift: a prompt is a **living artifact that changes over time**, same as a function — and every change carries the same risk a code change does: it can silently break behavior that was working before.

```
Code change:    you refactor a function → run the test suite →
                catch regressions before shipping

Prompt change:  you tweak wording, add an instruction, reorder examples →
                WITHOUT a test suite, you only find out something broke
                when a user hits the broken case in production
```

**The core problem this solves:** without versioning + testing, "improving" a prompt is guesswork — you eyeball a couple of outputs, they look better, you ship it, and you have no idea if you silently broke 3 other cases the old prompt handled fine.

---

## ② Why Eyeballing Doesn't Scale

A single prompt has to handle a *range* of inputs, not just the one example you tested by hand while editing it.

```
You edit a prompt, test it on the 1 input you had in mind → looks great
→ ship it
→ but that prompt also handles 9 other input types in production
→ some of those may have relied on wording you just changed
```

This is the same failure mode as changing one function and only manually re-running the one call site you were thinking about — the fix is the same: a fixed, repeatable set of test cases you check the change against, not memory of "did it look right."

---

## ③ Versions, Not Overwrites

Treating prompts as code means **keeping the old version alongside the new one**, not overwriting it:

```
prompts/
  summarize_v1.json   ← original
  summarize_v2.json   ← tweaked wording
  summarize_v3.json   ← added explicit output format instruction
```

**Why keep old versions instead of just editing in place (like you might with regular prose):**

```
- lets you compare v1 vs v2 vs v3 on the SAME test cases side by side
- lets you roll back instantly if v3 turns out worse on some case v1 handled
- gives you a changelog — a record of WHAT changed and WHY, useful when
  you're debugging "why did this behavior change" months later
```

This mirrors why source control keeps commit history instead of only ever showing the latest file state — the value is in being able to diff and roll back, not just in the current snapshot.

---

## ④ Test Cases: Input, Expected Behavior, Pass/Fail Criteria

A prompt test case looks structurally like a unit test case — but "expected output" for an LLM usually can't mean "exact string match," since wording legitimately varies run to run (Week 1: outputs are probabilistic, not deterministic, even at low temperature).

```
Test case shape:
{
  input:     "the actual user input to send",
  criteria:  "what must be TRUE about the output for this to pass"
             (e.g. "contains a number", "is valid JSON", "does not
             mention X", "matches expected_output via schema" —
             reuses Day 2's schema validation as one kind of criteria)
}
```

**Why criteria instead of exact match:** exact string matching would fail a *correct* answer just because the wording differs. The test needs to check the *property* that matters (right structure, right fact, right constraint respected) — not reproduce the model's exact phrasing.

---

## ⑤ The Comparison Table — Making Regressions Visible

Running N prompt versions against M test cases produces a natural grid, and the grid itself is the deliverable — it's what turns "I think v3 is better" into a verifiable claim:

```
              test_1   test_2   test_3   test_4   test_5
prompt_v1     PASS     PASS     FAIL     PASS     FAIL
prompt_v2     PASS     PASS     PASS     PASS     FAIL     ← improved v1's failures
prompt_v3     PASS     FAIL     PASS     FAIL     FAIL     ← regressed on test_2 AND test_4!
```

**What this table catches that eyeballing wouldn't:** v3 might have been written specifically to fix test_5 wording, and in isolation it looks like a win. The table shows it actually broke test_2 and test_4 along the way — a **regression** that would have shipped invisibly without the full grid.

---

## Summary — The Shift From Day 2

```
Day 2 gave you:    code-level enforcement for a SINGLE call — validate
                    one response against one schema, retry if wrong.

Day 3 adds:        treating the PROMPT ITSELF as something with a
                    lifecycle — versioned, diffable, tested against a
                    fixed set of cases every time it changes, so
                    "improving" a prompt is a measured claim (the
                    comparison table) instead of a guess from eyeballing
                    one example.
```

---

*Next: Lessons.md — prompt versioning best practices, LangSmith/Braintrust intro, and the 3-version/5-test-case scoring experiment*
