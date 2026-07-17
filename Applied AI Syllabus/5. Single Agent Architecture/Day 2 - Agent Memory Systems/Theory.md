# Day 2 — Agent Memory Systems

## ⓪ Where we left off, and the actual problem today solves

Day 1 named "memory" as one of the four pillars and sketched why it's needed: an agent runs far more iterations than a Week 3 tool loop, possibly across separate sessions entirely, and two problems show up that a short loop never hit — the context window has a hard token limit (established back in Week 1 Day 4/Week 4 Day 1), so an ever-growing history of past actions eventually won't fit; and even below that limit, cramming in every past action/result as raw text dilutes the model's attention on what's actually relevant right now (the exact same "too much irrelevant context hurts more than helps" problem RAG solved for documents in Week 4, now showing up for the agent's OWN history of what it did).

Today's actual question: given that problem, what precisely do you build, and how does it plug into the executor loop from Day 1 so the agent behaves coherently across many steps and even across entirely different sessions, instead of "forgetting" things a working system needs to remember? By the end of today you'll also see, concretely with real prompt text, what makes an agent's step-by-step operation genuinely different from "one big structured prompt" — the gap flagged at the end of Day 1's Recap.

---

## ① The four types of memory — what each one actually stores, and why four, not one

It would be simpler if there were just one "memory" — but four distinct things get called "memory" in agent systems because they solve four genuinely different problems, and conflating them causes real bugs (e.g. storing durable facts the same way you store one-off conversation turns, so a chatty session drowns out a fact that should last forever).

### In-context (short-term) memory

This is just the current conversation's message history, sitting directly in the prompt — exactly like every single example since Week 1. When you call `messages.create()` with an array of `{role, content}` messages, that whole array IS this memory type; nothing new is being invented here, just naming what you've already been doing.

**What it's good for:** immediate continuity — "what did the user just say two messages ago" — zero extra infrastructure, zero latency cost beyond the tokens themselves.

**What it can't do:** persist after the session ends (once the process exits or the conversation array is discarded, it's gone), and it's bounded by the context window — you cannot keep appending forever.

**The practical technique — sliding window:** rather than letting the message array grow unboundedly until it blows the token limit, you keep only the last N messages (or the last N tokens' worth), dropping the oldest ones as new ones arrive. Concretely:

```js
function slidingWindow(messages, maxMessages = 20) {
  return messages.length > maxMessages
    ? messages.slice(-maxMessages)  // keep only the most recent N
    : messages;
}
```

This is the "short-term" half of the showcase task's `AgentMemory` system — nothing more exotic than an array slice.

### External (vector) memory

This is Week 4's exact mechanism — `embed(text)` → store the vector → later, `embed(query)` → cosine similarity against every stored vector → keep the topK closest — reused, but pointed at something different: instead of embedding your DOCUMENTS, you embed the AGENT'S OWN past actions and observations (e.g. "called `searchWeb('competitor pricing')`, got back: [result text]"). Every step the agent takes can be stored as a small text entry, embedded, and added to this store.

**Why this solves the "too much history" problem:** at each new step, instead of stuffing the ENTIRE past history into the prompt (which is exactly the problem of raw history text diluting the model's attention on what's actually relevant right now), you `embed()` the CURRENT step's situation/subtask and retrieve only the topK most relevant past entries — the same "find the few relevant pieces out of thousands" job RAG does for documents, just done against the agent's own history. Most of the agent's history lives OUTSIDE the context window, sitting in this store, and only the relevant slice gets pulled back in per step.

**Mechanically, nothing new to learn here** — same `embed`, same `cosineSimilarity`, same `store.map().sort().slice()` pattern from Week 4 Day 1's `example.js`. The only thing that changed is WHAT gets embedded (the agent's own history, not external docs) and WHEN it gets written (every step, not once upfront).

### Episodic memory

A **specific kind of entry** stored in that same external/vector store, distinguished by WHAT it records: a summary of one complete past SESSION or episode — "on 2026-07-10, this agent tried to book a flight for user X, failed because the card was expired, informed the user." It is not a separate storage mechanism; it is the vector store from the previous section, with entries tagged by session ID/timestamp and containing session-level summaries rather than single-step logs.

**What it's for specifically:** letting an agent avoid repeating a mistake or re-doing work from an entirely separate, earlier run. Without this, every new session starts from zero knowledge of what happened last time, even for the exact same user/task.

