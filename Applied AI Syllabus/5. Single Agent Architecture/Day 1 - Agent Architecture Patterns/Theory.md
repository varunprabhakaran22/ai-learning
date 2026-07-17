# Day 1 — Agent Architecture Patterns

## ⓪ Where we left off, and the actual question today answers

Weeks 3 and 4 gave you two real capabilities: Week 3, tools (Claude can request a real function call, get a real result back, and continue); Week 4, RAG (Claude can be handed retrieved text from your own documents before answering). Both of these, on their own, are still just **one request → one response**, even when a tool loop runs a few iterations back and forth. You, the developer, still decided in advance exactly which tools exist, what the loop's exit condition is, and what happens with the final answer.

Today's question: at what point does a system built from these pieces stop being "a request with some extra tool-calling machinery bolted on" and start being what the industry calls an **"agent"**? This isn't a vocabulary exercise — real production systems (Cursor, Claude Code itself, Perplexity, AutoGPT-style projects) get called "agents" in marketing material, but they differ enormously in how much autonomy they actually have, and knowing the real dividing line is what lets you correctly design one instead of just wiring together tool calls and hoping.

The answer the field has converged on: an agent isn't a new API feature or a new model capability. It's an **architecture** — a specific arrangement of four components, working together, where the LLM itself decides the *sequence and the stopping point*, not just individual tool inputs one at a time. The rest of today builds up what those four components are, why each is genuinely necessary (not just "nice to have"), and where the line between "just a tool loop" and "a real agent" actually sits.

---

## ① Chain vs. Agent — the plain-language distinction, before any architecture

Before touching the four pillars, you need one clean mental split, because "agent" is thrown around loosely in marketing and it will confuse you if left vague.

**A chain** is a sequence of steps YOU (the developer) hard-coded in advance: step 1 always runs, then step 2 always runs, then step 3. Think of Day 2's RAG pipeline from Week 4 — `retrieve → augment → generate` is always exactly those three steps, in that exact order, every single time, regardless of what the retrieved text turns out to say. The LLM only fills in content *within* a step (writing the final answer); it never decides *whether* a step happens, *which* step happens next, or *how many times* to repeat something. The control flow is fixed code, written by you, that happens to call an LLM at certain points.

**An agent** is a system where the LLM itself, at runtime, decides what to do next based on what it currently knows — including whether to call a tool, which tool, what to do with the result, whether to try something else if that result wasn't good enough, and when it's actually done. The control flow itself is not fixed in your code; it emerges from the LLM's own reasoning, iteration after iteration, until the LLM itself judges the goal is complete.

Concrete side-by-side: Week 3 Day 3's `runReActLoop` (`getUserId` → `getTransactions`) is *borderline* — the LLM chose which tool to call and when, which is agent-like, but the overall goal ("answer this one question") and the tools available were narrow and fixed for one exchange. A full agent extends this same reasoning loop across a much larger, open-ended goal ("plan and execute this whole multi-day task"), decides its OWN subtasks (nobody hard-coded "first do X, then Y"), and keeps going across many more iterations, potentially revising its own plan mid-way. Same underlying mechanism (the tool-use request/response loop from Week 3), used at much larger scope and with much more of the decision-making handed to the model instead of your code.

This is the actual line: **a chain's control flow lives in your code; an agent's control flow lives in the LLM's own repeated reasoning.** Everything below is about what has to exist around the LLM to make that possible and reliable.

---

## ② Pillar 1 — Tools (Action): already built, now reused as a component

You already have this pillar in full from Week 3: a `ToolRegistry` (`register`, `getDefinitions`, `execute`), the request→execute→inject→continue loop, and the safe-failure pattern (catch inside `execute`, return error text as `tool_result` rather than crashing). Nothing new to learn here mechanically — what's new today is the *role* this pillar plays inside a bigger system: tools are the agent's only way to affect or observe the outside world (read a file, call an API, write output). Without this pillar, an "agent" can only think in text and never actually do anything — it would be pure conversation, not action. This is why the pillars are always listed as "planning, memory, tools, action" — tools ARE the "action" pillar; they're not a separate fifth thing.

