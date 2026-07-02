# 🧠 AI Engineer Syllabus 2026
### Frontend → AI Engineer | 12 Weeks | 1hr/day | 5 days/week
> Weeks 1–10 = core AI Engineer skillset. Weeks 11–12 = real-world gaps (multimodal, computer use, ecosystem breadth, security) — don't skip these, they're what separates a portfolio from a hireable one.

> Every session ends with a **showcase task** — something you can push to GitHub, post on LinkedIn, or demo to a recruiter.

---

## 🔍 Jargon Decoder — "Trending term" → Where it's actually taught here

> Philosophy of this syllabus: **build the primitive by hand before you reach for the framework that hides it.**
> The buzzwords below aren't a separate curriculum — they're labels sitting on top of what you're already scheduled to build. By the time you're done, you'll understand these tools from the inside instead of just knowing their API.

| Trending Term | What it actually means | Where it's covered here |
|---|---|---|
| **GenAI (Generative AI)** | Umbrella term for any AI that generates content (text, code, images) rather than just classifying data | The entire syllabus — this is the whole field |
| **Agentic AI** | LLM systems that plan, use tools, take multi-step actions, and pursue a goal with some autonomy (not just single-turn chat) | **Phase 3, Weeks 5–7** — Agent Architecture, Memory, Planning, Multi-Agent Orchestration |
| **LangChain** | A framework that wraps common LLM patterns (prompt templates, chains, memory, tool use) into pre-built abstractions | You build its internals by hand: `PromptBuilder` (Wk2 D1), `AgentMemory` (Wk5 D2), `ToolRegistry` (Wk3 D1), `Orchestrator` (Wk6 D2) |
| **LangGraph** | LangChain's graph-based orchestration layer — nodes, edges, conditional routing, cycles for agent workflows | **Week 7, Day 4** — explicit build + comparison task |
| **LangSmith** | Tracing, evaluation, and regression-testing tool for LLM apps in production | **Week 2 Day 3** (prompt testing), **Week 8** (Eval Framework, Regression Runner, Observability) |
| **RAG (Retrieval-Augmented Generation)** | Making an LLM answer using YOUR documents instead of only its training data | **Week 4**, entirely |
| **MCP (Model Context Protocol)** | The emerging standard for connecting LLMs to external tools/data sources | **Week 3, Day 4** — you build your own MCP server |
| **Fine-tuning** | Retraining a model's weights on your own data (vs. prompting or RAG) | **Week 9, Day 3** — decision framework: when to prompt vs RAG vs fine-tune |
| **AI Orchestration / Multi-Agent Systems** | Multiple specialized agents coordinating on a task via a supervisor/orchestrator | **Week 6**, entirely |
| **Guardrails** | Input/output safety filters — prompt injection detection, PII filtering, content policy | **Week 8, Day 3** |
| **Observability (for AI)** | Logging traces, tokens, latency, and quality signals for production AI systems | **Week 8, Day 4** |
| **Multimodal AI** | A model that can process/generate more than text — images, audio, video | **Week 11**, entirely |
| **Computer Use** | An agent pattern where the model sees a screenshot and outputs clicks/keystrokes to control a real computer/browser | **Week 11, Day 4** |
| **CrewAI / OpenAI Agents SDK / Vercel AI SDK** | Alternative agent-building frameworks to LangChain/LangGraph, each with different philosophies | **Week 12, Day 3** |
| **Ollama / Hugging Face / llama.cpp** | Tools for running open-source LLMs locally instead of calling a hosted API | **Week 12, Day 2** |
| **SSRF (Server-Side Request Forgery)** | A security flaw where a tool call can be tricked into hitting an internal/unintended URL | **Week 12, Day 5** |
| **OWASP Top 10 for LLMs** | A standard checklist of the most common security risks specific to LLM applications | **Week 12, Day 5** |

**Rule of thumb:** if you hear a new trending term mid-syllabus and can't find it above, it's almost certainly a rebrand or a specific product implementation of a concept you're already scheduled to learn — ask me and I'll map it in.

### Embedded jargon (smaller terms buried inside daily tasks)

**Core LLM mechanics**
| Term | Meaning | Where |
|---|---|---|
| Token / tokenizer / tiktoken | The chunks (sub-words) an LLM actually reads/counts; tiktoken is OpenAI's tokenizer library | Wk1 D1, D4 |
| Context window | Max tokens a model can "see" at once (input + output) | Wk1 D1, D4 |
| Temperature / Top-P | Sampling knobs controlling randomness of output | Wk1 D3 |
| Sliding window | Technique to keep only the most recent N messages when trimming context | Wk1 D4, D5 |
| Extended thinking / reasoning models | Models (o3, Claude with extended thinking) that "think" step-by-step before answering — slower, costlier, more accurate on hard problems | Wk2 D4 |

**Prompting techniques**
| Term | Meaning | Where |
|---|---|---|
| Zero-shot / Few-shot | Giving the model no examples vs. a few examples in the prompt | Wk2 D1 |
| Chain-of-Thought (CoT) | Prompting the model to reason step-by-step before giving a final answer | Wk2 D1 |
| JSON mode / structured output | Forcing the model's output into a strict schema (e.g. via Zod) | Wk2 D2 |
| Zod | A TypeScript schema-validation library, commonly used to enforce LLM JSON output shape | Wk2 D2 |

