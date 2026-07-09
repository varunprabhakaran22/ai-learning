# Day 2 — Building Real Tools

---

## ① Single Responsibility — One Tool, One Job

A tool should do exactly one thing, with a name that says what that thing is. This isn't a style preference — it directly affects the model's ability to pick the right tool:

```
Bad:   manageFile(action, path, content?)
       — one tool secretly doing 3 things (read/write/delete) via a
         hidden "action" flag the model has to guess correctly

Good:  readFile(path)
       writeFile(path, content)
       deleteFile(path)
       — 3 tools, each with an unambiguous name + purpose. The model's
         job becomes "pick the matching name" instead of "pick the
         name AND guess the right mode string"
```

**Why this matters more here than in normal software design:** in regular code, a multi-purpose function is a style nitpick because the caller (a human developer) can read the source to disambiguate. The model's caller-side knowledge is *only* the name + description (Week 3 Day 1, fact ②) — it never reads your implementation. Every bit of hidden logic behind a flag is a chance for it to guess wrong.

---

## ② The Description Is the Only Interface the Model Has

Day 1 established descriptions matter (Day 1 fact ④). Day 2 goes further: **the description is doing double duty** — it's not just "what does this do," it's "when should I reach for this, and when should I NOT."

```
Vague:    "Gets weather information."
          — model can't tell if this needs a city name, zip code,
            lat/long, or if it works for future forecasts too

Precise:  "Get the CURRENT weather for a named city (not a forecast,
          not historical data). Use this when the user asks what
          the weather is like right now in a specific place. Do NOT
          use this for weather trends or multi-day forecasts —
          no such data is available from this tool."
```

The precise version does three jobs a vague one skips:
1. States the exact scope (current, not forecast/historical)
2. States the trigger condition ("use this when...")
3. States the anti-trigger ("do NOT use this for...") — this is the part most people forget, and it's often what prevents wrong tool calls on edge-case questions

**This is testable, not just a guideline** — Day 2's experiment is literally writing the same tool twice (vague vs. precise description) and counting how often the model picks it correctly. Bad descriptions cause two failure types: calling a tool when it shouldn't (false positive) and skipping a tool when it should've been used (false negative).

---

## ③ Safe Failure Modes — Tools Must Fail Loud, Not Silent

A tool can fail for reasons entirely outside the model's control: a file doesn't exist, a URL times out, an API key is missing. Day 1's `execute()` already threw on an unknown tool name — Day 2 extends this principle to every *expected* failure inside a tool's own logic, not just the registry's lookup.

```
Silent failure:   readFile(path) returns "" or undefined when the
                  file doesn't exist
                  → model has no idea if the file was genuinely
                    empty or if something went wrong, and may
                    confidently report wrong information to the user

Loud failure:     readFile(path) returns/throws a clear error message
                  describing what happened: "File not found:
                  /some/path.txt"
                  → this becomes the tool_result content sent back
                    to the model, which can now tell the user
                    accurately, or try a different approach
```

**Key mechanic: an error can still flow through the normal `tool_result` message** — you don't need a different code path for failures. You can send the *error text itself* as the `content` of a `tool_result` block (Day 1's loop, step 4) instead of a successful result. The model reads it like any other tool output and reasons about what to do next (report the failure, try alternate input, ask the user for clarification). The failure is loud to the model, not to your process — a thrown error would crash `runWithTools` outright, so the failure needs to be *caught and converted into readable tool_result content*, not left as an uncaught exception.

```
Registry-level pattern:
  async execute(name, input) {
    const tool = tools.get(name)
    if (!tool) throw new Error(`no tool registered with name "${name}"`)
    try {
      return await tool.fn(input)
    } catch (err) {
      return `Error: ${err.message}`   // flows back as tool_result content,
    }                                   // model sees it, doesn't crash the loop
  }
```

---

## ④ Real Tools Touch the Outside World — New Risk Surface

Day 1's three tools were stubs (fake weather data, a restricted eval). Day 2's toolkit does real I/O: hitting a search API, reading/writing local files, fetching arbitrary URLs. This introduces failure/risk categories that didn't exist with stubs:

```
searchWeb(query)   — real network call: can time out, rate-limit,
                     or return no results (all need a safe failure
                     path per ③, not a crash)

readFile(path)     — path could point outside an intended directory
                     (e.g. "../../.env") — a real tool needs to
                     decide/validate what paths are acceptable

writeFile(path, x) — can silently overwrite something important;
                     "safe failure mode" here also means thinking
                     about what this tool is ALLOWED to do, not just
                     how it reports errors

fetchURL(url)      — fetching an arbitrary attacker-influenced URL is
                     the seed of SSRF (full treatment: Week 12 Day 5)
                     — for now, just know that "real tool touching
                     the outside world" is where that risk begins

getCurrentDate()   — no external I/O, no new risk; included as the
                     one "pure" tool in the set for contrast
```

This isn't asking you to build production-grade sandboxing today (Week 12 covers hardening) — it's the reason Day 2 exists right after Day 1: once tools do real things, "the model can request a dangerous or wrong tool call, but nothing happens unless your code executes it" (Day 1 fact ①) stops being a purely theoretical safety note and becomes something your `fn` implementations actually have to think about.

---

## Summary — The Shift From Day 1

```
Day 1 gave you:    the mechanical loop — request, execute, inject,
                    continue — using 3 stubbed, harmless tools.

Day 2 adds:        the judgment calls that make tools reliable in
                    the real world — one job per tool, descriptions
                    precise enough to prevent both over-calling and
                    under-calling, and failures that reach the model
                    as readable text instead of crashing the process.
                    Tools also now do real I/O, which is the first
                    point where "the model can request something
                    dangerous" becomes a concrete concern instead of
                    an abstract warning.
```

---

*Next: Lessons.md — LLM tool design best practices, Anthropic tool description guidelines, and the vague-vs-precise description experiment*
