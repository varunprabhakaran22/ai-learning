🍊 Claude Cowork Program (15 Days)

Source: `Claude Cowork Program - Curriculum.pdf` — 6 Chapters · 15 Projects · 15 Modules · 15 Days

Format note: the source PDF is a 6-chapter, project-based curriculum with an explicit 15-day total and 15 projects — a clean 1-project-per-day cadence. This document keeps the PDF's exact chapters, topics, and projects, sequenced into 15 days — no topics added, none dropped. Depth is not determined by the PDF — the PDF only supplies the topic list; actual depth per topic is decided when each day's content is written, per `ML/CLAUDE.md`'s shared bar.

Workflow note: the day-by-day breakdown below is the topic roadmap only (scope, sequencing, projects) — a skeleton for planning, not the actual lesson. `Theory.md` gets written first per day, then read and questioned, then revised based on what the doubt reveals, before moving to `Recap.md` and the next day — per `ML/CLAUDE.md`.

Note on scope: unlike the other 5 syllabi in `ML/`, this one is not primarily an engineering track — it's "using Claude as a work tool" (skills, connectors, dashboards, automation). Per earlier discussion, this is a different job-function skill (AI power-user/automation) than AI/ML engineering, kept here because it was one of the 6 source PDFs, not because it's core to the AI/ML engineering goal.

**Freshness note  :** Cowork-adjacent features ship at a fast, roughly monthly cadence (Routines, Managed Agents, Dynamic Workflows, Effort Control, Dreaming, Outcomes, etc. all landed within a few months of each other in 2026). Feature names, commands, and surface-availability referenced below are current as of the last edit to this file — verify against `docs.claude.com` and `support.claude.com` before teaching any given day, since a name or mechanism may have shifted.

**Prerequisites / orientation  :** Before Day 1, the learner should know that Claude currently ships across three main surfaces, each with its own automation vocabulary:
- **claude.ai (chat)** — conversational surface; automation here is via **Routines** (cloud-based) and the **Effort Control** setting.
- **Claude Code** — developer/terminal surface; automation here is via **`/loop`**, **`/goal`**, **Subagents**, and **Dynamic Workflows**.
- **Cowork** — the desktop agentic work surface this program is centered on; automation here is via **Desktop Tasks**, **Skills**, **Connectors/Plugins**, and **Managed Agents**.

These three are related but distinct products — a rule of thumb from the community: *"Routines runs in the cloud, `/loop` runs locally in one session, Desktop Tasks lives on your machine. Pick based on where the work has to happen."* This program teaches the Cowork column, with brief callouts where a concept has a sibling in the other two surfaces (useful for recognizing the same underlying idea elsewhere).

---

## Foundation & Real-Work Delivery
*Covers: Cowork Interface, Mindset, Basics*

**Day 1 — Cowork Interface & Operator Mindset**
Topics: Cowork Interface, Operator Mindset, **Effort Control  ** — the model-selector-adjacent setting that lets you choose how much effort Claude spends on a response; worth introducing on Day 1 since it's a basic, always-visible interface control, not an advanced feature.
Project: Cowork Setup.

**Day 2 — The Brief Framework & Producing Deliverables**
Topics: The Brief Framework, Producing Deliverables.
Project: Brief-to-Deliverable Workflow.

**Day 3 — First Polished Deliverable**
Project: First Polished Deliverable.

---

## Skills Deep Dive
*Covers: Skills, Built-in Skills, Creating Skills*

**Day 4 — What Skills Are & Built-in Skills Tour**
Topics: What Skills Are, Built-in Skills Tour.
Project: Single-Skill Workflow.

**Day 5 — Chaining Skills & How to Create a Skill**
Topics: Chaining Skills, How to Create a Skill.
Project: Multi-Skill Chain.

---

## Connectors & Plugins
*Covers: MCP, Connectors, Plugins*

**Day 6 — What MCP Is & Connector Setup**
Topics: What MCP Is, Connector Setup, **Claude in Chrome as a connected tool  ** — the browsing agent that Cowork can call on; introduce here alongside generic connector setup since it's a first-party "connector-like" tool rather than a third-party MCP app.
Project: Cross-App Workflow.

**Day 7 — What Plugins Are & Build a Plugin**
Topics: What Plugins Are, Build a Plugin.
Project: Custom Plugin from Scratch.

---

## Systems & Automation
*Covers: Scheduled Tasks, System Architecture, Context Optimization*

