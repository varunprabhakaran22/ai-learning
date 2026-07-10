# ML — Project Guide (shared across all PDF-derived syllabi)

This folder holds every syllabus derived from the batch of curriculum PDFs you were sent (Terminologies Mastery, Core NLP Program, Agentic AI GenAI Program, Claude Cowork Program, Cloud Deployment, N8N Program), each as its own subfolder. **This single `CLAUDE.md` governs all of them** — there is deliberately no per-subfolder `CLAUDE.md`, because the learning workflow itself keeps evolving as you work through lessons, and an evolving rulebook needs exactly one home so it can't drift out of sync across six copies. **Update this file directly whenever the workflow reveals something worth doing differently** — it's a living document, not a fixed spec.

**Relationship to `Applied AI Syllabus/`:** a separate, hand-built JS/TS AI-engineering track (LLMs, agents, RAG, MCP, evals), not PDF-derived, lives outside `ML/`. Its `RAG & Knowledge Systems/Day 1 - Embeddings & Vector Search/Theory.md` and `Recap.md` are the confirmed-good reference quality bar every file in `ML/` matches — re-read them whenever calibration is in doubt. Its `Day 3 - Advanced Retrieval Strategies/Theory.md` is an equally good, differently-shaped second reference (see "Structure," below).

**Each subfolder's `Syllabus.md` is the file to open when starting or resuming a day** — the source PDF only mattered once, to derive `Syllabus.md`'s topic list and day count (no topics added beyond what a PDF listed, none dropped). Once `Syllabus.md` exists it's the source of truth for sequencing; there's no need to go back to the PDF. Neither the PDF nor `Syllabus.md` decide depth — that's decided by us, per day, per the objective below.

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
- `Lessons.md` — only if the day references a specific external paper/article/video/experiment. Name the source at the top of each section. No source, no experiment → it's core theory, belongs in `Theory.md` instead.

**Code style:** AI/ML-flavored toy examples (text/number crunching, small classification/regression on tiny datasets) — never generic app-building. Use the standard stack per domain: NumPy/Pandas/Matplotlib/Seaborn/Scikit-learn (ML), PyTorch or Keras — pick one, stay consistent within a subfolder (DL), NLTK/spaCy (classical NLP), Hugging Face/LangChain/agent frameworks (Core NLP Program's later chapters, Agentic AI GenAI Program), Docker/cloud CLI (Cloud Deployment), n8n workflow JSON (N8N Program).

## Subfolders

Each subfolder's `Syllabus.md` sits directly at its root (no intermediate `Syllabus/` folder). Per-day `Theory.md`/`Recap.md`/`example.*` files go directly inside that subfolder (e.g. `Terminologies Mastery/Day 1/Theory.md`) as each day is actually reached.

| Subfolder | Derived from (source PDF) | Status |
|---|---|---|
| `Terminologies Mastery/` | `02.Terminologies Mastery.pdf` | Roadmap written; per-day content not started |
| `Core NLP Program/` | `03_Core_NLP_Program_Curriculum.pdf` | Roadmap only |
| `Agentic AI GenAI Program/` | `Agentic-AI-GenAI-Program-Curriculum.pdf` | Roadmap only |
| `Claude Cowork Program/` | `Claude Cowork Program - Curriculum.pdf` | Roadmap only |
| `Cloud Deployment/` | `Cloud_Deployment_Curriculum.pdf` | Roadmap only |
| `N8N Program/` | `L1_N8N_Curriculum.pdf` + `L2_N8N_Curriculum.pdf` | Roadmap only |
