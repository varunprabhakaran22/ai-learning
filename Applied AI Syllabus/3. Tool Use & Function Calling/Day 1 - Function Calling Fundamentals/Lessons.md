# Day 1 — Lessons

---

## Part A — Anthropic Tool Use Docs

**Source:** Anthropic's tool use documentation.

Reference material, not core theory — the *concept* (a tool definition needs a name, description, and input_schema; and the request→execute→inject→continue loop across at least two API calls) is covered in Theory.md. Note here after reading:

```
- Exact request/response shape for tool_use and tool_result blocks
  (field names, how a tool call ID links a request to its result)
- Anthropic-specific behavior: can the model request multiple tools
  in one response? How is that represented?
- Any guidance on how detailed a tool description needs to be
```

*(Fill in after reading — placeholder until you've gone through the docs.)*

---

## Part B — "Function Calling LLM Architecture"

**Source:** article/search on function calling architecture across providers.

```
- How OpenAI's function calling / tool use compares structurally
  (same request-execute-inject loop shape, or meaningfully different?)
- Common pitfalls reported in practice (e.g. models hallucinating
  tool names that don't exist, malformed arguments)
```

*(Fill in after reading.)*

---

## Part C — Experiment: 3 Tools, 0/1/2 Tool Calls Needed

**Source:** hands-on experiment, no external article.

```
Task:   give the model 3 tools (e.g. getWeather, calculate, getCurrentDate)
        ask 3 categories of questions:
          1. a question needing 0 tools (answerable from training data)
          2. a question needing exactly 1 tool
          3. a question needing 2 tools in sequence

Observe: does the model correctly decide when a tool is/isn't needed
         (it weighs the question against the tool descriptions and can
         answer directly even when a matching tool is available)? Does it request tools in a sensible order
         when 2 are needed?

Record: any case where the model called a tool it didn't need, or
        skipped one it did need — these are decision-quality failures,
        not execution failures, and point back to description quality
```

*(Fill in after running the experiment.)*

---

*Next: Recap.md — your own summary, plus the ToolRegistry showcase task*