---

## ③ Pillar 2 — Planning: breaking one big goal into an ordered sequence of smaller steps

**The problem this solves:** give an LLM a genuinely large, multi-step goal in one shot — e.g. "research three competitor products and write a comparison report" — and ask it to just start calling tools immediately with no upfront plan, and you get a common, real failure mode: the model does SOME useful work, but skips steps, forgets earlier findings by the time it needs them, or produces a shallow answer because it never actually decomposed the goal into concrete pieces it could execute one at a time. Planning is the fix: before acting, the agent generates an explicit ordered list of subtasks, and executes against that list rather than improvising the whole thing from a single instruction.

**Mechanically, how planning actually works:** it is not a separate model or magic feature — it's simply an additional LLM call (or the same call, prompted differently) that asks the model to output a structured plan BEFORE any tool-calling begins. Concretely:

```
Prompt: "Goal: research three competitors and write a comparison report.
Break this into an ordered list of concrete subtasks. For each subtask,
note what it depends on (if anything)."

Model's plan output (plain text or JSON):
1. Identify the three competitors (no dependency)
2. Search for competitor A's pricing and features (depends on: 1)
3. Search for competitor B's pricing and features (depends on: 1)
4. Search for competitor C's pricing and features (depends on: 1)
5. Compile findings into a comparison table (depends on: 2, 3, 4)
6. Write summary report (depends on: 5)
```

Your code then takes this plan and executes it — subtask by subtask, in dependency order — rather than asking the LLM to improvise the entire goal in one pass. This is exactly the same "the model reasons in text, your code parses that text and acts on it" pattern from Week 2 (structured output) and Week 3 (tool_use blocks) — planning isn't a new mechanism, it's the same "ask the model for structured text, then execute it programmatically" idea applied one level up, to the shape of an entire task instead of one function call.

**Two named planning strategies, and when each applies:**

- **Linear planning** — the plan above: a straight ordered (or dependency-ordered) list, generated once, executed top to bottom. Works when the task is genuinely well-understood upfront and subtasks don't need to change based on what earlier subtasks discover.
- **Tree-of-thought (ToT)** — instead of committing to one single plan/reasoning path, the model generates SEVERAL different candidate next-steps (or several different full reasoning paths) at each decision point, evaluates which one looks most promising (either by itself, or via a separate "critic" call scoring each branch), and continues down the best one — abandoning the others. This matters for tasks with real ambiguity about the best approach (e.g. "solve this logic puzzle" — there may be several plausible next moves, and committing to the first one that comes to mind can dead-end; ToT explores a few, picks the branch scoring best, and backtracks if a branch stalls). This costs more (multiple candidate generations per decision point instead of one) so it's reserved for genuinely hard/ambiguous reasoning tasks, not routine multi-step chores.

**Where planning fails, concretely (the syllabus explicitly calls this out — "when planning fails" is core content, not an aside):**
- **Stale plans** — the plan was generated once upfront, but step 2's actual result reveals the original plan's assumption was wrong (e.g. "Competitor C" turns out not to exist under that name) — a rigid linear plan has no mechanism to notice and adjust; this is exactly why **dynamic replanning** exists — the executor checks after every step whether the plan is still valid and regenerates or patches it if not — the agent must be willing to regenerate or patch its plan mid-execution, not just execute the original list blindly to the end.
- **Over-decomposition** — breaking a genuinely simple task into 15 tiny subtasks wastes LLM calls (cost + latency) for no benefit; planning granularity should roughly match task complexity, not be maximized by default.
- **Under-specified subtasks** — a plan step like "research the competitor" (vague) gives the executor nothing concrete to act on; good subtasks name a specific action ("search for X's published pricing page"), not a vague intention.

---

## ④ Pillar 3 — Memory: what the agent still knows as iterations pile up

