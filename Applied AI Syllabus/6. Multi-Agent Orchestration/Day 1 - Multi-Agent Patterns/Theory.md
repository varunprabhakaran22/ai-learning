# Day 1 — Multi-Agent Patterns

## ⓪ Where we left off, and the actual problem today solves

Week 5 built one agent: a single LLM, wrapped in an executor loop, with its own planning, memory, and tools. That single agent can already decompose a large goal into subtasks (Day 3) and execute them one after another. So a fair question before going further: if one agent can already plan and execute a whole multi-step goal by itself, why would you ever need MORE than one agent working together?

The honest answer is: for many tasks, you don't — a single well-built agent is simpler to build, cheaper to run, and easier to debug than a multi-agent system, and "just add more agents" is not automatically an upgrade. But three concrete problems show up as a single agent's task gets larger or more varied, that adding more agents genuinely fixes, and today's job is naming exactly what those three problems are, what pattern fixes each, and — just as importantly — when NOT to reach for multi-agent at all.

**Problem 1 — context pollution.** A single agent doing "research three competitors AND write a report AND fact-check it" holds ALL of that work's context in one growing conversation history. Research results, half-finished draft text, and fact-check notes all pile up in the SAME context window together — even with Week 5's memory system trimming old messages, the agent doing the WRITING step still has to wade through everything the RESEARCH step produced, whether or not it's relevant to writing well. A dedicated writing agent, given only the finished research findings (not the research PROCESS — the searches, the false starts, the discarded sources), starts with a clean, focused context purpose-built for writing.

**Problem 2 — a single fixed prompt/persona can't be good at everything.** Week 1 Day 2 established that a system prompt shapes a model's behavior — tone, focus, constraints. A prompt engineered to be a careful, skeptical fact-checker ("flag anything unverifiable, be suspicious of unsourced claims") pulls the model's behavior in a different direction than a prompt engineered to be a fluent, confident writer ("write engagingly, don't hedge unnecessarily"). One single agent, one single system prompt, has to compromise between these — a specialist agent doesn't compromise, because it only needs to be good at one job.

**Problem 3 — no parallelism.** A single agent's executor loop (Week 5 Day 1) processes subtasks one at a time — even independent subtasks (researching competitor A, competitor B, competitor C — none of which depend on each other) run sequentially inside one agent's loop, because there's only one LLM "thread" making decisions. Real wall-clock time is wasted waiting for A to finish before starting B, when nothing about B actually depends on A's result.

Today names three architectural patterns — **orchestrator-worker**, **peer-to-peer**, and **supervisor** — each solving a different mix of these three problems, and gives you the concrete criteria for choosing (or explicitly rejecting) multi-agent for a given task.

---

## ① What "an agent" means when there's more than one — nothing new, just more of Week 5

Before the patterns: a multi-agent system is not a new kind of AI object. Every single agent in a multi-agent system is built exactly the way Week 5 taught — its own system prompt, its own registered tools (Week 3), its own executor loop, optionally its own memory. "Agent B" is just another instance of `runExecutorLoop` (or whatever your Week 5 implementation was called), configured with a different prompt and possibly different tools than "Agent A." What's genuinely new today is not the agent itself, but the **wiring between multiple agent instances** — who calls whom, in what order, and how results move from one agent to another. That wiring is what the three named patterns below actually describe.

---

## ② Pattern 1 — Orchestrator-Worker

