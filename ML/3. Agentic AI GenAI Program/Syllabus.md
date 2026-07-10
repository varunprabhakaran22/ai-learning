# 🤖 Agentic AI GenAI Program (32 Days)

### Source: `Agentic-AI-GenAI-Program-Curriculum.pdf` — 6 Chapters · 13 Projects · 30 Tools · 32 Days

> **Format note:** the source PDF is a 6-chapter, project-based curriculum with an explicit 32-day total, not a pre-built day-by-day plan. This document keeps the PDF's exact chapters, topics, tools, and projects, sequenced into 32 days — no topics added, none dropped. **Depth is not determined by the PDF** — the PDF only supplies the topic list; actual depth per topic is decided when each day's content is written, per `ML/CLAUDE.md`'s shared bar.

**Workflow note:** the day-by-day breakdown below is the topic roadmap only (scope, sequencing, projects) — a skeleton for planning, not the actual lesson. `Theory.md` gets written first per day, then read and questioned, then revised based on what the doubt reveals, before moving to `Recap.md` and the next day — per `ML/CLAUDE.md`.

**Relationship to `Applied AI Syllbus/`:** this chapter's territory (LLM fundamentals, prompt engineering, RAG, agents, orchestration, safety/eval/deploy) substantially overlaps with `Applied AI Syllbus/Weeks 1-9`, which hand-builds these primitives in JS before naming the framework. This syllabus instead teaches the Python-framework layer directly (LangChain, LangGraph, CrewAI, etc.) — treat the two as complementary depth passes on the same territory, not a re-do of one in the other.

---

## GenAI Foundations & LLMs

Tools: Python, Pandas, NumPy, Hugging Face, OpenAI, Gemini

**Day 1 — AI · ML · DL · NLP Landscape, BoW & One-Hot, TF-IDF & Word2Vec Recap**
Topics: AI · ML · DL · NLP, BoW & One-Hot, TF-IDF & Word2Vec.

**Day 2 — Transformer Architecture, Tuning & Adaptation, Open vs Closed Source Models**
Topics: Transformer Architecture, Tuning & Adaptation, Open vs Closed Source.

**Day 3 — Context Window & Tokens, Decoding Parameters**
Topics: Context Window & Tokens, Decoding Parameters.
Project: LLM Playground & Token Explorer.

**Day 4 — Knowledge Cut-off, Hallucination, Guardrails, Human in the Loop**
Topics: Knowledge Cut-off, Hallucination, Guardrails, Human in the Loop.
Project: Decoding Parameter Lab.

---

## Prompt Engineering & LLM APIs

Tools: OpenAI, Anthropic, Gemini, Pydantic

**Day 5 — LLM API Integration & Prompt Types**
Topics: LLM API Integration, Prompt Types.

**Day 6 — Few-Shot & CoT, Structured Outputs, Schema Enforcement**
Topics: Few-Shot & CoT, Structured Outputs, Schema Enforcement.
Project: Structured Output Extractor.

**Day 7 — Output Parsers, Prompt Injection, Prompt Evaluation**
Topics: Output Parsers, Prompt Injection, Prompt Evaluation.
Project: Prompt Injection Defense System.

---

## RAG Pipelines

Tools: LangChain, pgvector, Qdrant, Cohere, Jina

**Day 8 — Loaders & Splitters, Chunking Strategies**
Topics: Loaders & Splitters, Chunking Strategies.

**Day 9 — Embeddings & Vector Databases**
Topics: Embeddings, Vector Databases.
Project: Document Q&A RAG System.

**Day 10 — Retrieval Config & Reranking**
Topics: Retrieval Config, Reranking.

**Day 11 — Advanced RAG & RAG Evaluation**
Topics: Advanced RAG, RAG Evaluation.
Project: Advanced RAG with Reranking.

---

## Agents & Agentic Patterns

Tools: LangChain, LangGraph, CrewAI, Agno, AutoGen

**Day 12 — Agent Architecture & Agentic Patterns**
Topics: Agent Architecture, Agentic Patterns.

**Day 13 — The Agentic Loop, Tools & Calling**
Topics: The Agentic Loop, Tools & Calling.
Project: Tool-Calling Research Agent.

**Day 14 — Agent Memory & Types, Agent Conversation**
Topics: Agent Memory & Types, Agent Conversation.

**Day 15 — Multi-Agent Systems, Supervisor / Worker Pattern**
Topics: Multi-Agent Systems, Supervisor / Worker.
Project: Multi-Agent Content Crew.

---

## Orchestration, Frameworks & MCP

Tools: LCEL, LangGraph, LangSmith, MCP, n8n, Langflow

**Day 16 — LCEL & Templates, Routing & Parallelism**
Topics: LCEL & Templates, Routing & Parallelism.

**Day 17 — Evaluator–Optimizer, LangSmith Tracing**
Topics: Evaluator–Optimizer, LangSmith Tracing.
Project: LangGraph Workflow Orchestrator.

**Day 18 — Bedrock & SageMaker, MCP: Host · Server**
Topics: Bedrock & SageMaker, MCP: Host · Server.

**Day 19 — MCP Tools**
Topics: MCP Tools.
Project: MCP-Powered Desktop Assistant.

**Day 20 — n8n & Langflow**
Topics: n8n & Langflow.
Project: n8n Business Automation Pipeline.

---

## Safety, Eval, Serving & Deploy

Tools: NeMo Guardrails, Ragas, TruLens, Ollama, vLLM, Docker

**Day 21 — Safety & Guardrails, NeMo Guardrails**
Topics: Safety & Guardrails, NeMo Guardrails.

**Day 22 — Ragas & TruLens, Phoenix Monitoring**
Topics: Ragas & TruLens, Phoenix Monitoring.
Project: Guardrailed, Evaluated Chatbot.

**Day 23 — Ollama & vLLM**
Topics: Ollama & vLLM.

**Day 24 — LangServe Streaming**
Topics: LangServe Streaming.

**Day 25 — Docker & Cloud**
Topics: Docker & Cloud.

**Day 26 — AWS · GCP · Azure**
Topics: AWS · GCP · Azure.

**Day 27 to Day 32 — End-to-End AI Copilot**
Project: End-to-End AI Copilot. The PDF names this as one capstone project without internal sub-steps — these 6 days are working time against it, not 6 distinct topics. How the days actually get divided (design vs build vs deploy vs polish) gets decided when this stretch is reached, not invented now.

---

## Status

Only this roadmap is written so far. Per-day `Theory.md` / `Recap.md` / `example.py` files get authored one at a time, interactively, following the shared workflow in `ML/CLAUDE.md`.