**Day 8 — Systems Mental Model & Trigger to Delivery**
Topics: Systems Mental Model, Trigger to Delivery, **Dynamic Workflows  ** — multi-agent orchestration for tasks too large for a single pass; fits naturally into "System Architecture" as the mechanism for scaling a trigger-to-delivery system beyond one agent. **Managed Agents  ** — always-on agents you describe in plain English that get their own private cloud workspace to read files, run commands, and browse the web; the natural "bigger system" concept to introduce once the trigger-to-delivery mental model is in place.
Project: End-to-End Workflow System.

**Day 9 — Scheduled Tasks & Daily Briefs**
Topics: Scheduled Tasks, Daily Briefs & Digests, **Routines — local vs. cloud  ** — Anthropic's more formal automation feature name; clarify the distinction between local routines (run only while your machine is awake, suited to file/tool access on your laptop) and cloud routines (run on Anthropic's servers regardless of device state, suited to overnight/away-from-desk work).
Project: Daily Briefing Automation.

**Day 10 — Context Optimization**
Topics: Context Optimization, **Task budgets  ** — an advisory token budget for a full agentic loop (thinking, tool calls, tool results, output); the model sees a running countdown and uses it to prioritize work and finish gracefully as the budget is consumed. Directly relevant to a cost-optimised pipeline.
Project: Cost-Optimised Pipeline.

---

## Memory, Dashboards & Design
*Covers: Personal Knowledge System, Claude Design Labs, Artifacts*

**Day 11 — Personal Knowledge System & Interactive Artifacts**
Topics: Personal Knowledge System, Interactive Artifacts, **Dreaming  ** — a scheduled process that reviews past agent sessions and memory stores, extracts patterns, and curates memories so future sessions improve over time; this is the concrete, named feature behind what "Personal Knowledge System" is describing, so teach them together.
Project: AI Second Brain.

**Day 12 — Live Dashboards**
Topics: Live Dashboards, **Claude in Excel as a connected tool  ** — the spreadsheet agent Cowork can call on when a dashboard needs to read from or write to a live spreadsheet.
Project: Live Tracker Dashboard.

**Day 13 — Presentations from Scratch**
Topics: Presentations from Scratch, **Claude in PowerPoint as a connected tool  **, **Outcomes  ** — a quality-enforcement feature where you define a success rubric and a separate grading pass checks output before delivery; Anthropic's internal benchmarks showed measurable quality gains on Word and PowerPoint output specifically, making this a direct fit for a presentations-focused day.
Project: Presentation & Portfolio Pack.

---

## Build Your Own & Capstone
*Covers: Custom Skills, Plugin Builder, Capstone*

**Day 14 — Custom Workflow Design & Personal Plugin Pack**
Topics: Custom Workflow Design, Personal Plugin Pack, Reusable Workflow Library, **`/loop` and `/goal` as a conceptual model  ** — these are Claude Code-native commands, not literal Cowork features, but the underlying idea (define a checkable success condition, keep iterating until a separate evaluator confirms it's met, rather than a fixed number of passes) is exactly the design principle behind a durable, reusable workflow. Teach as a transferable concept with a note on which surface it literally lives in.
Project: Personal Skill & Plugin Library.

**Day 15 — Capstone Project Design & Build**
Topics: Capstone Project Design.
Project: Capstone Project.

---

## Status

Only this roadmap is written so far. Per-day `Theory.md` / `Recap.md` / `example.py` files get authored one at a time, interactively, following the shared workflow in `ML/CLAUDE.md`.

**Also missing from this file (flagged, not yet resolved — added):**
1. **Glossary / "what you should already know" section** — the file uses terms like MCP, Skills, Connectors from first mention with no definitions upfront; a short glossary before Day 1 would remove the assumption of prior familiarity.
2. **Assessment / checkpoint structure** — 15 days and 15 projects are specified, but there's no stated rubric, self-check questions, or pass/fail criteria beyond "the project got built." Worth deciding whether this program wants a formal checkpoint per day or per chapter.
3. **Surface-disambiguation reminders at point of use** — beyond the prerequisites section above, individual days that introduce a Cowork feature with a same-named-but-different sibling elsewhere (e.g., Routines vs. `/loop` vs. Desktop Tasks) may need an inline one-line reminder of which surface is being taught, to avoid learners assuming a Cowork feature works identically in Claude Code or vice versa.