**Tool use & agents**
| Term | Meaning | Where |
|---|---|---|
| Function calling / Tool use | The model outputs a structured "call this function" intent, your code executes it, result goes back to the model | Wk3 D1 |
| ReAct pattern | "Reason + Act" loop — model thinks, takes an action (tool call), observes result, repeats | Wk3 D3 |
| Task decomposition / Tree-of-Thoughts | Breaking one big goal into ordered subtasks, sometimes exploring multiple reasoning branches | Wk5 D3 |
| Human-in-the-loop | Pausing an agent to get human approval before risky/irreversible actions | Wk5 D4 |
| Orchestrator-worker / Supervisor pattern | One "manager" agent routes tasks to specialist "worker" agents | Wk6 D1–D2 |
| AutoGen | Microsoft's multi-agent framework — a named alternative/competitor to LangGraph | Wk6 D1 (comparison only, not built) |

**Retrieval / RAG**
| Term | Meaning | Where |
|---|---|---|
| Embeddings | Numeric vector representation of text used for semantic similarity search | Wk4 D1 |
| Vector database (Chroma/Qdrant/Pinecone) | A database optimized for storing/searching embeddings | Wk4 D1 |
| Chunking | Splitting documents into smaller pieces before embedding | Wk4 D2 |
| Hybrid search / BM25 | Combining keyword search (BM25 = a classic keyword-ranking algorithm) with semantic search | Wk4 D3 |
| Re-ranking | A second pass that reorders retrieved chunks by relevance before sending to the model | Wk4 D3 |
| HyDE | "Hypothetical Document Embeddings" — generating a fake ideal answer first, then searching using that, to improve retrieval | Wk4 D3 |
| RAGAS / faithfulness / groundedness | A framework + metrics for scoring whether a RAG answer is actually supported by retrieved context | Wk4 D4 |

**Reliability & ops**
| Term | Meaning | Where |
|---|---|---|
| LLM-as-judge | Using one LLM to grade another LLM's output against a rubric | Wk8 D1 |
| Golden dataset | A fixed, trusted set of test cases used to catch regressions | Wk8 D2 |
| Prompt injection | An attack where malicious text tricks the model into ignoring its instructions | Wk8 D3 |
| Circuit breaker / exponential backoff | Reliability patterns: stop calling a failing service temporarily; retry with increasing delays | Wk7 D2 |
| Model tiering / semantic caching | Using cheaper models for easy tasks; caching answers to semantically similar repeated queries | Wk7 D3 |
| Traces / spans | Observability terms — a "trace" is one full request's journey, a "span" is one step within it | Wk8 D4 |
| SSE / WebSockets / Streaming | Techniques for sending model output to the user token-by-token instead of all at once | Wk9 D2 |

---

## 📍 PHASE 1 — LLM Behavior Control (Weeks 1–2)
> **Goal:** Treat LLMs as programmable system components, not chat tools.

---

### WEEK 1 — How LLMs Work + API Mastery

**Week Goal:** Build the mental model + your first reusable AI utility library

---

#### Day 1 — LLM as a Probabilistic System
- **Theory:** Token prediction, stateless calls, context window = working memory
- **Read:** Jay Alammar's Illustrated Transformer (skim), Anthropic docs on context
- **Experiment:** Same prompt at temp 0 vs temp 1.0 — observe consistency vs drift
- **🏗️ Showcase Task:** Build `callLLM(prompt, temperature, systemPrompt)` wrapper
  - Returns `{ response, tokenCount, latencyMs }`
  - Logs every call with timestamp
  - Push to GitHub: `ai-engineer-toolkit` repo — this is your running portfolio repo

---

#### Day 2 — System Prompts & Persona Engineering
- **Theory:** System prompt = contract with the model. It sets behavior, constraints, output format
- **Read:** Anthropic system prompt docs, OpenAI best practices for system prompts
- **Experiment:** Same user message, 3 different system prompts → observe output personality, format, refusal behavior
- **🏗️ Showcase Task:** Build a `PersonaEngine` class
  - Takes a persona config object `{ role, constraints, outputFormat, tone }`
  - Generates a system prompt dynamically
  - Test with 3 personas: strict JSON API, friendly assistant, expert analyst
  - Add to `ai-engineer-toolkit` repo

---

#### Day 3 — Temperature, Top-P, and Parameter Control
- **Theory:** What each parameter actually does to output distribution. When to use deterministic vs creative settings
- **Read:** `"LLM sampling parameters explained"`, Anthropic API parameter docs
- **Experiment:** Build a 3x3 grid — 3 prompts × 3 temperature settings. Document output patterns
- **🏗️ Showcase Task:** Build a `ParameterPreset` config system
  - Presets: `factual`, `creative`, `structured`, `conversational`
  - Each preset has justified parameter values with comments explaining WHY
  - Export as reusable config — add to toolkit repo

---

#### Day 4 — Token Economics & Context Management
- **Theory:** Tokens = money + latency. Context window limits = system design constraints. How to count, budget, and truncate
- **Read:** Tokenizer docs (tiktoken / Anthropic tokenizer), `"context window management strategies"`
- **Experiment:** Take a 10,000 word document. Feed progressively larger chunks. Find where quality degrades
- **🏗️ Showcase Task:** Build a `ContextManager` utility
  - Accepts messages array + max token budget
  - Trims oldest messages to fit budget (sliding window)
  - Logs token usage per call
  - Add to toolkit repo

---

#### Day 5 — Week 1 Integration Project
- **Theory:** Review — stateless calls, system prompts, parameters, token management
- **🏗️ Showcase Task:** **"Smart CLI Assistant"**
  - A terminal tool that takes any question
  - Automatically selects parameter preset based on question type (detected via simple classification)
  - Maintains a sliding window conversation history
  - Shows token count + cost estimate per session
  - **README with architecture diagram**
  - This is your **first portfolio piece** — clean code, good README, deployed demo

