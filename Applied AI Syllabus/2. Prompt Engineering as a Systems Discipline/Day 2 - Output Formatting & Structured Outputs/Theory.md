# Day 2 — Output Formatting & Structured Outputs

---

## ① Why Structured Output Matters — the Model Is Talking to Code, Not Just You

Day 1 established that structure improves *reliability* — output shape stops varying run to run. Today's addition: once your prompt has a consumer that's a **program** (not a human reading the reply), an inconsistent shape doesn't just look messy — it **breaks the program**.

```
Human-facing output:  "The user is John, age 30" → a person can parse this fine
                       even if wording shifts slightly run to run

Code-facing output:   your code does `response.name` and `response.age`
                       → if the model sometimes writes "Name: John" and
                         sometimes "The name is John", NAIVE PARSING BREAKS
```

This is why JSON (or XML tags) is the default target format for anything downstream-consumed: it has an unambiguous, machine-parseable shape that doesn't depend on interpreting prose.

---

## ② Asking Nicely vs Enforcing — Two Different Reliability Levels

Week 1's system-prompt fact reused here: instructions (including "respond in JSON") are a **strong bias**, not a hard guarantee. The model can still:

```
- wrap JSON in a prose explanation ("Sure! Here's the JSON: {...}")
- produce invalid JSON (trailing comma, unescaped quote, unclosed bracket)
- omit a field you expected, or add one you didn't ask for
- use the wrong type for a field (e.g. "30" as a string instead of 30 as a number)
```

**Two separate levers, and you need both:**

```
Prompt-level (asking nicely):
  - explicit instruction: "Respond with ONLY valid JSON, no other text"
  - showing the EXACT shape wanted, e.g. via a schema description or example
  - this raises the odds of correct output, but does not guarantee it

Code-level (enforcing):
  - parse the response as JSON — if it throws, you know immediately
  - validate against a schema (Zod, or a JSON Schema validator) — catches
    wrong types, missing fields, extra fields, even if the JSON parsed fine
  - this is what makes the shape actually TRUSTWORTHY, not just likely
```

**Key idea from the syllabus framing:** a stronger prompt is not a substitute for code-level validation. You always need both — the prompt reduces how often you need to correct, validation catches every case the prompt didn't.

---

## ③ Schemas as the Shared Contract

A schema (Zod, JSON Schema, etc.) is a single definition of "what shape is acceptable" that serves double duty:

```
1. Tells the MODEL what shape to produce
   (you can describe or serialize the schema into the prompt itself)

2. Tells your CODE what shape to expect
   (the same schema validates the response before your code touches it)
```

Because it's one definition used in both places, the prompt instruction and the validation check can never drift apart — if you change the schema, both the instruction *and* the check update together. This is the mechanism, not just the tool: Zod happens to be a common JS choice, but the *pattern* (one schema, two consumers) is the actual concept.

---

## ④ Retry-on-Failure With Error Feedback — Turning a Failure Into a Correction Loop

Validation failing isn't the end of the interaction — it's information you can feed back to the model to let it self-correct, since the model has no idea it failed until you tell it.

```
attempt 1:
  send prompt → get response → validate
  ↓ FAILS (e.g. "age" was a string "30" instead of number 30)

attempt 2:
  send: original prompt + the FAILED response + the SPECIFIC validation
        error ("field 'age' must be a number, got string")
  → model sees exactly what was wrong, corrects just that field
  → get response → validate
  ↓ passes, or repeat up to a cap (e.g. 3 attempts)

if still failing after the cap → stop retrying, surface a clear error
  (don't loop forever — Week 3's agentic-loop fact about graceful exit applies here too)
```

**Why this beats just re-sending the same prompt unchanged:** a generic retry might make the same mistake again since nothing informed the model what went wrong. Feeding back the *specific* validation error narrows what needs to change, so each retry is more likely to converge than a blind repeat.

---

## ⑤ JSON vs XML Tags — Same Goal, Different Shape

Both exist to solve the problem of producing machine-parseable output that code can consume without breaking on prose variation, but suit different needs:

```
JSON:      best when the output IS the data you want to use directly —
           objects, arrays, typed fields, nesting. Native to most languages.

XML tags:  best for SECTIONING a longer, mixed response — e.g. separating
           "reasoning" from "final answer" within a single reply
           (<thinking>...</thinking><answer>...</answer>), especially
           useful with Anthropic models, which are trained to respect
           XML-tag structure well.
```

**Rule of thumb:** reach for JSON when you need typed, structured data to feed into code. Reach for XML tags when you need to separate distinct *sections* of a response (e.g. keeping Day 1's chain-of-thought reasoning separate from the final answer you actually parse).

---

## Summary — The Shift From Day 1

```
Day 1 gave you:   structure improves reliability — few-shot/CoT shape
                   HOW the model reasons and formats.

Day 2 adds:       once code (not a human) consumes the output, "usually
                   right" isn't good enough — you need a schema as a
                   shared contract between prompt and code, code-level
                   validation (not just prompt instructions) to catch
                   every failure, and a retry loop that feeds the
                   specific validation error back so the model can
                   self-correct instead of blindly repeating.
```

---

*Next: Lessons.md — Anthropic structured output docs, JSON mode reliability notes, and the 20-attempt parse-failure experiment*