**Concrete retrieval example:** a new session starts with "book a flight for user X" — before acting, the agent's memory-retrieval step embeds this new task and searches the episodic store; it retrieves last Tuesday's episode entry about the expired card, and that context gets folded into the current session's prompt, so the agent can proactively check the card status before repeating the same failure.

### Semantic memory

Also stored in the same vector store mechanically, but distinguished by being a **standing FACT**, not tied to any one episode — "this user's timezone is IST," "this user prefers metric units," "this user's account tier is Plan A." These don't expire when a session ends and aren't about "what happened" — they're just true, ongoing things worth remembering regardless of which session is running.

**Why this needs its own category, not just "another episodic entry":** an episodic entry describes a bounded past EVENT; a semantic entry describes a fact that's still true NOW and will keep being retrieved as relevant across many future, unrelated sessions. Mixing them naively (storing "user's timezone is IST" with the same shape as "session on 2026-07-10 failed because of X") makes it harder to reason about which entries should ever be considered "stale" (episodic entries age; a semantic fact usually doesn't, until explicitly updated).

---

## ② Why episodic/semantic memory needs summarization before storing, not raw storage

If you stored every raw action+observation from every past session verbatim into the vector store, two problems compound: the store grows enormous fast, and — more importantly — most of that raw content is noise for future retrieval purposes (intermediate tool-call chatter, retries, formatting back-and-forth), which reproduces Week 4 Day 1's exact "near-duplicate flooding" trap: irrelevant/repetitive entries can crowd out the few genuinely useful ones when a future query's topK search runs.

**The fix, mechanically — auto-summarization:** at the end of a session (or after a meaningful chunk of work), run one additional LLM call whose only job is to condense what happened into a short, information-dense summary:

```
Prompt: "Here is the full raw transcript of everything this agent did this
session: [raw log]. Write a 2-3 sentence summary capturing: what was
attempted, the outcome, and anything a future session should know before
attempting something similar."

Model's output: "Attempted to book a flight for user X on 2026-07-10.
Failed — payment card on file was expired. User was informed and asked
to update payment info. Do not retry booking until card status is confirmed."
```

This summary — not the raw transcript — is what gets `embed()`ed and stored as the episodic entry. Future retrieval pulls back this concise, already-distilled memory instead of a firehose of raw logs, exactly matching the showcase task's explicit "long-term: vector store with auto-summarization" requirement.

---

## ③ A full worked trace — where an agent genuinely diverges from "one structured prompt"

Day 1's Recap flagged this gap explicitly: every individual call still looks like "structured prompt in, structured text out," same as Week 1-3. What actually makes a multi-step agent different is that **later prompts are built using the REAL output of earlier calls**, not fixed in advance — so let's trace one real example end to end, with actual prompt text, to make that concrete.

**Goal:** "Find out if user X's account has any pending issues, and if so, follow up appropriately."

```
STEP 1 — Retrieve memory BEFORE acting
    Your code: embed("user X pending issues") → search episodic + semantic store
    Retrieved: "User X's account tier is Plan A." (semantic)
               "On 2026-07-10, booking failed — expired card, user notified." (episodic)

STEP 2 — Build the ACTUAL prompt sent to the model (note: this exact text
    did not exist before Step 1 ran — it was built FROM Step 1's real output)
    ┌─────────────────────────────────────────────────────────┐
    │ "Goal: check user X's account for pending issues and     │
    │ follow up appropriately.                                  │
    │                                                            │
    │ Relevant memory:                                          │
    │ - User X's account tier is Plan A.                        │
    │ - On 2026-07-10, a booking failed due to an expired card, │
    │   user was notified.                                      │
    │                                                            │
    │ Available tools: getAccountStatus(userId), sendMessage    │
    │ (userId, text)                                            │
    │                                                            │
    │ Decide your next action."                                 │
    └─────────────────────────────────────────────────────────┘

STEP 3 — Model responds with a tool_use block (Week 3's exact mechanism):
    { type: "tool_use", name: "getAccountStatus", input: { userId: "X" } }

STEP 4 — Your code executes the REAL function. Suppose it returns:
    { cardStatus: "still expired", pendingBooking: true }

STEP 5 — Build the NEXT prompt — again, only possible now, using Step 4's
    real result (nobody could have written this text in advance, since it
    depends on the actual API response):
    ┌─────────────────────────────────────────────────────────┐
    │ "...tool_result: { cardStatus: 'still expired',           │
    │ pendingBooking: true }. Given this, decide your next      │
    │ action."                                                  │
    └─────────────────────────────────────────────────────────┘

STEP 6 — Model responds with ANOTHER tool_use block:
    { type: "tool_use", name: "sendMessage",
      input: { userId: "X", text: "Your card is still expired — please update it to complete your pending booking." } }

STEP 7 — Executed. Model is asked again; this time it states the goal is
    complete (Day 1's stopping-condition mechanism: the LLM itself explicitly
    states in its own output that the goal is complete, parsed by your code
    the same way a tool_use block is). Loop stops.

STEP 8 — Session ends. Auto-summarize (condense the session's raw transcript
    into a short 2-3 sentence summary via one extra LLM call, per the
    summarization-before-storing fix above), store as a new episodic
    entry for next time.
```