---

### WEEK 2 — Prompt Engineering as a Systems Discipline

**Week Goal:** Write prompts that are reliable, testable, and version-controlled

---

#### Day 1 — Prompt Structure & Chain of Thought
- **Theory:** Zero-shot vs few-shot vs chain-of-thought. Why structure improves reliability not just quality
- **Read:** `"chain of thought prompting paper"`, Anthropic prompt engineering guide
- **Experiment:** Math/logic problem — zero-shot vs CoT vs few-shot CoT. Measure accuracy across 10 runs
- **🏗️ Showcase Task:** Build a `PromptBuilder` class
  - Methods: `.addContext()`, `.addExamples()`, `.addChainOfThought()`, `.addOutputFormat()`
  - Generates final prompt string
  - Add to toolkit repo

---

#### Day 2 — Output Formatting & Structured Outputs
- **Theory:** Why JSON outputs, XML tags, and structured formats make LLMs system-compatible. How to enforce structure reliably
- **Read:** Anthropic structured output docs, `"JSON mode LLM reliability"`
- **Experiment:** Ask for JSON output 20 times with no enforcement vs with explicit schema instruction. Count parse failures
- **🏗️ Showcase Task:** Build a `StructuredOutputParser`
  - Takes a Zod/JSON schema + LLM response
  - Validates, retries on failure (up to 3x with error feedback to model)
  - Returns typed, validated object
  - Add to toolkit repo

---

#### Day 3 — Prompt Versioning & Testing
- **Theory:** Prompts are code. They need version control, regression testing, and changelogs
- **Read:** `"prompt versioning best practices"`, LangSmith / Braintrust intro
- **Experiment:** Make 3 versions of the same prompt. Define 5 test cases. Score each version
- **🏗️ Showcase Task:** Build a `PromptTestRunner`
  - Loads prompt versions from JSON files
  - Runs test cases against each version
  - Outputs a comparison table: version × test case × pass/fail
  - **This is your first eval system** — critical for portfolio

---

#### Day 4 — Reasoning Models & When to Use Them
- **Theory:** How extended thinking / reasoning models (Claude Opus 4, o3) differ architecturally. Cost/latency tradeoffs. When NOT to use them
- **Read:** Anthropic extended thinking docs, `"reasoning models vs standard LLMs when to use"`
- **Experiment:** Same 5 complex tasks on standard vs reasoning model. Compare: accuracy, latency, token cost
- **🏗️ Showcase Task:** Build a `ModelRouter`
  - Classifies incoming task as: simple/complex/creative/analytical
  - Routes to appropriate model + parameter preset automatically
  - Logs routing decisions with reasoning
  - Add to toolkit repo

---

#### Day 5 — Week 2 Integration Project
- **🏗️ Showcase Task:** **"Prompt Engineering Dashboard"**
  - A small web UI (use your frontend skills!)
  - Input a prompt, select a model, see structured output
  - Shows: token count, latency, cost estimate, parse success/fail
  - Version your prompts in a sidebar
  - **This is a real tool AI teams actually want** — deploy it, screenshot it, post on LinkedIn

---

## 📍 PHASE 2 — Tools, MCP & Knowledge Systems (Weeks 3–4)
> **Goal:** Connect LLMs to the real world via tools and knowledge bases

---

### WEEK 3 — Tool Use & Function Calling

**Week Goal:** Build LLMs that can act, not just respond

---

#### Day 1 — Function Calling Fundamentals
- **Theory:** How tool use works under the hood — model outputs structured intent, your code executes, result fed back. The loop architecture
- **Read:** Anthropic tool use docs, `"function calling LLM architecture"`
- **Experiment:** Give a model 3 tools. Ask questions that require 0, 1, or 2 tool calls. Observe decision-making
- **🏗️ Showcase Task:** Build a `ToolRegistry` class
  - Register tools with name, description, input schema
  - Handles tool call → execution → result injection loop
  - Add to toolkit repo

---

#### Day 2 — Building Real Tools
- **Theory:** Tool design principles — single responsibility, clear descriptions, safe failure modes
- **Read:** `"LLM tool design best practices"`, Anthropic tool description guidelines
- **Experiment:** Write the same tool with vague vs precise descriptions. Observe how often model calls it correctly
- **🏗️ Showcase Task:** Build a 5-tool mini toolkit:
  - `searchWeb(query)` — real search via Brave/Serper API
  - `readFile(path)` — reads local file content
  - `writeFile(path, content)` — writes output
  - `fetchURL(url)` — fetches webpage text
  - `getCurrentDate()` — returns date/time
  - Wire them all into your ToolRegistry

---

#### Day 3 — Multi-Step Tool Chains
- **Theory:** Agentic loops — plan → tool call → observe → plan again. How to detect completion vs infinite loops
- **Read:** `"ReAct pattern LLM agents"`, `"agentic loop design"`
- **Experiment:** Give a task requiring 3+ sequential tool calls. Observe planning quality. Introduce a tool failure — see how model recovers
- **🏗️ Showcase Task:** Build a `ReActLoop` executor
  - Runs think → act → observe → repeat
  - Max iteration limit with graceful exit
  - Full execution trace logged
  - Add to toolkit repo

---

