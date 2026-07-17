# ML — Project Guide (shared across all PDF-derived syllabi)

This folder holds every syllabus derived from the batch of curriculum PDFs you were sent (Terminologies Mastery, Core NLP Program, Agentic AI GenAI Program, Claude Cowork Program, Cloud Deployment, N8N Program), each as its own subfolder. **This single `CLAUDE.md` governs all of them** — there is deliberately no per-subfolder `CLAUDE.md`, because the learning workflow itself keeps evolving as you work through lessons, and an evolving rulebook needs exactly one home so it can't drift out of sync across six copies. **Update this file directly whenever the workflow reveals something worth doing differently** — it's a living document, not a fixed spec.

**Relationship to `Applied AI Syllabus/`:** a separate, hand-built JS/TS AI-engineering track (LLMs, agents, RAG, MCP, evals), not PDF-derived, lives outside `ML/`. Its `RAG & Knowledge Systems/Day 1 - Embeddings & Vector Search/Theory.md` and `Recap.md` are the confirmed-good reference quality bar every file in `ML/` matches — re-read them whenever calibration is in doubt. Its `Day 3 - Advanced Retrieval Strategies/Theory.md` is an equally good, differently-shaped second reference (see "Structure," below).

**Each subfolder's `Syllabus.md` is the file to open when starting or resuming a day** — the source PDF only mattered once, to derive `Syllabus.md`'s initial topic list and day count. Once `Syllabus.md` exists it's the source of truth for sequencing; there's no need to go back to the PDF. Neither the PDF nor `Syllabus.md` decide depth — that's decided by us, per day, per the objective below.

**The PDF-derived topic list is a floor, not a fixed boundary — `Syllabus.md` can be edited.** The original rule ("no topics added beyond what a PDF listed, none dropped") undersold this: if a genuine gap surfaces against the objective below (clearing AI/ML engineering interviews, being job-ready), propose adding it, explain why the PDF's list falls short without it, and add it to `Syllabus.md` **after the user approves** — same low-bar-to-propose, confirm-before-writing pattern as everything else here. `Terminologies Mastery/Python Programming` (2026-07-13) is the first precedent: gap-checked against "what does a working Python developer need," added a Day 0 (runtime-model foundation, not one of the PDF's terms) plus four days beyond the PDF's original 10 (type hints, testing, iterators/context managers + lint tooling, asyncio) — each logged inline in that `Syllabus.md` with the date and reason. Only decided track-by-track as the user reaches it, not pre-emptively across every subfolder.

**Day 0 pattern:** when a subfolder's Day 1 has real prerequisite mental model that isn't itself one of the PDF's terms — a runtime/execution model, an environment/tooling setup, a foundational contrast with something the user already knows (e.g. compiled-vs-interpreted, sync-vs-async) — it belongs in a **Day 0**, not folded into or skipped before Day 1. Day 0 gets the same `Theory.md`/doubt-loop/`Recap.md` treatment as any other day; it's exempted only from being one of the PDF's counted terms.

## The objective: clear AI/ML engineering interviews, not completeness

Not "understand everything about a topic," not "finish the PDF." **"One level deeper than the surface answer" is a floor, not a ceiling.** A mock interview (`Applied AI Syllabus/`, 2026-07-08) showed the actual failure mode this guards against: answers that got the right *behavior/direction* but stopped before the *mechanism* and before *concrete specifics* — not "temperature=0 is deterministic" but why it can still vary (greedy decoding + floating-point non-associativity in batched GPU execution); not "structured output enforces JSON" but how (constrained decoding masks invalid tokens at the sampling layer); not "tool descriptions matter" but the named failure class when they don't (SSRF). **Self-check for every `Theory.md`:** if this concept were probed one level deeper in an interview, is that next-level answer already written down here?

That floor applies to every concept, but the **core mechanism of the day's topic** goes as deep as the real thing requires — however many layers that takes (RAG & Knowledge Systems Day 1 doesn't stop at "cosine similarity measures closeness," it derives the formula, then HNSW's graph structure, then the greedy-walk algorithm, then why that makes results approximate). What actually gets bounded is *peripheral/tangential* material — related techniques, alternatives, adjacent variants — which get named and explained to a basic working level, then explicitly deferred to whichever day owns their full depth (e.g. "this is exactly what Day 3 covers in full; here it's enough to know X"). The reader should always know whether a gap is "not relevant here" or "deliberately deferred to Day N" — never left to guess.

