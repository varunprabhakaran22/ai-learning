# Day 2 Recap — Output Formatting & Structured Outputs

## Why structured output matters
- Once code (not a human) reads the output, "close enough" breaks things — `response.name` either works or throws, there's no reading between the lines like a human would.
- JSON is the default because it has one unambiguous, parseable shape.

## Two separate levers — asking vs enforcing
- **Prompt-level:** telling the model "respond in JSON" / showing the shape wanted. Raises the odds, doesn't guarantee it.
- **Code-level:** actually parsing + validating (Zod/schema) before trusting the response. This is what makes it *actually* reliable.
- Need both — a better prompt reduces how often validation has to catch something, but validation is still non-negotiable.

## Interview gotcha — how true structured-output *enforcement* actually guarantees syntax
- True JSON mode / schema-constrained output isn't "asking harder" — it's **constrained decoding**: at each generation step, the token sampler masks out (zeroes the probability of) any token that would violate the schema's grammar, so an invalid token is structurally impossible to emit, not just unlikely.
- This guarantees valid *syntax* only. It does **not** guarantee valid *content* — a syntactically perfect JSON object can still contain a hallucinated value or a wrong number in a correctly-typed field. Schema validation catches shape errors; it can't catch a confidently wrong value that happens to be the right type.

## Schema = shared contract
- One schema definition does two jobs: tells the model the shape (via prompt), tells the code what to check (via validation).
- Because it's the same definition in both places, they can't silently drift apart when the schema changes.

## Retry loop with error feedback
- Don't just re-send the same prompt on failure — feed back the *specific* validation error ("field 'age' must be a number, got string").
- Model gets told exactly what was wrong, only needs to fix that.
- Cap retries (e.g. 3) — don't loop forever, surface a clear error if it never converges.

## JSON vs XML tags
- JSON — for actual structured data you feed into code.
- XML tags — for separating sections within one response (e.g. reasoning vs final answer). Anthropic models are trained to respect XML tags well.

## The Overall Shift
```
User:      "Just tell it to respond in JSON, that's good enough."
Engineer:  "A prompt instruction is a strong bias, not a guarantee.
            The schema is a shared contract — same definition feeds
            the prompt AND validates the response. Code-level
            validation catches what the prompt alone won't, and a
            retry loop with the SPECIFIC error fed back turns a
            failure into a self-correction instead of a repeat guess."
```

## Still need to cover / do
- Run example.js for real — check how often attempt 1 fails vs succeeds
- Run the 20-attempt experiment (Lessons.md Part C): casual request vs explicit schema, compare parse-failure rates
- Read Anthropic structured output docs + JSON mode reliability notes (Lessons.md Parts A/B), fill in real notes
- Prompt Engineering as a Systems Discipline Day 3 — Prompt Versioning & Testing