#### Day 4 — MCP (Model Context Protocol)
- **Theory:** What MCP is, why it became the standard, how it differs from raw function calling. Server vs client architecture
- **Read:** Anthropic MCP docs, `"MCP protocol explained"`, MCP GitHub repo
- **Experiment:** Connect to an existing MCP server (filesystem or fetch). Run 5 tasks through it
- **🏗️ Showcase Task:** **Build your own MCP server**
  - Expose 3 tools via MCP protocol
  - Connect it to Claude via MCP client
  - Document it properly
  - **This alone is a strong portfolio piece** — very few people have built custom MCP servers

---

#### Day 5 — Week 3 Integration Project
- **🏗️ Showcase Task:** **"Personal Research Agent"**
  - Takes a research question
  - Searches the web, reads pages, synthesizes answer
  - Cites sources with URLs
  - Saves output as markdown report
  - Uses your MCP server + ReAct loop
  - **Deployable, demonstrable, shareable**

---

### WEEK 4 — RAG & Knowledge Systems

**Week Goal:** Build systems where LLMs answer from YOUR data, not just training

---

#### Day 1 — Embeddings & Vector Search
- **Theory:** What embeddings are, why semantic search beats keyword search, how vector databases work
- **Read:** `"text embeddings explained visually"`, Pinecone/Chroma/Qdrant intro docs
- **Experiment:** Embed 100 sentences. Query with related/unrelated phrases. Visualize similarity scores
- **🏗️ Showcase Task:** Build an `EmbeddingSearch` utility
  - Embeds a list of documents
  - Stores in local vector DB (Chroma or Qdrant local)
  - Returns top-K most relevant chunks for a query
  - Add to toolkit repo

---

#### Day 2 — RAG Pipeline Architecture
- **Theory:** Full RAG flow — chunking → embedding → retrieval → augmentation → generation. Where each step can fail
- **Read:** `"RAG pipeline production best practices"`, `"chunking strategies for RAG"`
- **Experiment:** Same question answered with: no context, bad chunks, good chunks. Document quality difference
- **🏗️ Showcase Task:** Build a `RAGPipeline` class
  - Ingest documents → chunk → embed → store
  - Query → retrieve → inject into prompt → generate
  - Configurable chunk size and overlap
  - Add to toolkit repo

---

#### Day 3 — Advanced Retrieval Strategies
- **Theory:** Hybrid search (semantic + keyword), re-ranking, parent-child chunking, HyDE (hypothetical document embeddings)
- **Read:** `"advanced RAG techniques 2025"`, `"re-ranking in RAG pipelines"`
- **Experiment:** Compare basic RAG vs hybrid search vs re-ranked results on 20 queries. Score relevance
- **🏗️ Showcase Task:** Upgrade your RAGPipeline
  - Add hybrid search (BM25 + semantic)
  - Add a re-ranker step
  - Benchmark: basic vs advanced — show improvement in a table

---

#### Day 4 — RAG Evaluation
- **Theory:** How to measure RAG quality — faithfulness, relevance, groundedness. RAGAS framework
- **Read:** RAGAS docs, `"RAG evaluation metrics explained"`
- **Experiment:** Run your RAG pipeline on 10 Q&A pairs. Score with RAGAS metrics
- **🏗️ Showcase Task:** Build a `RAGEvaluator`
  - Runs test Q&A pairs through your pipeline
  - Scores: faithfulness, answer relevance, context recall
  - Outputs evaluation report as JSON + readable summary

---

#### Day 5 — Week 4 Integration Project
- **🏗️ Showcase Task:** **"Document Intelligence App"**
  - Upload any PDF/document set
  - Ask questions in natural language
  - Get cited, grounded answers
  - Shows retrieved chunks used
  - Displays faithfulness score
  - **Full frontend UI** — use your React skills here
  - Deploy on Vercel — **this is your strongest portfolio piece so far**

---

## 📍 PHASE 3 — Agent Design & Orchestration (Weeks 5–7)
> **Goal:** Build systems where multiple AI components work together autonomously

---

### WEEK 5 — Single Agent Architecture

**Week Goal:** Build a production-quality autonomous agent from scratch

---

#### Day 1 — Agent Architecture Patterns
- **Theory:** What makes something an "agent" vs a chain. Planning, memory, tools, action — the four pillars
- **Read:** `"LLM agent architecture patterns"`, Anthropic agent design docs
- **Experiment:** Map out 3 real products (Cursor, Perplexity, Claude Code) — identify their agent architecture
- **🏗️ Showcase Task:** Draw + document your agent architecture blueprint
  - System diagram showing: planner, memory, tools, executor
  - Written explanation of each component's role
  - Post as a LinkedIn article — **thought leadership content**

---

#### Day 2 — Agent Memory Systems
- **Theory:** 4 types of memory — in-context, external (vector), episodic (past sessions), semantic (facts). When to use each
- **Read:** `"agent memory systems design"`, `"episodic memory for AI agents"`
- **Experiment:** Run the same agent task with no memory vs in-context history vs retrieved memory. Compare coherence
- **🏗️ Showcase Task:** Build an `AgentMemory` system
  - Short-term: sliding window in context
  - Long-term: vector store with auto-summarization
  - Retrieves relevant past context on new sessions
  - Add to toolkit repo

---

#### Day 3 — Planning & Task Decomposition
- **Theory:** How agents break complex goals into subtasks. Tree-of-thought vs linear planning. When planning fails
- **Read:** `"task decomposition LLM agents"`, `"tree of thoughts paper"`
- **Experiment:** Give agent a complex 5-step task. Compare: no planning vs explicit plan-first vs dynamic replanning
- **🏗️ Showcase Task:** Build a `TaskPlanner`
  - Takes a high-level goal
  - Generates subtask list with dependencies
  - Executes subtasks in order, handles failures
  - Add to toolkit repo

