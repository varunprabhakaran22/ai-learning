# Day 3 — Multi-Step Tool Chains

---

## ① The Loop You Already Built, Just Run More Than Once

Day 1's `while (response.stop_reason === "tool_use")` loop already *can* run more than one iteration — nothing about it caps iterations at 1. Day 3 isn't new mechanics, it's the scenario where that loop actually earns its keep: tasks that need several tool calls **in sequence**, where each call's result changes what the next call should be.

```
 User query
     │
     ▼
┌─────────────────────┐
│ 1. Send: msg + tools │
└──────────┬────────────┘
            ▼
     ┌─────────────┐
     │   Model      │──► tool_use #1
     └──────┬───────┘
            ▼
  execute tool #1, inject result
            │
            ▼
     ┌─────────────┐
     │   Model      │──► reads result #1, decides it needs
     │              │    ANOTHER tool (not done yet) ──► tool_use #2
     └──────┬───────┘
            ▼
  execute tool #2, inject result
            │
            ▼
     ┌─────────────┐
     │   Model      │──► has enough now, writes final answer
     └──────┬───────┘
            ▼
     stop_reason: end_turn ──► displayed to user
```

Day 1's example only ever needed 0, 1, or 2 *independent* tools answered in one round. Day 3's case is **dependent** chaining: tool #2's input depends on tool #1's output (e.g. "look up this user's ID, then fetch that ID's transactions" — you can't build the second call until the first one returns).

---

## ② This Pattern Has a Name: ReAct (Reason + Act)

ReAct is the standard name for "the model alternates between reasoning about what to do next and actually doing it," instead of planning the whole multi-step task upfront in one shot.

```
Reason:   model thinks about what it needs and picks a tool
          ("I need the user's ID before I can get their transactions")
Act:      model calls that tool, your code executes it
Observe:  the tool's real result comes back to the model
          (repeat: Reason again, now informed by what it just observed)
```

**Why "observe-then-reason-again" beats "plan everything upfront":** the model often can't know what to do next until it sees what a prior tool actually returned (Theory.md ①'s dependent-chaining case). A rigid up-front plan ("call tool A, then B, then C") breaks the moment tool A returns something unexpected (empty results, an error, a different ID format than assumed). ReAct's loop re-plans after every observation instead of committing to a fixed script.

This is exactly what Day 1's while-loop already does structurally — Day 3 just names the pattern and asks you to reason about it explicitly as a *loop with a plan/observe cycle*, not merely "call tools until stop_reason changes."

---

## ③ Detecting Completion vs. Infinite Loops

Day 1/2's loop trusted `stop_reason` to naturally settle at `"end_turn"`. With multi-step chains, two new failure shapes become real:

```
Genuine completion:    stop_reason becomes "end_turn" — model got
                       enough information and wrote a final answer.
                       This is the loop's normal, expected exit.

Runaway/infinite loop: model keeps requesting tools indefinitely —
                       e.g. it never gets a satisfying result, calls
                       the same tool with slightly different args over
                       and over, or ping-pongs between two tools.
                       Nothing in Day 1's while-loop stops this.
```

**The fix: a hard iteration cap, checked independently of `stop_reason`.**

```
let iterations = 0
const MAX_ITERATIONS = 6   // arbitrary ceiling for a graceful exit

while (response.stop_reason === "tool_use") {
  iterations++
  if (iterations > MAX_ITERATIONS) {
    // graceful exit: stop calling the model with more tools, return
    // whatever partial answer/state you have, don't crash or hang
    break
  }
  ... execute tools, inject results ...
}
```

**Why this must be a hard ceiling, not a "trust the model to know when to stop" heuristic:** the model doesn't have a concept of "I've been going too long" unless you tell it (e.g. in the system prompt) — and even then, it's a suggestion, not a guarantee. The loop is *your* code; only your code can enforce a hard stop. This is the same instinct as Day 1's registry throwing on an unknown tool name, or Day 2's safe-failure catch — the model can misbehave or get stuck, so your code is the backstop, not the model's judgment.

---

## ④ Tool Failure Mid-Chain — Recovery, Not Just Catching

Day 2 covered making a *single* tool fail loud (return `Error: ...` as `tool_result` content instead of crashing). Day 3 extends this: in a chain, a failed tool result becomes part of an ongoing reasoning process, not the end of the interaction.

```
Single-call case (Day 2):   tool fails → error text → model tells
                             the user something went wrong → done

Chain case (Day 3):         tool #1 fails → error text → model reads
                             it and can choose to:
                               a) retry tool #1 with different input
                               b) try a DIFFERENT tool to get the same
                                  information another way
                               c) give up and tell the user honestly
                                  what it couldn't do
```

This only works because Day 2's failure mode was already "loud but non-crashing" — a mid-chain crash would kill the whole loop with no chance for the model to recover. The `MAX_ITERATIONS` cap (③) is also what prevents case (a) from becoming an infinite retry loop if the tool keeps failing.

---

## ⑤ Execution Trace — Logging Every Step, Not Just the Final Answer

Once a task takes several tool calls to resolve, "what did the model actually do to get this answer" stops being obvious from the final text alone. A **trace** is a plain log of every iteration: what tool was requested, with what input, what it returned, and what the model decided next.

```
Trace entry shape (one per tool call in the chain):
  { iteration: 1, tool: "getUserId", input: {name: "..."},
    result: "user_492", timestamp/order }
  { iteration: 2, tool: "getTransactions", input: {userId: "user_492"},
    result: [...], timestamp/order }
```

**Why this matters beyond debugging:** a chain that produces a wrong final answer is much easier to diagnose with a trace ("it called the right tools, but tool #2's input used a stale value from tool #1's earlier attempt") than by re-reading the final text and guessing. This is also the foundation for the Day 3 showcase task's "full execution trace logged" requirement — the trace is just an array your loop appends to on every iteration, no special infrastructure needed.

---

## Summary — The Shift From Day 1/2

```
Day 1 gave you:    the mechanical loop (request, execute, inject,
                    continue) and the fact that it CAN repeat.

Day 2 added:       tool design discipline — one job per tool, precise
                    descriptions, failures that reach the model as
                    text instead of crashing.

Day 3 adds:        actually exercising the loop across MULTIPLE
                    dependent steps (ReAct: reason → act → observe →
                    repeat), plus the two guardrails that only matter
                    once chains get long: a hard iteration cap (the
                    model can't be trusted to know when to stop) and
                    an execution trace (so a multi-step chain's
                    behavior is inspectable, not just its final text).
```

---

*Next: Lessons.md — ReAct pattern paper/explainer, agentic loop design notes, and the 3+ sequential tool call experiment (including an intentional tool failure to observe recovery)*
