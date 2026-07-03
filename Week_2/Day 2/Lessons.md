# Day 2 — Lessons

---

## Part A — Anthropic Structured Output Docs

**Source:** Anthropic's structured output / tool-use-for-JSON documentation.

Reference material, not core theory — the *concept* (schema as shared contract, prompt-level vs code-level enforcement) is in Theory.md `②`/`③`. Note here after reading:

```
- Anthropic-specific mechanism for forcing structured output (e.g. using
  tool definitions as a JSON schema enforcement trick, if that's the
  recommended approach at read time)
- Any built-in reliability guarantees Anthropic provides vs what you
  still have to validate yourself
```

*(Fill in after reading — placeholder until you've gone through the docs.)*

---

## Part B — "JSON Mode LLM Reliability"

**Source:** article/search on JSON mode reliability across providers.

```
- How other providers (OpenAI JSON mode, etc.) compare in guarantee level
- Common failure modes reported in practice (trailing text, wrong types,
  truncated output on long responses)
```

*(Fill in after reading.)*

---

## Part C — Experiment: 20 Attempts, No Enforcement vs Explicit Schema

**Source:** hands-on experiment, no external article.

```
Task:   ask the model for the same JSON object 20 times:
          1. with just a casual request ("give me JSON with name and age")
          2. with an explicit schema/example shown in the prompt

Measure: how many of the 20 responses fail to parse as valid JSON,
         and separately, how many parse but fail schema validation
         (wrong type, missing field)

Record: the failure-rate difference between the two conditions —
        this is the concrete evidence for Theory.md ②'s claim that
        prompt-level instruction alone still leaves a real failure rate
```

*(Fill in after running the experiment.)*

---

*Next: Recap.md — your own summary, plus the StructuredOutputParser showcase task*