**The problem this solves:** a single Week 3 tool-use loop is short — a handful of iterations, all within one prompt's context window, so "memory" was never really an issue: everything relevant was still sitting right there in the conversation. A real agent runs far longer — many more iterations, possibly across multiple separate sessions (today's session, tomorrow's session) — and two distinct problems show up that never mattered before: (a) the context window has a hard token limit (Week 4 Day 1 already established this exists), so an agent's own growing history of actions/results will eventually not fit; (b) even within the limit, cramming in every single past action/result as raw text dilutes the model's attention on what's actually relevant right now — the same "too much irrelevant context hurts more than it helps" problem RAG solved for documents, now showing up for the agent's OWN history of what it's done.

**Four distinct types of memory, and the specific job each one does:**

- **In-context (short-term) memory** — simply the current conversation's message history, sitting directly in the prompt, exactly like every example since Week 1. Cheapest, fastest, zero extra machinery — but bounded by the context window, and gone the moment the session ends (nothing persists).
- **External / vector memory** — this is Week 4's embeddings + vector search (Day 1), reused as a component: instead of retrieving from a document store, the agent's OWN past actions/observations get embedded and stored, and at each new step the agent retrieves only the past entries relevant to what it's doing right now (not its entire history) — same `embed → store → cosine similarity → topK` mechanism from Week 4 Day 1, applied to the agent's own history instead of external documents. This solves problem (a) and (b) above simultaneously: only relevant history gets pulled back in, and it can hold far more total history than the context window alone (most of it lives outside the prompt, in the vector store, until retrieved).
- **Episodic memory** — memory of specific PAST SESSIONS/episodes ("last Tuesday, this same agent, working for this same user, tried X and it failed for reason Y"). Mechanically this is usually implemented as a specific KIND of entry stored in the same external/vector memory (tagged with a session ID/timestamp), retrieved the same way — the distinguishing feature is WHAT it stores (a summarized past interaction/outcome) rather than a different storage mechanism. This is what lets an agent avoid repeating a mistake from a previous, entirely separate run.
- **Semantic memory** — durable FACTS the agent has learned that aren't tied to any one episode ("this user's timezone is IST," "this user prefers metric units") — again typically stored the same way (embedded + retrieved from a store), distinguished from episodic memory by being a standing fact rather than a record of "what happened in session N."

