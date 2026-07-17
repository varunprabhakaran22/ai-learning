# Day 1 — Function Calling Fundamentals

---

## ① The Model Never Executes Anything — It Only Requests

Every previous week treated the model as something that reads input and writes text back. Tool use adds exactly one new capability, and it's easy to overstate what it actually is: **the model does not run code.** It outputs a structured description of *what it wants called*, and your code decides whether/how to actually run it.

```
What people imagine:      model → directly calls a function → gets result
What actually happens:    model → outputs {tool: "getWeather", input: {city: "Tokyo"}}
                           → YOUR code reads that, decides to call getWeather(),
                             runs it, gets a real result
                           → YOUR code sends the result back to the model
                           → model reads the result, continues
```

This matters because it means **you are always in the loop** — the model can request a dangerous or wrong tool call, but nothing happens unless your code actually executes it. Tool use is a proposal-and-execution split, not the model reaching outside its own token stream.

---

## ② Anatomy of a Tool Definition

For the model to request a tool correctly, it needs to know three things about each one, given to it up front in the request (not something it infers from your codebase):

```
name:         a unique identifier the model will reference
              (e.g. "getWeather")

description:  plain-language explanation of WHAT the tool does and
              WHEN to use it — this is the single biggest lever over
              whether the model calls it correctly (expanded Day 2)

input_schema: the exact shape of arguments the tool expects
              (reuses Prompt Engineering as a Systems Discipline Day 2 — Output Formatting & Structured Outputs's schema concept — same idea,
              new purpose: describing a FUNCTION's input instead of
              a FINAL ANSWER's shape)
```

**Key reuse from Week 2:** a tool's `input_schema` is structurally the same idea as the Zod/JSON schema from the `StructuredOutputParser` — a shared contract. The difference is *what* it constrains: Week 2's schema constrained the model's final answer; here it constrains the arguments to an intermediate function call.

---

## ③ The Full Loop — Request, Execute, Inject, Continue

A single tool-using exchange is not one API call — it's a **loop across at least two calls**, and this is the core mechanic to internalize:

```
1. You send: user message + list of available tool definitions
2. Model responds with EITHER:
     a) a normal text answer (didn't need a tool), OR
     b) a tool_use block: {tool: "getWeather", input: {city: "Tokyo"}}
3. If (b): your code executes the REAL function — getWeather("Tokyo")
4. You send a NEW request: original history + the model's tool_use block
   + a tool_result message containing what the function actually returned
5. Model reads the tool_result and produces its final answer
   (or requests ANOTHER tool call — loop continues, see Day 3)
```

**Why step 4 needs the full history, not just the result:** Week 1's stateless fact applies again — the model has no memory of requesting the tool. If you only sent the raw result with no context, the model wouldn't know what question that result answers. You resend everything, same as any other stateless call.

### Worked trace — one real query end to end

Concrete walk-through with a made-up `getHighAUMUsers(city)` tool, to make the two-call loop and who-does-what unambiguous. User asks: *"Which clients have over 300cr AUM in Chennai?"*

```
STEP 1 — you send the request
  messages = [{ role: "user", content: "Which clients have over 300cr AUM in Chennai?" }]
  client.messages.create({ tools: [ {name, description, input_schema} ], messages })
  input_schema here is a CONTRACT you wrote once — it says what shape
  of arguments this tool accepts. It is not sent "for" anything to run;
  it exists purely so the model knows what it's allowed to produce.

STEP 2 — model reads the question + schema, decides to call the tool
  Model output (generated tokens, not a function call):
    { type: "tool_use", id: "toolu_abc123", name: "getHighAUMUsers",
      input: { city: "Chennai" } }
  The model FORMATTED input to match your input_schema — it extracted
  "Chennai" from the user's own sentence itself. Your function never
  sees the schema; the model is the one who reads and follows it.

STEP 3 — your code executes the REAL function
  block.name === "getHighAUMUsers", block.input === { city: "Chennai" }
  registry.execute(block.name, block.input) looks up and calls the
  actual function — real fetch/DB/file call — and gets a raw result,
  e.g. [{ name: "Divya Nair", city: "Chennai", aumCr: 610 }]

STEP 4 — result goes BACK to the model, NOT to the user yet
  messages.push({ role: "user", content: [{ type: "tool_result",
    tool_use_id: "toolu_abc123", content: JSON.stringify(rawResult) }] })
  client.messages.create({ tools, messages })   ← second API call

STEP 5 — model reads the raw result, writes a human sentence
  stop_reason: "end_turn"
  content: [{ type: "text", text: "Divya Nair is the only client in
             Chennai with over 300cr AUM (₹610cr)." }]

STEP 6 — your code extracts that text — THIS is what reaches the user
  finalText = response.content.find(b => b.type === "text")
  return finalText.text   →  displayed in chat
```