**The real governor of all this is the day's time-box: roughly 1-2 hours of reading/working.** When core-mechanism depth plus the deferral discipline above still can't fit a topic into that window, say so explicitly and propose splitting the day in two — don't silently compress the mechanism or silently blow the time-box.

## Structure: derived from the topic, not a fixed template

There's no single mandatory shape. RAG & Knowledge Systems Day 1's ⓪①②③④⑤ build-up (problem first → simplest possible core idea → layer in the real mechanism one dependency at a time → named trap/gotcha section → compressed summary) is one example that worked well. Day 3 (Advanced Retrieval Strategies) is an equally good, differently-shaped example — a compare-and-contrast across several named techniques instead of one chain. Pick whichever shape the topic actually calls for: one core mechanism wants the ⓪-⑤ chain; several named alternatives to tell apart want compare-and-contrast; a decision problem wants a decision-tree shape.

Regardless of shape, every `Theory.md` needs: a problem-first opening (state why this matters before naming jargon), ground-up sequencing (nothing used before it's defined, in that same file — no "if you're familiar with X," no assumed skips), explicit formulas/mechanisms rather than named-but-unexplained concepts, at least one concrete worked example per major idea, named failure modes, and a compressed summary at the end. Carrying forward a concept already built in an **earlier day of the same subfolder** is fine; never assume knowledge from a different subfolder.

## Completeness: expose everything in the first draft, or it's gone

This is the rule the whole workflow depends on. **The doubt-and-revise loop can only fix things that are present but unclear — it cannot surface something the draft never mentioned at all.** You can only doubt what's on the page in front of you. If a first draft omits a definition, mechanism, or architectural piece the topic genuinely involves, there's no later point where that gap gets caught — it's silently gone, unless it happens to resurface by accident later.

So before calling any first draft done: does this topic have any definition, named technique, or mechanism this draft doesn't expose anywhere, even briefly? If so, it goes in now — "they can ask about it" is not a valid reason to omit something in scope, because omission removes the only chance to catch it. (This is a stricter, first-draft-specific version of the "no forward-referencing a term to a later day" rule that already governs explaining terms once they're introduced.)

## Workflow

Content is **not** pre-written for multiple days at once, in any subfolder. Per day:

1. Write `Theory.md`, per the structure and completeness rules above.
2. You read it and raise doubts — possibly walking through an example or diagram live.
3. **Rewrite `Theory.md`** to close the gap — fold the clarification into the flow (re-sequencing if needed), don't just append a correction at the bottom.
4. Repeat 2-3 until satisfied.
5. `Recap.md` gets written — **by you, in your own words**: key facts, any place your prior assumption was wrong (flag it explicitly, e.g. "critical: X is NOT Y" — this is how real misconceptions get caught), and a short "still need to cover" list. Not a re-summary of Theory.md written by me.
6. Move to the next day.

This loop itself is expected to change — if a better way to explain a doubt or write a recap turns up in practice, update this file to match.

## File contract per day

