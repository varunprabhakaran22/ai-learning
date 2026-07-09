# Day 6 — LLM Pipeline Hooks (Intro)

---

## ① A Hook Is Your Own Code, Not the Model's

The very first thing to pin down, since it's the natural point of confusion: **a hook is plain business logic you write — it is never a prompt, and the model is never aware it exists.**

```
NOT a hook:     asking the model "before you answer, check if this
                input contains PII" — that's just a different PROMPT,
                still going through the model, still costs a request

A hook:         a plain JS function that runs at a fixed point in
                YOUR code's pipeline — e.g. right before you call
                registry.execute(name, input) — that inspects or
                modifies data using ordinary logic (regex, an
                allowlist check, a console.log), with ZERO model
                involvement
```

Compare to what you already know: Day 1's `registry.execute()` is a plain function that looks up and runs a tool — the model never sees it, never knows it ran, only sees the *result* that comes back as `tool_result`. A hook is the exact same category of thing: code that runs in the gaps around the model, not code the model writes or is aware of.

---

## ② Where Hooks Fit — the Same Loop You Already Built

Nothing about Day 1-3's loop structure changes. A hook is just a checkpoint you insert at a point that already exists in your code:

```
 User query
     │
     ▼
┌─────────────────────────┐
│ 1. Send: message + tools │
└───────────┬───────────────┘
             ▼
      ┌─────────────┐
      │    Model     │──► tool_use: {name, input}
      └──────┬───────┘
             ▼
   ┌───────────────────────┐
   │  HOOK: beforeToolCall   │ ← your code runs here, BEFORE the
   │  (inspect/allow/deny)   │   real function executes — this is
   └───────────┬─────────────┘   new; nothing here before Day 6
               ▼
   registry.execute(name, input)   ← Day 1's existing execution step,
               │                      completely unchanged
               ▼
   ┌───────────────────────┐
   │  HOOK: afterToolCall    │ ← your code runs here, AFTER the real
   │  (inspect/log/modify)   │   result, BEFORE it's sent back to
   └───────────┬─────────────┘   the model
               ▼
   tool_result sent back to model (Day 1's loop, continues as usual)
```

A hook doesn't replace `registry.execute` — it wraps around it. The tool's real function still runs exactly the same way it did in Day 1-3; a hook just adds an inspection point immediately before and/or after that call, without the calling code needing to know the hook is there.

---

## ③ The Core Value: Decoupling, Not New Capability

Everything a hook does, you could technically write inline inside `execute()` itself. The reason to use a hook instead is separation of concerns — the same instinct as Day 1's registry (①'s "one source of truth"):

```
Without a hook:    execute() itself grows a pile of unrelated
                   concerns — logging, validation, redaction — all
                   tangled into the one function that's supposed to
                   just "run the tool"

With a hook:       execute() stays exactly as simple as Day 1 wrote
                   it. Logging/validation/redaction live as SEPARATE
                   functions, registered once, that run automatically
                   around every tool call — add or remove one without
                   touching execute() at all
```

A single logging hook wrapped around Day 3's `ReActLoop` can log every tool call's name/input/result — with **zero changes** to the loop code itself. That's the entire point: instrumentation added from the outside, not edited into the thing being instrumented.

---

## ④ Minimal Shape (Just Enough for Day 6)

Day 6 is intentionally shallow — just enough to recognize the pattern. A `beforeToolCall` hook can inspect a proposed call and decide whether to let it through:

```js
async function executeWithHook(registry, name, input, beforeToolCall) {
  const decision = await beforeToolCall(name, input);  // your own logic,
  if (decision?.blocked) {                              // no model involved
    return `Error: blocked by hook — ${decision.reason}`;
  }
  return registry.execute(name, input);   // Day 1's execution, unchanged
}
```

That's the whole mechanic: a function call inserted before the real one, that can inspect, log, or short-circuit — nothing more is needed to understand what a hook fundamentally is. Deeper concerns (multiple hooks on the same stage, ordering guarantees, a hook itself throwing, async chains, transform hooks that rewrite the request/response) are real topics but deliberately **not** covered here — deferred until an actual need for them shows up later in the syllabus (e.g. Guardrails/Observability).

---

## Summary

```
A hook is:      your own plain function, run automatically at a fixed
                point around an existing step (like Day 1's
                registry.execute) — never a prompt, never something
                the model sees or knows about.

Why bother:     keeps cross-cutting concerns (logging, validation,
                redaction) OUT of the core loop/execute code, so they
                can be added or removed independently.

Scope today:    recognize the pattern with one minimal example
                (beforeToolCall). Ordering, failure handling, and
                transform hooks are deliberately left for later.
```