**The shape:** one agent (the orchestrator) never does the actual domain work itself — its only job is to break the overall goal into subtasks (this reuses Week 5 Day 3's planning pillar directly) and dispatch each subtask to a separate WORKER agent, each a specialist built for one kind of subtask. The orchestrator collects each worker's result and decides what happens next — dispatch more work, or assemble the final answer.

```
                    ┌─────────────┐
                    │ Orchestrator │  ← plans, dispatches, collects, assembles
                    └──────┬──────┘
              ┌────────────┼────────────┐
              ▼            ▼            ▼
        ┌──────────┐ ┌──────────┐ ┌──────────┐
        │ Worker A │ │ Worker B │ │ Worker C │  ← each: own prompt, own tools,
        │(research)│ │ (write)  │ │(fact-check)  own executor loop (Week 5)
        └──────────┘ └──────────┘ └──────────┘
```

**Communication protocol, concretely:** the orchestrator sends each worker a task-specific prompt (built the same way Day 2's `buildPromptWithMemory` built a prompt from retrieved memory — assembled from real data, not a fixed template) and receives back that worker's final text output. Workers do NOT talk to each other directly — all communication flows through the orchestrator, which is what makes this pattern easy to reason about: there's exactly one place (the orchestrator) where you can see the full picture of what's happened so far.

**Which of ⓪'s three problems this fixes:** all three, when subtasks are genuinely independent — Worker A (research) never sees Worker B's half-finished draft (fixes context pollution); each worker has its own specialist prompt (fixes the compromise problem); and if the orchestrator dispatches independent subtasks concurrently (e.g. `Promise.all` across three worker calls) instead of one at a time, you get real parallelism (fixes problem 3) — this is exactly what "orchestrator-worker" buys you over a single agent that would otherwise process A, B, C sequentially in one loop.

**This is the default pattern for most real multi-agent systems** — precisely because centralizing decision-making in one orchestrator keeps the system's behavior predictable and debuggable, compared to the alternative below.

---

## ③ Pattern 2 — Peer-to-Peer

**The shape:** there is no single agent in charge. Multiple agents communicate directly with EACH OTHER, each deciding independently what to do next and who (if anyone) to hand off to, based on its own view of the conversation/task so far.

```
        ┌──────────┐  hands off   ┌──────────┐
        │ Agent A  │ ───────────► │ Agent B  │
        └──────────┘ ◄─────────── └──────────┘
              │        hands back        │
              │                          │
              └────────► ┌──────────┐ ◄──┘
                          │ Agent C  │
                          └──────────┘
                    (any agent can hand off to any other)
```

**Why this is genuinely harder to control, and when it's still worth it:** without one central decision-maker, there's no single place tracking "where are we in the overall task" — each agent has to infer that from whatever context it's been handed. This makes peer-to-peer systems significantly harder to debug (a failure could originate from any agent's local decision, and there's no orchestrator transcript giving you the full picture in one place) and harder to guarantee termination (Week 5 Day 1's stopping-condition problem, now multiplied across N agents each independently deciding whether to hand off again). Peer-to-peer is chosen specifically when the task itself doesn't have a natural top-down decomposition — e.g. a negotiation or debate between agents with genuinely different, not-hierarchical roles (a "proposer" and a "critic" agent volleying ideas back and forth an unknown number of times) — forcing that into an orchestrator-worker shape would be artificial, since there's no single subtask list to hand out upfront.

**Which of ⓪'s problems this fixes:** problem 2 (specialist prompts) and, if agents run concurrently, problem 3 (parallelism) — but NOT problem 1 as cleanly as orchestrator-worker, since without a central coordinator filtering what each agent sees, context can leak between agents more easily unless you deliberately design each handoff to pass only the relevant summary, not the full history.

---

## ④ Pattern 3 — Supervisor

**The shape:** a hybrid of the two above — a designated agent (the supervisor) DOES monitor and can intervene in what worker/peer agents are doing, but unlike a pure orchestrator, the supervisor's job is oversight and correction rather than dispatching the entire plan upfront. Concretely: worker agents propose actions or produce output, and the supervisor reviews that output against some standard before it's accepted — rejecting, requesting revision, or escalating to a human (Week 5 Day 4's Human-in-the-Loop pattern, reused as the supervisor's own escalation path) if something looks wrong.

```
        ┌──────────┐  produces output   ┌──────────────┐
        │ Worker(s) │ ─────────────────► │  Supervisor   │
        └──────────┘                    └───────┬───────┘
              ▲                                 │
              │        rejected — revise        │
              └─────────────────────────────────┤
                                                 │ approved
                                                 ▼
                                          final result
                                       (or escalate to human)
```

**Why this is a distinct pattern, not just "orchestrator with extra steps":** an orchestrator's job (② above) is decomposition and dispatch — it typically trusts each worker's output once returned. A supervisor's job is specifically JUDGING output quality/correctness after the fact — this is architecturally the same role as Week 4 Day 4's RAG evaluation (LLM-as-judge) and the 2026 "Outcomes" feature (Week 6 Day 2's tie-in) — a distinct model/prompt whose only job is to grade another agent's work against a standard, not to do the work itself.

**Which of ⓪'s problems this fixes:** primarily a NEW problem beyond the original three — reliability/correctness — by adding an explicit checking step that a pure orchestrator-worker system doesn't have built in by default (an orchestrator can be built to check worker output too, but "supervisor" names the pattern where that checking role is the system's defining feature, not an afterthought).

---

## ⑤ Communication protocols between agents — what actually gets passed, mechanically

In every pattern above, "Agent A hands off to Agent B" is not a special mechanism — it is, concretely, one of two things, both of which you already know:

- **A message, passed as a prompt.** Agent B receives a text prompt built from Agent A's output — exactly Week 5 Day 2's `buildPromptWithMemory` pattern: real data from a previous step, assembled into new prompt text, sent via `messages.create()`. There is no special "agent-to-agent" wire protocol required for this — it's the same API call every example in this curriculum has used since Week 1.
- **Shared state**, instead of (or alongside) direct messages — e.g. a shared file, database row, or in-memory object that multiple agents read from and write to, rather than passing full context directly to each other in every message. This is what "a shared filesystem," named in the Dynamic Workflows tie-in below, actually refers to: agents write their findings to files, and other agents read those files, rather than every finding being repeated in full inside every prompt.

**Why this distinction (message-passing vs. shared state) matters as a design decision, not just terminology:** message-passing keeps each agent's context minimal and explicit (you can see exactly what Agent B was told) but requires Agent A's relevant output to be explicitly extracted and included every time; shared state lets many agents pull from a common pool without re-sending everything, but makes it harder to know exactly what any one agent "saw" at decision time (it depends on the shared state's contents AT THE MOMENT it read from it, which can change). Production multi-agent systems typically use BOTH — shared state (a filesystem, a database) for large or reusable artifacts, and direct messages for the specific instruction/context each agent needs right now.

---

## ⑥ When multi-agent genuinely beats single-agent — and when it doesn't

**Multi-agent is worth the added complexity when:**
- Subtasks are genuinely independent and can run in parallel (real wall-clock savings, not just "sounds more sophisticated").
- Different subtasks need genuinely conflicting specialist behavior (fact-checking skepticism vs. confident fluent writing) that one system prompt can't hold simultaneously.
- The task is large enough that one agent's context window would fill with irrelevant cross-subtask noise.

**Multi-agent is NOT automatically better, and adds real costs:**
- More total LLM calls (each agent's own calls) — directly more expensive and slower for tasks that don't actually need parallel work.
- Harder to debug — a failure could originate in any one agent, and (especially in peer-to-peer) there may be no single transcript showing the full picture.
- Coordination overhead — building the orchestrator/supervisor logic, deciding what gets passed between agents, is itself real engineering work that a single well-planned agent (Week 5) doesn't need at all.

**The concrete test before choosing multi-agent:** could a single agent, with Week 5's planning pillar generating a good subtask list and executing it in sequence, actually finish this task correctly? If yes, and the only motivation for multiple agents is "it sounds more advanced," stay with one agent. Reach for multi-agent when you can name a SPECIFIC one of the three problems in ⓪ that a single agent concretely runs into for THIS task.

---

## ⑦ Tools-as-schema vs. tools-as-action — the same `tools` field, two different jobs

Week 3 taught `tools` as a way for the model to trigger a REAL action: `getAccountStatus`, `sendMessage` — each had a `run()` function that actually did something (called a real API, sent a real message) after the model requested it. That's **tools-as-action**, and every Week 3 example used tools this way.

There is a second, completely different use of the exact same `tools`/`input_schema` mechanism, which shows up constantly in multi-agent systems (especially the supervisor pattern): **tools-as-schema** — a tool with NO `run()` function at all, whose only job is forcing the model's reply into a specific structured shape instead of free text. Concretely, a supervisor judging a worker's output could be asked to reply with a string like `"APPROVE"` or `"RETRY: <reason>"`, and your code checks `judgment.startsWith("RETRY")` — but a model's free-text phrasing can drift ("I'll allow it," "Looks fine to me," "Approved!") in ways a human reading it understands instantly but a substring check silently misses. The fix: give the model a tool schema like

```
{
  name: "submit_verdict",
  input_schema: {
    type: "object",
    properties: {
      verdict: { type: "string", enum: ["approve", "retry", "escalate"] },
      reason: { type: "string" },
    },
    required: ["verdict", "reason"],
  },
}
```

paired with `tool_choice: { type: "tool", name: "submit_verdict" }` (an API field forcing the model to call THIS specific tool rather than leaving it optional or replying with plain text). The model still makes exactly one call — nothing here spawns a second LLM or a second request — but instead of writing prose, it returns a `tool_use` block containing `{ verdict: "retry", reason: "..." }`: real structured data, produced by the SAME single call, just constrained to a fixed shape by the schema. Your code then checks `decision.verdict === "retry"` — a property equality check against a value that is architecturally guaranteed to be one of exactly three strings — not a guess about how the model chose to phrase itself.

**Why this distinction matters enough to name explicitly:** nothing about the `tools` field itself signals which job it's doing — you have to look at whether a `run()`/execution step exists afterward. A tool with a real implementation function behind it (Week 3's whole world) is tools-as-action; a tool that exists ONLY to shape the reply, with nothing ever "executing" it, is tools-as-schema. Multi-agent coordination code (supervisor verdicts, orchestrator routing decisions, peer hand-off decisions) overwhelmingly wants tools-as-schema, because the entire point of those calls is getting a reliable, checkable DECISION back — not triggering a real-world side effect.

---

## ⑧ Real-world tie-in — Claude Code's Dynamic Workflows and Multi-Agent Orchestration (2026)

Anthropic shipped **Dynamic Workflows** and **Multi-Agent Orchestration** in Claude Code in 2026: a lead agent plans and decomposes a prompt, then fans work out to many (sometimes tens-to-hundreds of) parallel subagents working on a shared filesystem, cross-checking and refuting each other's findings, with a validation step before the final result returns.

Mapped directly onto today's content: this is orchestrator-worker at large scale — a lead agent (the orchestrator) planning and dispatching, worker subagents each handling one piece, running concurrently (fixing the lack-of-parallelism problem at scale). The "cross-checking/refuting each other's findings" step is the supervisor role, generalized so that subagents themselves take turns judging each other's output, not just one designated supervisor. The "shared filesystem" is shared-state communication, not message-passing — subagents write findings to files, other subagents (including the reviewing ones) read from those files, rather than every finding being repeated inside every prompt. Nothing here is a new architectural primitive beyond what this day taught — it's these exact same patterns, productized and scaled well past what you'd hand-build for a learning exercise.

---

## ⑨ Summary

| Pattern | Who decides what happens next | Best for | Main risk |
|---|---|---|---|
| Orchestrator-worker | One central orchestrator, upfront-ish plan | Independent subtasks, need for specialists, need for parallelism | Orchestrator itself is a bottleneck/single point of failure |
| Peer-to-peer | Each agent, independently, per handoff | Tasks with no natural top-down decomposition (debate, negotiation) | Hard to debug, hard to guarantee termination |
| Supervisor | Workers act, supervisor judges/gates the result | Correctness-critical output needing an explicit check before acceptance | Adds an extra LLM call layer purely for judging, not doing |

- Multi-agent is architecture reused from Week 5 (each agent is still just planning + memory + tools + executor) with new WIRING between agent instances — not a new kind of agent.
- Three concrete problems justify going multi-agent: context pollution, one-prompt-can't-be-good-at-everything, and lack of parallelism — name the specific one your task hits before adding agents.
- Communication is either message-passing (a prompt built from another agent's real output, same `messages.create()` call as always) or shared state (a common file/store multiple agents read/write) — production systems typically use both.
- The `tools` field does two different jobs depending on whether a `run()` implementation exists behind it: tools-as-action (Week 3, triggers a real side effect) vs. tools-as-schema (forces a reliable structured decision out of a single model call, used constantly for orchestrator/supervisor/peer coordination decisions).
- Claude Code's Dynamic Workflows/Multi-Agent Orchestration = orchestrator-worker + supervisor-style cross-checking + shared-filesystem state, scaled to many subagents — the same three patterns from today, not new ones.
