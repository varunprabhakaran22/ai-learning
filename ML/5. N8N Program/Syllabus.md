# 🔗 N8N Program — Level 1 & Level 2 (12 Days)

### Sources: `L1_N8N_Curriculum.pdf` (6 Chapters · 6 Projects · 10 Tools · 6 Days) + `L2_N8N_Curriculum.pdf` (6 Chapters · 6 Projects · 11 Tools · 6 Days)

> **Format note:** both PDFs are 6-chapter, project-based curricula with an explicit 6-day total each, combined here into one 12-day roadmap since Level 2 is a direct continuation of Level 1. This document keeps both PDFs' exact chapters, topics, and projects — no topics added, none dropped. **Depth is not determined by the PDFs** — they only supply the topic list; actual depth per topic is decided when each day's content is written, per `ML/CLAUDE.md`'s shared bar.

**Workflow note:** the day-by-day breakdown below is the topic roadmap only (scope, sequencing, projects) — a skeleton for planning, not the actual lesson. `Theory.md` gets written first per day, then read and questioned, then revised based on what the doubt reveals, before moving to `Recap.md` and the next day — per `ML/CLAUDE.md`.

**Note on scope:** per earlier discussion, n8n (no-code workflow automation) is a different job function (automation/RevOps builder) than AI/ML engineering, kept here because it was one of the 6 source PDFs, not because it's core to the AI/ML engineering goal.

---

# Level 1 (Days 1–6)

## Installation & Getting Started

Tools: Node.js, npm, n8n Cloud

**Day 1 — What is n8n, Self-Hosted vs Cloud, Local & Cloud Setup**
Topics: What is n8n, Self-Hosted vs Cloud, Node.js & npm Install, Local n8n Setup, Running n8n Locally, n8n Cloud Signup, Workspace Configuration, Plan & Usage Limits.

---

## n8n UI, Settings & Essential Nodes

Tools: n8n Editor, Google Sheets, Gmail, Slack

**Day 2 — Canvas, Credentials, Triggers/Actions, Expressions, Core Nodes**
Topics: Canvas Navigation, Credentials Vault, Triggers vs Actions, Expressions & Data Refs, HTTP Request · Webhook, Set · Code Nodes, IF · Switch · Merge, Loop · SplitInBatches · Wait.

---

## Cold Email Outreach Workflow

Tools: Gmail, OpenAI, Zapier, HTTP Request, Google Sheets

**Day 3 — Cold Email Engine, AI Personalisation, Zapier Build, Deliverability**
Topics: Cold Email Engine, Sheet-Driven Campaigns, AI Personalisation · OpenAI, Send Throttling, Zapier Cross-Platform Build, Open & Reply Tracking, Domain Warm-Up, Bounce Handling.

---

## WhatsApp Automation & Chatbots

Tools: WhatsApp Cloud API, Meta Business, OpenAI / Groq

**Day 4 — Meta Business Setup, Cloud API, Bulk Broadcasts, Webhook Listener, LLM Replies**
Topics: Meta Business Setup, Cloud API Credentials, Template Approval, Bulk Broadcast Engine, Rate-Limit Handling, Webhook Listener, Button & List Reply Routing, LLM-Powered Free Text.

---

## AI Voice Agent — Inbound & Outbound

Tools: Bolna, HTTP Request, OpenAI / Groq, Google Sheets

**Day 5 — Voice AI Architecture, STT→LLM→TTS, Bolna Integration, Campaign Engine, Retry Logic**
Topics: Voice AI Architecture, STT → LLM → TTS Pipeline, Bolna HTTP Integration, Outbound Campaign Engine, Dynamic Variable Injection, Call Status Tracking, Inbound Routing & Logging, Retry & Backoff Logic.

---

## Appointment Booking Chatbot

Tools: n8n, Google Calendar, WhatsApp Cloud API, OpenAI, Google Sheets

**Day 6 — Chatbot Architecture, Slot Availability, Calendar Integration, Reschedule/Cancel Flow**
Topics: Chatbot Architecture, Conversation Flow Design, Slot Availability Logic, Calendar API Integration, Time-Zone Handling, Confirmation & Reminders, Reschedule & Cancel Flow, Customer Database Sync.

---

# Level 2 (Days 7–12)

## Social Media Automation

Tools: OpenAI, LinkedIn API, Meta Graph API, Google Sheets

**Day 7 — AI Content Generation, LinkedIn & Instagram API, Two-Step Publish Flow**
Topics: AI Content Generation, LLM Captions & Hashtags, LinkedIn API Setup, Profile & Page Posting, Instagram Graph API, Two-Step Publish Flow.

---

## AI Content Management Workflow

Tools: Lovable, Zapier, Groq, HTTP Request, Google Sheets, Apps Script Webhooks

**Day 8 — Product Architecture, Lovable Frontend, Zapier Backend, JSON Contracts, Auth & Error Handling**
Topics: Product Architecture, Screen & Data Mapping, Lovable Frontend Build, Multi-Page Web App, Zapier Backend Webhooks, Structured JSON Contracts, CORS & Shared-Secret Auth, Error Handling Patterns.

---

## Lead Gen, ETL & Proposal Agent

Tools: OpenAI, Google Sheets, Gmail, HTTP Request, aPDF.io

**Day 9 — Multi-Source Ingestion, ETL Pipeline, Nurture Sequences, LLM Proposal Agent**
Topics: Multi-Source Ingestion, Deduplication & Enrichment, ETL Pipeline Design, Upsert-Safe Writes, Nurture Sequences, Behaviour-Based Scoring, LLM Proposal Agent, Auto-Render to PDF.

---

## Production-Grade RAG Chatbot

Tools: Pinecone, Gemini, HTTP Request, n8n

**Day 10 — RAG Architecture, Chunking, Gemini Embeddings, Pinecone, Top-K Retrieval, AI Agent**
Topics: RAG Architecture, Document Ingestion, Chunking & Overlap, Gemini Embeddings, Pinecone Vector Setup, Top-K Semantic Retrieval, Grounded Prompts, AI Agent Setup.

---

## HubSpot CRM with AI Agent

Tools: HubSpot CRM, AI Agent, Gemini LLM, n8n

**Day 11 — HubSpot Setup, Deal Stage Automation, AI Agent Architecture, Lead Scoring, Conversation Memory**
Topics: HubSpot CRM Setup, Contacts & Deals Sync, Deal Stage Automation, Activity Logging, AI Agent Architecture, Gemini LLM Integration, Lead Scoring with AI, Conversation Memory.

---

## Viral YouTube Idea & Video Generator

Tools: n8n, OpenAI, YouTube Data API, ElevenLabs, Google Sheets

**Day 12 — Trend Research, LLM Script Generation, Thumbnail Prompts, ElevenLabs Voiceover, Auto-Upload**
Topics: Trend Research Engine, Viral Topic Discovery, LLM Script Generation, Hook & Title Optimisation, Thumbnail Prompt Crafting, ElevenLabs Voiceover, Auto-Upload Pipeline, Performance Analytics.

---

## Status

Only this roadmap is written so far. Per-day `Theory.md` / `Recap.md` / `example.py` files get authored one at a time, interactively, following the shared workflow in `ML/CLAUDE.md`.