**The actual point of this trace:** every single arrow above IS a structured prompt → structured response, no different in KIND from Week 1's basic API call. What makes the WHOLE thing an agent rather than one very elaborate structured prompt is that Step 5's prompt could only be written after Step 4's real tool result existed, and Step 4 could only happen after Step 3's real model decision existed — the sequence of prompts isn't a template filled in once, it's generated live, one at a time, each depending on the actual (not assumed) outcome of the one before. A single giant structured prompt, however well-designed, cannot do this — it has to commit to its entire content before any real-world result comes back.

---

## ④ Real-world tie-in — Claude Code's "Dreaming" (2026, research preview)

Anthropic shipped a feature in Claude Code called **Dreaming**: offline (not during an active task), the agent reviews transcripts from its own PAST sessions and writes learned playbooks/heuristics back to a memory file — patterns like "this kind of build error is usually fixed by X" get distilled from having seen it happen before and saved for future sessions to draw on.

Mechanically, map this directly onto what you just learned: this is **episodic memory (records of specific past sessions/outcomes) being consolidated into semantic memory (a standing, reusable heuristic) via an auto-summarization step (condensing a raw transcript into a short summary via one extra LLM call before storing)**, run offline instead of at the end of each session, and written to a plain file rather than a vector database. Nothing here is a new mechanism beyond today's content — it's a shipped, product-level automation of exactly the "summarize episodes into durable, retrievable knowledge" pipeline this day just built by hand.

---

## ⑤ Framework equivalent — what you just built by hand vs. LangChain/LangGraph

Everything in today's `example.js` — the sliding window, the vector-store retrieve, the auto-summarization, and the `runExecutorLoop` tool-call loop — maps directly onto pre-built LangChain/LangGraph classes (`ConversationBufferWindowMemory`, `VectorStoreRetrieverMemory`, `ConversationSummaryMemory`, and LangGraph's prebuilt ReAct agent respectively). None of them add a new capability beyond what you just wrote; they're the same mechanism with the boilerplate pre-written. Full function-by-function mapping table: see `Applied AI Syllabus.md`'s Jargon Decoder, "Wk5 D2 function-level mapping."

---

## ⑥ Summary

| Memory type | What it stores | Persists across sessions? | Storage mechanism |
|---|---|---|---|
| In-context (short-term) | The current conversation's message history | No — gone when session ends | The messages array itself; sliding window keeps it bounded |
| External / vector | Any past step's action+observation | Depends on setup — usually yes | Week 4's embed → store → cosine similarity → topK, reused |
| Episodic | Summaries of specific past sessions/outcomes | Yes | Same vector store, entries tagged by session/timestamp |
| Semantic | Durable standing facts, not tied to one episode | Yes | Same vector store, entries with no "episode" framing |

- Four types exist because they solve four different problems (immediate continuity vs. bounded relevant recall vs. avoiding repeated mistakes vs. remembering durable facts) — mixing them naively causes real bugs.
- Only ONE new mechanism was introduced today (auto-summarization before storing); everything else reuses Week 4's embed/store/retrieve pipeline and Week 1-3's basic prompt/response pattern, repointed at the agent's own history instead of external documents.
- The step-by-step tool-call trace worked through earlier is the actual answer to "how is an agent different from one structured prompt": it isn't a different KIND of call, it's that later calls' content depends on real, not-yet-known-in-advance results from earlier calls — a sequence generated live, not a template filled in once.
- Claude Code's Dreaming = episodic-to-semantic consolidation via auto-summarization, run offline — a shipped example of the summarization-before-storing fix and the episodic/semantic memory-type split, not a new concept.