---

#### Day 4 — Human-in-the-Loop Patterns
- **Theory:** When agents must pause for human approval. Confidence thresholds, irreversible actions, cost gates
- **Read:** `"human in the loop AI agent design"`, `"AI agent safety patterns"`
- **Experiment:** Build a gate that triggers human approval when agent confidence is low or action is destructive
- **🏗️ Showcase Task:** Add a `HumanGate` to your agent
  - Defines: always-ask actions, never-ask actions, threshold-based actions
  - Pauses execution, waits for approval
  - Logs all human interventions

---

#### Day 5 — Week 5 Integration Project
- **🏗️ Showcase Task:** **"Autonomous Task Agent"**
  - Takes a goal in natural language
  - Plans, executes, uses tools, remembers context
  - Asks for human approval on sensitive actions
  - Produces a full execution log
  - Clean terminal UI or simple web interface
  - **Document architecture decisions in README**

---

### WEEK 6 — Multi-Agent Orchestration

**Week Goal:** Coordinate multiple specialized agents working together

---

#### Day 1 — Multi-Agent Patterns
- **Theory:** Orchestrator-worker, peer-to-peer, supervisor patterns. When multi-agent beats single agent. Communication protocols between agents
- **Read:** `"multi-agent LLM orchestration patterns"`, `"AutoGen vs LangGraph architecture"`
- **Experiment:** Same task: single large agent vs orchestrator + 2 specialists. Compare output quality and reliability
- **🏗️ Showcase Task:** Document a multi-agent system design
  - Architect a 3-agent system for a real use case (e.g. research + write + review)
  - Sequence diagram of agent communication
  - Post as technical blog or GitHub doc

---

#### Day 2 — Orchestrator Design
- **Theory:** The orchestrator's job — task routing, result aggregation, conflict resolution, failure handling
- **Read:** `"LLM orchestrator design patterns"`, `"agent coordination strategies"`
- **Experiment:** Build a simple orchestrator. Intentionally make a worker fail. Observe recovery behavior
- **🏗️ Showcase Task:** Build an `Orchestrator` class
  - Registers worker agents with capability descriptions
  - Routes subtasks to appropriate agent
  - Aggregates results into coherent output
  - Add to toolkit repo

---

#### Day 3 — Specialized Agent Design
- **Theory:** How to design focused agents — narrow prompts, constrained tools, clear success criteria
- **Read:** `"specialist agent design"`, `"agent prompt engineering for reliability"`
- **Experiment:** Build a generalist agent vs specialist agent for the same task. Measure: accuracy, token use, failure rate
- **🏗️ Showcase Task:** Build 3 specialist agents:
  - `ResearchAgent` — web search + summarization
  - `WriterAgent` — structured content generation
  - `ReviewerAgent` — fact checking + improvement suggestions
  - Wire them to your Orchestrator

---

#### Day 4 — Inter-Agent Communication & State
- **Theory:** How agents share state, pass results, avoid conflicts. Shared memory vs message passing
- **Read:** `"agent state management"`, `"multi-agent shared context patterns"`
- **Experiment:** Run 2 agents on overlapping tasks. Observe conflicts. Design a resolution strategy
- **🏗️ Showcase Task:** Build a `SharedAgentState` store
  - Agents can read/write to shared state
  - Version-controlled updates (no silent overwrites)
  - Conflict detection with resolution strategy

---

#### Day 5 — Week 6 Integration Project
- **🏗️ Showcase Task:** **"Multi-Agent Content Pipeline"**
  - Input: a topic
  - Agent 1: researches and finds sources
  - Agent 2: writes a structured article
  - Agent 3: fact-checks and improves
  - Orchestrator: coordinates, handles failures
  - Output: polished article with citations
  - **This is production-grade AI pipeline** — strong portfolio piece

---

### WEEK 7 — Advanced Orchestration Patterns

**Week Goal:** Handle real-world complexity — failures, parallelism, cost control

---

#### Day 1 — Parallel Agent Execution
- **Theory:** When to run agents in parallel vs series. Race conditions, result merging, timeout handling
- **Read:** `"parallel LLM calls optimization"`, `"async agent execution patterns"`
- **Experiment:** Run 3 research agents in parallel vs series. Measure: total latency, quality, cost
- **🏗️ Showcase Task:** Add parallel execution to your Orchestrator
  - Identifies parallelizable subtasks
  - Runs them concurrently with Promise.all
  - Merges results intelligently

---

#### Day 2 — Failure Handling & Recovery
- **Theory:** Every agent system fails. Retry strategies, fallback agents, graceful degradation, circuit breakers
- **Read:** `"LLM agent failure modes"`, `"resilient AI system design"`
- **Experiment:** Deliberately break tools, introduce bad outputs, simulate API timeouts. Test recovery
- **🏗️ Showcase Task:** Build a `ResilienceLayer`
  - Retry with exponential backoff
  - Fallback to simpler model on failure
  - Circuit breaker for repeated failures
  - Full failure log with root cause

---

#### Day 3 — Cost & Latency Optimization
- **Theory:** Token budgets per agent, model tiering (use cheap model for simple tasks), caching repeated calls
- **Read:** `"LLM cost optimization strategies"`, `"semantic caching AI systems"`
- **Experiment:** Profile your multi-agent pipeline — find the most expensive calls. Optimize with caching + model tiering
- **🏗️ Showcase Task:** Build a `CostOptimizer`
  - Semantic cache for repeated similar queries
  - Model tier selector based on task complexity
  - Cost report per pipeline run: before/after optimization