**The one correction worth internalizing:** the raw tool result (Step 3's JSON) never goes to the user directly. It goes to the model first (Step 4), and the model is what turns raw data into a natural-language answer (Step 5) — only that final text is what your UI displays. This is exactly why it's a loop of at least two API calls, not one: call #1 gets the tool request, call #2 gets the human-readable answer.

```
 User query
     │
     ▼
┌───────────────────────────┐
│ 1. Send: message + tools  │
└─────────────┬─────────────┘
              ▼
       ┌─────────────┐
       │    Model     │── decides a tool matches, formats input per input_schema
       └──────┬───────┘
              ▼
     tool_use: {name, input}
              │
              ▼
┌─────────────────────────────┐
│ 2. YOUR CODE executes the    │
│    real function (fetch,     │
│    file read, DB call...)    │
└─────────────┬─────────────────┘
              ▼
       raw result (JSON/text)
              │
              ▼
┌─────────────────────────────┐
│ 3. Send BACK: full history +  │
│    tool_result                │
└─────────────┬─────────────────┘
              ▼
       ┌─────────────┐
       │    Model     │── reads raw result, writes human sentence
       └──────┬───────┘
              ▼
     text response (stop_reason: end_turn)
              │
              ▼
       Displayed to user in chat
```

---

## ④ The Model Decides IF a Tool Is Needed, Not Just How

A common misconception is that giving the model tools means it will always use them. In practice, the model weighs the question against the available tool descriptions and decides whether a tool is necessary at all:

```
"What's 2+2?"                    → no tool needed, model answers directly
                                    even if a calculator tool is available
"What's the weather in Tokyo?"   → model has no way to know this from
                                    training data alone → requests the
                                    getWeather tool
"What's 847293 * 293847?"        → technically answerable by the model's
                                    own reasoning, but a calculator tool
                                    (if available) is more reliable →
                                    model may choose to call it anyway
```

**This decision quality depends entirely on a tool definition's description field** — the plain-language explanation of what the tool does and when to use it — and a vague description makes the model guess wrong about when to reach for a tool (covered in depth Day 2). Giving a model 3 tools and asking questions that need 0, 1, or 2 of them (this Day's experiment) is directly testing this decision-making, not just execution mechanics.

---

## ⑤ Why a Registry, Not Inline Tool Definitions

Once you have more than one or two tools, hardcoding each tool's definition inline at every call site duplicates the same name/description/schema everywhere and makes updating a tool's behavior error-prone (update the function but forget to update its description elsewhere). A **registry** centralizes this:

```
Without a registry:  every place that calls the model re-writes/re-pastes
                      the same tool definitions → drift between what the
                      function actually does and what its description says

With a registry:      tools are registered once (name + description +
                       schema + the actual function) → any code path
                       that needs tools pulls the current definitions
                       from one place → the step where your code executes
                       the real function also looks up that function from
                       the same registry,
                       so the description and the implementation can
                       never point to two different things
```

This is the same instinct as Prompt Engineering as a Systems Discipline Day 3 — Prompt Versioning & Testing's "versions, not scattered copies" — one source of truth that multiple call sites read from, instead of copies that can silently diverge.

---

## ⑥ `stop_reason` — Fixed API Metadata, Not Model-Generated Text

Every response carries a `stop_reason` field telling you *why generation stopped*. It's easy to assume this is something the model "writes" and could therefore hallucinate — it isn't, and it can't:

```
stop_reason is set by the API layer based on what actually happened
during generation. It is NOT part of the model's free-text output —
the model doesn't choose or type this value, so there's no "random"
or made-up stop_reason.
```

The fixed set of values:

```
"end_turn"       model finished its answer naturally and stopped on its
                 own — this is the NORMAL/POSITIVE case, not an absence
                 of an answer. Most plain-text responses end this way.

"tool_use"       model emitted a tool_use block and is pausing,
                 waiting for you to execute it and send back a result
                 (this is the continue condition for the request →
                 execute → inject → continue loop)

"max_tokens"     generation was cut off because it hit your
                 max_tokens limit mid-response

"stop_sequence"  generation hit a custom stop sequence you configured
```

**Every response has exactly one of these — there is no "missing" or "no stop reason" case.** `while (response.stop_reason === "tool_use")` (the request → execute → inject → continue loop) relies on this: the loop exits the moment `stop_reason` becomes anything else, most commonly `"end_turn"` once the model has a final answer.

**What actually CAN be hallucinated:** the *content* inside a `tool_use` block — e.g. garbled/invented arguments in `input`, or (rarer) a `name` that doesn't match any registered tool. That's a real failure mode to guard against (see the registry's `execute` throwing on an unknown tool name). `stop_reason` itself is structural metadata, not content, so it's a different category of risk entirely.

---

## Summary — The Shift From Week 2

```
Week 2 gave you:   full control over what the model's OUTPUT looks like
                    — structure, validation, versioning, model choice.

Tool Use & Function Calling Day 1 — Function Calling Fundamentals adds: the model can now ask YOUR CODE to do something
                    mid-response, via a structured request (not
                    execution) that your code chooses to fulfill. This
                    turns a single call into a loop (request → execute
                    → inject result → continue), and centralizing tool
                    definitions in a registry keeps the model's
                    understanding of a tool in sync with what that
                    tool actually does.
```

---

*Next: Lessons.md — Anthropic tool use docs, function calling architecture notes, and the 0/1/2-tool-call decision experiment*