- `Theory.md` — per Structure/Completeness above. Lead with an ASCII flow diagram before prose whenever explaining a multi-step process (a training loop, an agent's request/response cycle, a deployment pipeline).
- `Recap.md` — per step 5 of the Workflow above.
- `example.py` (or the relevant language/tool — shell/YAML for `Cloud Deployment/`, JSON workflow exports for `N8N Program/`) — small, runs within the day's time-box, not production-grade. Must have its own ASCII flow diagram (what calls what, in what order, what data passes between steps) inside `Theory.md`, not just a prose walkthrough.
- `playground.py` — **`Python Programming/` track only, for now.** Comments-only task list (no solution code), one task per rule/concept covered that day, written so the user fills in and runs it themselves for hands-on practice separate from the already-solved `example.py`. Created alongside `example.py` each day. Not yet extended to Machine Learning/Deep Learning/NLP tracks or other subfolders — revisit if it proves useful beyond Python Programming.
- `Lessons.md` — only if the day references a specific external paper/article/video/experiment. Name the source at the top of each section. No source, no experiment → it's core theory, belongs in `Theory.md` instead.

**Code style:** AI/ML-flavored toy examples (text/number crunching, small classification/regression on tiny datasets) — never generic app-building. Use the standard stack per domain: NumPy/Pandas/Matplotlib/Seaborn/Scikit-learn (ML), PyTorch or Keras — pick one, stay consistent within a subfolder (DL), NLTK/spaCy (classical NLP), Hugging Face/LangChain/agent frameworks (Core NLP Program's later chapters, Agentic AI GenAI Program), Docker/cloud CLI (Cloud Deployment), n8n workflow JSON (N8N Program).

**Dual syntax in `Theory.md` code examples (2026-07-13):** where a concept has both a classic/verbose form and a more modern/idiomatic form, AND real ML/AI code actually uses the modern form (comprehensions vs. manual loops, f-strings vs. `.format()`/`%`-formatting, `.get(key, default)` vs. try/except `KeyError`, tuple/dict unpacking vs. manual indexing, context managers (`with`) vs. manual try/finally, etc.) — show both, labeled, so the reader recognizes either form when reading real packages. **Don't force this where there's no real "old way" in practice** (e.g. `list.append` has no alternate form worth showing) — apply it only where the dual form genuinely appears in ML/AI code in the wild, not as a blanket rule for every example.

**Every syntax variant used in a playground task must appear in `Theory.md` first — a prose explanation in chat is not a substitute (2026-07-14):** surfaced on Day 2 (Python Programming), Task 12 — Theory.md's `set` section (⑤) only showed the set-*literal* form (`{"a", "b"}`), but the playground task required converting an existing list into a set via the `set(existing_list)` *constructor* form, which was never shown anywhere in Theory.md. The user had to ask mid-task where the syntax was. When a playground task exercises a syntax form (a constructor call, an alternate method, a specific built-in), that exact form must already be written into `Theory.md` — chat can clarify/reinforce it, but cannot be the only place it's introduced, same principle as the existing "completeness in the first draft" rule above, just caught at the playground-authoring stage instead of the Theory.md-authoring stage. Before finalizing a day's `playground.py`, cross-check every syntax form each task requires against `Theory.md` and add any that are missing.

**No bare cross-reference pointers — inline the actual point (2026-07-16).** A file's own `## ① ...`/`## ② ...` numbered section headers, and its own end-of-file "Summary — ⓪ through ⑤" recap block, are structural and stay as-is. But never use a numbered section as a stand-in for its content when referencing it elsewhere — same-file ("(② above)") or cross-day ("Day 1 fact ②", "Day 8 ①") — because the reader can't mentally resolve dozens of these pointers back to what they meant. Write the actual fact inline, in one short clause, at the point of reference (e.g. "a 1D array (Day 8's `np.array`, which supports elementwise vectorized math with no loop needed)" instead of "a 1D array (Day 8, ①)"), so each file reads standalone.

## Subfolders

Each subfolder's `Syllabus.md` sits directly at its root (no intermediate `Syllabus/` folder) and is the ONE overall file for everything inside that subfolder — it does not get split per track.

**Within a subfolder that bundles multiple distinct tracks** (e.g. `Terminologies Mastery/` = Python Programming, Machine Learning, Deep Learning, NLP), day-folders nest inside a per-track subfolder, not flattened at the subfolder root — e.g. `Terminologies Mastery/Python Programming/Day 0 - Runtime Model/Theory.md`, `Terminologies Mastery/Python Programming/Day 1 - Variables & Data Types/Theory.md`, and later `Terminologies Mastery/Machine Learning/Day 1 - .../Theory.md`. `Syllabus.md` still stays singular at the `Terminologies Mastery/` root, covering all tracks — only the day-folders get segregated by track, so files stay browsable by context (all of Python together, all of ML together) instead of 30+ day-folders interleaved at one level. Create each track subfolder the first time that track's Day 0/Day 1 is actually written, not pre-emptively.

| Subfolder | Derived from (source PDF) | Status |
|---|---|---|
| `Terminologies Mastery/` | `02.Terminologies Mastery.pdf` | Roadmap written; per-day content not started |
| `Core NLP Program/` | `03_Core_NLP_Program_Curriculum.pdf` | Roadmap only |
| `Agentic AI GenAI Program/` | `Agentic-AI-GenAI-Program-Curriculum.pdf` | Roadmap only |
| `Claude Cowork Program/` | `Claude Cowork Program - Curriculum.pdf` | Roadmap only |
| `Cloud Deployment/` | `Cloud_Deployment_Curriculum.pdf` | Roadmap only |
| `N8N Program/` | `L1_N8N_Curriculum.pdf` + `L2_N8N_Curriculum.pdf` | Roadmap only |