---

#### Day 4 — LangGraph / Workflow Orchestration
- **Theory:** How graph-based orchestration (LangGraph) works. Nodes, edges, conditional routing, cycles
- **Read:** LangGraph docs, `"LangGraph vs custom orchestration"`
- **Experiment:** Rebuild one of your agent pipelines in LangGraph. Compare code complexity and control
- **🏗️ Showcase Task:** Rebuild your Content Pipeline in LangGraph
  - Show the graph visualization
  - Add conditional branches (e.g. if research fails, try different approach)
  - Compare with your custom implementation — write a short comparison

---

#### Day 5 — Week 7 Integration Project
- **🏗️ Showcase Task:** **"Resilient Research & Report System"**
  - Multi-agent pipeline with parallel execution
  - Full failure recovery and cost optimization
  - LangGraph orchestration
  - Cost + latency dashboard
  - **This is the kind of system senior AI engineers build** — document it thoroughly

---

## 📍 PHASE 4 — Evals & Reliability Engineering (Week 8)
> **Goal:** Build AI systems you can trust, test, and improve systematically

---

### WEEK 8 — Evaluation Systems

**Week Goal:** Build the eval infrastructure that makes AI systems production-safe

---

#### Day 1 — Eval Design Fundamentals
- **Theory:** Why evals are harder than unit tests. Dimensions: correctness, faithfulness, safety, usefulness. LLM-as-judge pattern
- **Read:** `"LLM evaluation design"`, Anthropic evals docs, HELM benchmark overview
- **Experiment:** Design 10 test cases for your RAG system. Manually score them. Now use LLM-as-judge. Compare scores
- **🏗️ Showcase Task:** Build an `EvalFramework`
  - Define test cases as JSON: `{ input, expectedOutput, criteria }`
  - LLM-as-judge scoring with rubric
  - Outputs: per-test scores + overall pass rate

---

#### Day 2 — Regression Testing for Prompts
- **Theory:** How prompt changes can silently break behavior. Regression suites, golden datasets, diff reports
- **Read:** `"prompt regression testing"`, `"LLM CI/CD pipeline"`
- **Experiment:** Change a prompt slightly. Run regression suite. Find what broke
- **🏗️ Showcase Task:** Build a `PromptRegressionRunner`
  - Stores golden test results
  - On prompt change, runs full suite
  - Highlights regressions with diff view
  - Add to toolkit repo

---

#### Day 3 — Safety & Guardrails
- **Theory:** Input/output guardrails, content classification, prompt injection detection, PII handling
- **Read:** `"LLM guardrails production"`, `"prompt injection attacks and defenses"`
- **Experiment:** Attempt 10 prompt injection attacks on your agent. Observe success rate. Add guardrails. Retest
- **🏗️ Showcase Task:** Build a `GuardrailLayer`
  - Input classification: safe/unsafe/injection attempt
  - Output filtering: PII detection, content policy
  - Logs all guardrail triggers
  - Add to toolkit repo

---

#### Day 4 — Observability & Monitoring
- **Theory:** What to log in production AI systems. Traces, spans, token metrics, quality signals
- **Read:** `"LLM observability"`, LangSmith tracing docs, `"AI system monitoring"`
- **Experiment:** Add full tracing to your multi-agent pipeline. Find a performance bottleneck using traces
- **🏗️ Showcase Task:** Add observability to your toolkit
  - Every LLM call logged: input, output, tokens, latency, model, cost
  - Agent traces with step-by-step breakdown
  - Simple dashboard showing system health

---

#### Day 5 — Week 8 Integration Project
- **🏗️ Showcase Task:** **"Production-Ready AI System Audit"**
  - Take your best project so far (Document Intelligence or Content Pipeline)
  - Add: full eval suite, regression tests, guardrails, observability
  - Write a "production readiness report" — what passes, what needs work
  - **This demonstrates senior engineering thinking** — most AI engineers skip this entirely

---

## 📍 PHASE 5 — Production AI Systems (Weeks 9–10)
> **Goal:** Design, deploy, and architect AI systems at scale

---

### WEEK 9 — Production System Design

**Week Goal:** Think like an AI systems architect, not just an implementer

---

#### Day 1 — AI System Architecture Patterns
- **Theory:** Common production architectures — synchronous API, async queue-based, streaming, event-driven. When to use each
- **Read:** `"production AI system architecture"`, `"AI system design patterns 2025"`
- **Experiment:** Map your existing projects to these patterns. Identify architectural weaknesses
- **🏗️ Showcase Task:** Redesign your best project with production architecture
  - Architecture diagram (use Excalidraw or similar)
  - Justify every design decision
  - Identify: single points of failure, scalability limits, cost risks

---

#### Day 2 — Streaming & Real-Time AI
- **Theory:** Streaming responses, chunked processing, real-time agent feedback, SSE/WebSockets with LLMs
- **Read:** Anthropic streaming docs, `"streaming LLM responses frontend"`
- **Experiment:** Implement streaming on a slow agent. Measure perceived latency improvement
- **🏗️ Showcase Task:** Add streaming to your Document Intelligence App
  - Stream answer token by token
  - Show retrieval step progress in real time
  - Noticeably better UX — **record a demo video**

---

