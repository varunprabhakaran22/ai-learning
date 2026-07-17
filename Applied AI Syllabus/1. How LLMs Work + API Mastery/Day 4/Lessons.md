# Day 4 — Lessons

---

## Part A — Tokenizer Docs (tiktoken / Anthropic tokenizer)

**Source:** OpenAI's `tiktoken` library docs, Anthropic's token-counting docs.

These are reference material, not core theory — the *concept* (the tokenizer's vocabulary is fixed and deterministic, so you can run the same splitting algorithm locally to get an exact token count before sending the API request, instead of estimating) is in Theory.md. This section is where you note provider-specific, likely-to-change details after actually reading the docs:

```
- Exact library/endpoint names and how to call them
- Which tokenizer a given model family uses (not all model families
  share one tokenizer — a count from one may not match another)
- Any quirks noted in the docs (e.g. how whitespace or special tokens
  are handled, edge cases in counting)
```

*(Fill in after reading — this is a placeholder until you've gone through the actual docs.)*
