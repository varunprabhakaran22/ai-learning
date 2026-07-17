# Day 2 Recap — Agent Memory Systems

## The four memory types
Four distinct things get called "memory," each solving a different problem — conflating them causes real bugs (e.g. a chatty session's turns drowning out a durable fact).
- **In-context (short-term):** the current message array itself. Zero infra, but gone at session end and bounded by the context window. Kept bounded with a sliding window (`slice(-maxN)`).
- **External (vector) memory:** Week 4's exact embed → store → cosine similarity → topK mechanism, repointed at the agent's OWN past actions/observations instead of external documents. Solves "too much history" the same way RAG solves "too many documents" — only the relevant slice gets pulled into the prompt per step, the rest lives outside the context window.
- **Episodic memory:** not a separate storage mechanism — the same vector store, with entries that are summaries of one whole past SESSION, tagged by session/timestamp. Exists so an agent doesn't repeat a mistake or redo work from an earlier, separate run.
- **Semantic memory:** same vector store again, but a durable standing FACT not tied to any one episode (e.g. "user's tier is Plan A"). Needs its own category because episodic entries age/expire in relevance while semantic facts don't, until explicitly updated.

## Why episodic/semantic entries get summarized before storing
Storing raw transcripts verbatim reproduces Week 4 Day 1's "near-duplicate flooding" trap — noise (retries, tool chatter) crowds out the few useful entries at retrieval time. Fix: one extra LLM call at session end condenses the transcript into a 2-3 sentence summary (what was attempted, outcome, what a future session should know) — only that summary gets embedded and stored, never the raw log.

**From our discussion:** this doesn't fully resolve the "what do I store" decision — the summarization prompt is your real lever for controlling what's kept, not a per-fact manual choice. And a real vector DB doesn't store `{text, vector, type}` as one flat object the way `example.js` does for simplicity — it splits into the vector (indexed, searched) and a metadata payload (`text`, `type`, `sessionId`, `timestamp`, returned but not searched). `text`/`type` are this example's own field names, not a standard.

## The session-boundary trigger problem
`commitSessionToLongTerm` never detects "session ended" on its own — `example.js` sidesteps this by calling it explicitly with an already-assembled transcript. In a real app, something in the app's control flow (a closed tab, an inactivity timeout, or the executor loop's own done-signal) has to call it at the actual boundary — it's an application-level event, not something memory infers by itself.

**From our discussion:** this is genuinely unsolved for a "session = until I clear my terminal" workflow — there's no hook available at that moment to trigger a save, since clearing a terminal doesn't invoke any of your code. The alternative that sidesteps the problem entirely: write memory incrementally, when something save-worthy happens, instead of batching everything into one end-of-session summarize call (this is how Claude Code's own persistent memory system behaves — proactive, not end-of-session-triggered).

## The full worked trace (the step-by-step example showing later prompts get built from earlier calls' real, just-returned output, not fixed in advance) — now runnable in `example.js`
The trace's Steps 1-2 (retrieve memory → fold it into the actual prompt text) were originally only shown in Theory.md as static text; `example.js` didn't yet do this. Fixed by adding `buildPromptWithMemory` + `askClaudeWithMemory`, which format retrieved entries into the same "Relevant memory: ..." block the trace shows and actually call `messages.create()` with it.

**From our discussion:** the deeper point of the trace is still that later prompts can only be built from EARLIER calls' real, not-yet-known-in-advance output — never a template filled in once. That's the actual answer to "what makes an agent different from one structured prompt."

## The executor loop — how "done" actually gets decided
Added `runExecutorLoop` to `example.js`: a `for` loop that keeps calling the model with an accumulating `history` (including each step's real tool result) until the model's own reply signals it's finished, or `maxIterations` is hit. There's no separate "are we done" check outside the model's own reply — the model re-decides this fresh every iteration, and "loop again" is just the default (the loop keeps going because nothing has said stop yet).

**From our discussion — a real bug, not just an explanation gap:** the first version conflated "no `tool_use` block this turn" with "goal is done" (`if (!toolUse) return finalText`). Those are different facts — a model can reply with plain text because it's thinking out loud, asking a clarifying question, or reporting progress, with NO intent to stop. Three fixes, increasing robustness: (1) require an explicit `DONE:` text marker and only stop on that, treating any other no-tool-call reply as "continue, prompt it to keep going"; (2) give the model a dedicated `markComplete()` tool and treat that specific call as the stop signal, not the absence of any tool call; (3) a separate judge model that checks completion independently every turn, regardless of what the acting model just did — the robust version, matching Day 3's `/goal` real-world tie-in (decoupling actor from stopping-condition judge). The minimal fix (1) has NOT yet been applied to `example.js` — still pending.

Other legitimate no-tool-call cases that must NOT terminate the loop: asking the user a clarifying question (needs a human-in-the-loop pause, Week 5 Day 4), deliberate plan-then-act turns (a "thinking" turn followed by an "acting" turn), and a genuine failure report (which should exit the loop too, but as a distinct failure state — not silently treated the same as success).

## Claude Code's "Dreaming" (real-world tie-in)
Episodic memory (past-session records) consolidated into semantic memory (a standing, reusable heuristic) via auto-summarization — run offline instead of per-session, written to a file instead of a vector DB. Not a new mechanism, a shipped automation of the episodic-summaries-vs-durable-standing-facts split (episodic = summaries of specific past sessions, semantic = durable facts not tied to any one session).

## Framework equivalent
Everything built by hand today maps directly onto pre-built LangChain/LangGraph classes: sliding window → `ConversationBufferWindowMemory`; vector retrieve → `VectorStoreRetrieverMemory`; auto-summarization → `ConversationSummaryMemory`; the `runExecutorLoop` tool-call loop → LangGraph's prebuilt ReAct agent (`createReactAgent`). None of these add a new capability — same mechanism, pre-written boilerplate. Full function-level table lives in `Applied AI Syllabus.md`'s Jargon Decoder ("Wk5 D2 function-level mapping"); episodic-vs-semantic is the one split with no direct LangChain built-in (closer to LangGraph's `Store` API or MemGPT/Letta's archival-vs-core split).

## Still need to cover / do
- Read Lessons.md Parts A/B ("agent memory systems design", "episodic memory for AI agents") — not yet read.
- Run Lessons.md Part C's experiment: same task with no memory vs. in-context-only vs. retrieved memory, compare coherence.
- Apply the minimal `DONE:`-marker fix to `runExecutorLoop` in `example.js` (bug identified above, not yet patched).
- Single Agent Architecture Day 3 — Planning & Task Decomposition — next up.