#### Day 3 — Fine-tuning vs RAG vs Prompting Decision Framework
- **Theory:** When to prompt, when to RAG, when to fine-tune. Cost/benefit/complexity tradeoffs for each
- **Read:** `"fine tuning vs RAG decision framework"`, `"when to fine tune LLM"`
- **Experiment:** Take a domain-specific task. Solve with: prompting only, RAG, simulated fine-tune behavior. Compare
- **🏗️ Showcase Task:** Write a **decision framework document**
  - Flowchart: given a use case, which approach to choose?
  - Real criteria: data volume, latency, cost, update frequency
  - **Post this on LinkedIn** — very shareable technical content

---

#### Day 4 — Claude Code & AI-Assisted Development
- **Theory:** How to use agentic coding tools (Claude Code, Cursor) as force multipliers. Prompt patterns for code generation, review, refactor
- **Read:** Claude Code docs, `"AI assisted software engineering workflow"`
- **Experiment:** Take a 100-line module from your toolkit. Let Claude Code refactor it. Review the output critically
- **🏗️ Showcase Task:** Use Claude Code to add a new feature to your toolkit
  - Document the prompts you used
  - Show before/after code quality
  - Reflect: where did it help, where did it fail

---

#### Day 5 — Week 9 Integration Project
- **🏗️ Showcase Task:** **"AI System Design Document"**
  - Design a complete AI product from scratch (your choice of domain)
  - Include: architecture diagram, component breakdown, model selection rationale, eval strategy, cost estimate, failure modes
  - **This is what AI Systems Architect interviews ask for**
  - Publish as a GitHub repo with full documentation

---

### WEEK 10 — Capstone Project

**Week Goal:** Build one showcase-worthy end-to-end AI system

---

#### Day 1 — Capstone Design
- **Choose your capstone** from these options (or propose your own):
  - **Option A:** AI-powered code review system (agents + tools + evals)
  - **Option B:** Personal knowledge base with multi-agent Q&A
  - **Option C:** Autonomous competitor analysis tool
  - **Option D:** AI writing assistant with style learning + RAG
- Design the full system. Write spec document

---

#### Day 2 — Core Pipeline
- Build the main LLM pipeline + tool integrations

---

#### Day 3 — Agent Layer
- Add orchestration, memory, planning

---

#### Day 4 — Eval + Guardrails + Observability
- Add production-grade reliability layer

---

#### Day 5 — Polish + Deploy + Document
- **🏗️ Showcase Task:** **Your Capstone — Final Portfolio Piece**
  - Deployed and accessible (Vercel / Railway / HuggingFace Spaces)
  - GitHub repo with excellent README
  - Architecture diagram
  - Demo video (2–3 min Loom)
  - LinkedIn post describing what you built and what you learned
  - **This is what gets you interviews**

---

## 📍 PHASE 6 — Beyond the Core: Real-World Gaps (Weeks 11–12)
> **Goal:** Cover what the core 10 weeks intentionally left out but real 2026 AI Engineer roles expect. Treat this as mandatory, not optional — recruiters will test for these.

---

### WEEK 11 — Multimodal AI & Computer Use Agents

**Week Goal:** Move beyond text-only. Most real GenAI products in 2026 touch images, voice, or the screen itself.

---

#### Day 1 — Vision Input (Image Understanding)
- **Theory:** How multimodal models process images alongside text — vision encoders feeding into the same transformer. Use cases: document scanning, UI review, visual Q&A
- **Read:** Anthropic vision docs, `"multimodal LLM architecture explained"`
- **Experiment:** Feed the same image with 3 different questions. Test accuracy on charts, handwriting, and screenshots
- **🏗️ Showcase Task:** Build an `ImageQA` utility
  - Accepts image + question, returns grounded answer
  - Test on: a chart, a screenshot, a handwritten note
  - Add to toolkit repo

---

#### Day 2 — Audio: Speech-to-Text & Text-to-Speech
- **Theory:** STT/TTS pipeline basics — where transcription ends and LLM reasoning begins. Latency implications for voice UX
- **Read:** `"building voice AI applications"`, Whisper API docs, ElevenLabs/TTS provider docs
- **Experiment:** Transcribe a voice note, pass to your LLM wrapper, speak the response back. Measure round-trip latency
- **🏗️ Showcase Task:** Build a `VoiceInterface` wrapper
  - `speechToText(audio)` → `callLLM()` → `textToSpeech(response)`
  - Add to toolkit repo

---

#### Day 3 — Image Generation
- **Theory:** How diffusion-based image generation differs from LLM text generation. Prompting differences, cost/latency profile
- **Read:** `"image generation API comparison 2026"`
- **Experiment:** Same prompt across 2 image generation APIs. Compare quality, cost, speed
- **🏗️ Showcase Task:** Add an `ImageGen` tool to your `ToolRegistry` from Week 3
  - Lets an agent generate an image as part of a larger task
  - Add to toolkit repo

---

#### Day 4 — Computer Use & Browser Agents
- **Theory:** How "computer use" agents work — screenshot → model reasons about UI → outputs click/type coordinates → loop. Where this differs from API tool calling. Browser automation (Playwright) as an alternative
- **Read:** Anthropic Computer Use docs, `"browser automation AI agents"`, Playwright docs
- **Experiment:** Give an agent a simple browser task (e.g. "search for X and extract the top result"). Observe failure modes
- **🏗️ Showcase Task:** Build a minimal `BrowserAgent`
  - Uses Playwright + your LLM to complete a simple multi-step web task
  - Full action log (what it clicked/typed and why)
  - **This is one of the most in-demand agent skills right now** — strong portfolio differentiator

---

