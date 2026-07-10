# Day 3 — Lessons

---

## Part A — Prompt Versioning Best Practices

**Source:** article/search on prompt versioning best practices.

Reference material, not core theory — the *concept* (keep old versions, diff/rollback, changelog) is in Theory.md `③`. Note here after reading:

```
- Common file/storage conventions people actually use (JSON files per
  version, a prompts table in a DB, git-tracked prompt files, etc.)
- What a good prompt changelog entry looks like in practice
```

*(Fill in after reading — placeholder until you've gone through the material.)*

---

## Part B — LangSmith / Braintrust Intro

**Source:** LangSmith and/or Braintrust product docs (prompt testing/eval tools).

```
- How these tools represent prompt versions + test cases + results
  (compare against your own PromptTestRunner design in example.js)
- What they add beyond a basic comparison table (e.g. hosted dashboards,
  LLM-as-judge scoring — later Week 8 topic)
```

*(Fill in after reading.)*

---

## Part C — Experiment: 3 Prompt Versions × 5 Test Cases

**Source:** hands-on experiment, no external article.

```
Task:   write 3 versions of the same prompt (e.g. a summarizer),
        define 5 test cases with pass/fail criteria (Theory.md ④)

Measure: run all 3 versions against all 5 test cases, fill in the
         comparison table (Theory.md ⑤)

Record: which version actually wins overall, and specifically whether
        any version REGRESSES a case an earlier version passed —
        that regression is the finding worth writing down
```

*(Fill in after running the experiment.)*

---

*Next: Recap.md — your own summary, plus the PromptTestRunner showcase task*