**Why episodic/semantic memory needs summarization, not raw storage:** storing every single raw action+result from every past session verbatim would make the memory store enormous and mostly noise (Day 1 Week 4's near-duplicate-flooding trap, now showing up for an agent's own history instead of documents). The practical pattern (the syllabus's own showcase task names this explicitly: "auto-summarization") is: at the end of a session, run an LLM call that condenses what happened into a short summary ("attempted to book flight for user X, failed due to expired card, user was informed"), embed and store THAT summary, not the full raw transcript. Retrieval later pulls back concise, already-distilled memories instead of a firehose of raw logs.

**How this maps onto the actual sliding-window + vector-store split named in the showcase task:** short-term = a sliding window of the last N messages kept directly in context (cheap, immediate); long-term = the vector store of summarized past episodes/facts, retrieved only when relevant to the current step. Both run simultaneously in a working agent — short-term for "what just happened a moment ago," long-term for "what do I know from before that's relevant right now."

---

## ⑤ Pillar 4 — the Executor/Action loop: what actually ties the other three together at runtime

Planning produces a list of subtasks; memory supplies relevant context; tools are the available actions — the **executor** is the runtime loop that actually drives execution using all three, iteration after iteration, and is where "agent" stops being a diagram and becomes running code. Its job, each iteration:

```
    ┌─────────────────────────────────────────────┐
    │            EXECUTOR LOOP (per step)           │
    └─────────────────────────────────────────────┘
                       │
                       ▼
     1. Pull next subtask from the plan (the ordered, dependency-ordered
        subtask list a planning call already produced)
                       │
                       ▼
     2. Retrieve relevant memory for this subtask (short-term context
        plus any summarized episodic/semantic entries that apply)
                       │
                       ▼
     3. Ask the LLM: given this subtask + retrieved memory,
        decide the next action (may be a tool call — Week 3's
        exact request→execute→inject loop runs here)
                       │
                       ▼
     4. Execute the tool, get the real result
                       │
                       ▼
     5. Store this step's outcome into memory (embed and save it so a
        later, relevant step can retrieve it)
                       │
                       ▼
     6. Check: did this subtask succeed? Does the overall
        plan need to change given what was just learned?
                       │
              ┌────────┴────────┐
              ▼                 ▼
        subtask failed/     all subtasks
        plan invalidated    done, goal met
              │                 │
              ▼                 ▼
        replan (rerun the    STOP — return
        planning step to     final result
        regenerate/patch
        the plan)
```

This loop is the concrete mechanism behind "dynamic replanning," named earlier as the fix for a plan going stale mid-execution (e.g. a step's result revealing the original plan's assumption was wrong): step 6 is where the executor checks whether the ORIGINAL plan is still valid given what was just discovered, and if not, loops back to generate a new (or patched) plan rather than blindly continuing down a plan that's already known to be wrong. This is also exactly the difference from a chain: a chain has no step 6 — it has no mechanism to notice its own plan is broken and adjust, because there was never a "plan" as a first-class, revisable object to begin with; there was only fixed code.

**The stopping condition — how the executor decides "done," and why this needs an explicit answer, not vibes:** an agent that never definitively knows when to stop will either quit too early (goal not actually met) or loop forever (burning tool calls/tokens with no termination). Concrete stopping mechanisms actually used in production: (a) the LLM itself explicitly states the goal is complete in its own output (parsed the same way a `tool_use` block is parsed — structured text, checked by your code); (b) a hard iteration cap as a backstop (Week 3 Day 3's `maxIterations` pattern, reused unchanged — independent of the model's own judgment, so a model that never says "done" can't loop forever); (c) all planned subtasks report success and none triggered a replan. Production agents typically use ALL three together: the LLM's own "done" signal as the primary path, the iteration cap as a safety net that fires regardless of what the model claims, and the plan's own completion state as a structural check.

---

## ⑥ Summary — the four pillars, what each answers, and how they compose

| Pillar | Question it answers | Built from |
|---|---|---|
| Tools (Action) | How does the agent actually DO anything in the world? | Week 3's `ToolRegistry` + request→execute→inject loop, unchanged |
| Planning | How does one large goal become an ordered set of concrete, executable subtasks? | An LLM call producing structured text (a plan), parsed and executed by your code — same "model reasons in text, code acts on it" pattern as tool_use, applied to a whole task |
| Memory | What does the agent still know, across many iterations or many separate sessions, without blowing the context window or drowning in irrelevant history? | Week 4's embed → store → retrieve mechanism, reused: short-term = in-context window; long-term (episodic/semantic) = summarized entries in a vector store, retrieved by relevance per step |
| Executor | What runs the loop, iteration after iteration, deciding whether to keep going, replan, or stop? | The runtime loop wrapping the other three: pull subtask → retrieve memory → call LLM/tool → store outcome → check plan validity → repeat or stop |

- **The core distinction of the whole day:** a chain's control flow is fixed in your code; an agent's control flow is decided, iteration by iteration, by the LLM's own reasoning — the four pillars are what has to exist around the LLM to make that safe and effective rather than chaotic.
- Nothing here is a brand-new mechanism — tools are Week 3 unchanged, memory is Week 4's retrieval mechanism repointed at the agent's own history, and planning/execution are the same "LLM outputs structured text, your code parses and acts on it" pattern used throughout this entire curriculum, now applied at the scope of an entire multi-step goal instead of one function call.
- Real products differ mainly in how much of each pillar they expose/automate: Cursor's planning is largely implicit in how it breaks down a coding task; Claude Code's memory is mostly session-scoped (plus the project's own file-based memory system) rather than a vector store; Perplexity leans heavily on the tools pillar (search) with comparatively thin planning. Mapping a real product to these four pillars is the fastest way to understand its actual architecture rather than treating "it's an AI agent" as an opaque label.