#### Day 5 — Week 11 Integration Project
- **🏗️ Showcase Task:** **"Multimodal Assistant"**
  - Accepts text, voice, or image input
  - Can generate an image or speak a response back
  - Can optionally hand off a task to your `BrowserAgent`
  - **This demonstrates you're not a text-only AI engineer** — most candidates are

---

### WEEK 12 — Ecosystem Breadth & Production Hardening

**Week Goal:** Round out the parts of the ecosystem and production concerns the core weeks didn't have room for

---

#### Day 1 — Python Exposure
- **Theory:** Most of the AI ecosystem (original LangChain, Hugging Face, research code, data tooling) is Python-first. You don't need to switch stacks — you need to *read* Python comfortably
- **Read:** Official LangChain Python quickstart, `"Python for JS developers"`
- **Experiment:** Port one utility from your toolkit (e.g. `PromptBuilder`) to Python. Compare syntax and ecosystem conventions
- **🏗️ Showcase Task:** Add a `/python-port` folder to your toolkit repo
  - One ported utility with a README explaining the JS→Python mapping
  - Goal isn't fluency — it's removing the "I can't read this doc" barrier

---

#### Day 2 — Open-Source & Local Models
- **Theory:** When to self-host (cost, privacy, latency, offline) vs call a hosted API. Overview of Ollama, Hugging Face, llama.cpp
- **Read:** Ollama docs, `"self-hosted vs API LLM cost comparison"`
- **Experiment:** Run a small open model locally via Ollama. Compare latency/quality/cost against your API-based `callLLM()`
- **🏗️ Showcase Task:** Add a `LocalModelAdapter` to your `ModelRouter` (Week 2)
  - Routes simple/sensitive tasks to a local model, complex ones to the API
  - Document the tradeoffs you observed

---

#### Day 3 — Other Agent Frameworks
- **Theory:** How CrewAI, OpenAI's Agents SDK, and Vercel's AI SDK differ from LangGraph/AutoGen in philosophy and API design. Vercel AI SDK matters most for you given your frontend background
- **Read:** CrewAI docs, Vercel AI SDK docs, OpenAI Agents SDK docs
- **Experiment:** Rebuild one small agent task (e.g. your Week 5 `TaskPlanner`) using the Vercel AI SDK
- **🏗️ Showcase Task:** Write a short comparison doc
  - Your custom implementation vs LangGraph (Wk7) vs Vercel AI SDK
  - When you'd reach for each — **good interview talking point**

---

#### Day 4 — Rate Limiting & Concurrency at Scale
- **Theory:** What happens when 1,000 users hit your AI backend at once — queuing, per-user rate limits, retry storms, backpressure
- **Read:** `"rate limiting strategies for LLM APIs"`, `"handling concurrent requests to LLM backends"`
- **Experiment:** Load-test your Document Intelligence App (Wk4) with simulated concurrent users. Find where it breaks
- **🏗️ Showcase Task:** Build a `RequestQueue` layer
  - Per-user rate limiting
  - Queues excess requests instead of dropping them
  - Add to toolkit repo

---

#### Day 5 — AI-Specific Security & Final Hardening
- **Theory:** Security risks beyond prompt injection — client-side API key leaks, SSRF via tool calls (a tool fetching an internal URL), secrets management, least-privilege tool design
- **Read:** `"LLM application security checklist"`, OWASP Top 10 for LLM Applications
- **Experiment:** Audit your own `ToolRegistry` (Week 3) for SSRF risk — can a malicious prompt make `fetchURL` hit an internal IP?
- **🏗️ Showcase Task:** **"Security & Hardening Audit"**
  - Full security pass on your Capstone project
  - Document: secrets handling, tool sandboxing, SSRF mitigations, rate limits
  - Add this report to your Capstone repo — **this is what separates senior candidates**

---

## 🗂️ Portfolio by End of Program

| # | Project | Skills Demonstrated |
|---|---|---|
| 1 | Smart CLI Assistant | LLM control, token management, system design |
| 2 | Prompt Engineering Dashboard | Prompt versioning, evals, structured outputs |
| 3 | Personal Research Agent | Tool use, MCP, ReAct loop |
| 4 | Document Intelligence App | RAG, embeddings, frontend + AI |
| 5 | Multi-Agent Content Pipeline | Orchestration, specialist agents |
| 6 | Resilient Research System | Reliability, cost optimization, LangGraph |
| 7 | Production-Ready Audit | Evals, guardrails, observability |
| 8 | AI System Design Doc | Architecture thinking, senior-level design |
| 9 | Capstone Project | Everything — end-to-end production AI system |
| 10 | Multimodal Assistant | Vision, voice, image generation, browser agents |
| 11 | Security & Hardening Audit | AI-specific security, concurrency, production readiness |

**Shared toolkit repo (`ai-engineer-toolkit`):**
callLLM · PersonaEngine · ParameterPreset · ContextManager · PromptBuilder · StructuredOutputParser · PromptTestRunner · ModelRouter · ToolRegistry · ReActLoop · RAGPipeline · AgentMemory · TaskPlanner · Orchestrator · GuardrailLayer · EvalFramework · ImageQA · VoiceInterface · ImageGen · BrowserAgent · LocalModelAdapter · RequestQueue

---

## 📌 Rules to Follow Every Day
1. Every session produces something pushable to GitHub
2. Every week produces something demonstrable
3. README every project — explain the WHY not just the WHAT
4. If you skip a day, don't double up — just continue
5. Post one thing publicly per week minimum (LinkedIn, X, GitHub)
6. Don't stop at Week 10 — Weeks 11–12 close real gaps (multimodal, computer use, security) that recruiters specifically screen for in 2026