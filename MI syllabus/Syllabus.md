# 🧠 AI & ML Engineer — High Level Syllabus
### What separates an AI Engineer from an ML Engineer — and what they share

---

## First — The Distinction

| | AI Engineer | ML Engineer |
|---|---|---|
| **Focus** | Building products with existing models | Building and training models |
| **Core skill** | Systems, APIs, orchestration | Math, statistics, model architecture |
| **Output** | AI-powered applications | Trained models, pipelines |
| **Tools** | LLM APIs, vector DBs, agents | PyTorch, TensorFlow, Jupyter |
| **You are here** | ← Our current syllabus | This roadmap adds this layer |

Both paths share a common foundation. They diverge at the specialization layer.

---

## 🗺️ The Full Map

```
FOUNDATION          Mathematics + Statistics + Python
      ↓
ML CORE             How models are built and trained
      ↓
      ├── AI ENGINEER PATH       Systems, APIs, Agents, Production
      │
      └── ML ENGINEER PATH       Deep Learning, Model Training, Research
```

---

## LAYER 1 — Foundation (Shared by Both)
> You need this regardless of which path you take

| Topic | What It Covers | Key libraries |
|---|---|---|
| **Python for ML** | NumPy, Pandas, Matplotlib, Seaborn — the data manipulation + viz layer | `numpy` (arrays/ops), `pandas` (DataFrames/EDA), `matplotlib` (static plots), `seaborn` (statistical viz) |
| **Linear Algebra** | Vectors, matrices, dot products — how data moves through models | — |
| **Calculus Basics** | Derivatives, gradients — how models learn (backpropagation intuition) | — |
| **Statistics & Probability** | Distributions, Bayes theorem, hypothesis testing | — |
| **Data Wrangling** | Cleaning, transforming, splitting datasets | `pandas` |

**Honest time estimate:** 4–6 weeks at 1hr/day if starting from scratch (~64 hrs total at 6–10 hrs/week).
With your engineering background — 2–3 weeks focused on the ML-specific parts.

---

## LAYER 2 — ML Core (Shared by Both)
> Understanding how models work under the hood

| Topic | What It Covers | Key libraries |
|---|---|---|
| **Supervised Learning** | Linear regression, logistic regression, decision trees, SVMs | `scikit-learn` |
| **Unsupervised Learning** | Clustering (K-means), dimensionality reduction (PCA) | `scikit-learn` |
| **Model Evaluation** | Train/val/test splits, overfitting, bias-variance tradeoff, metrics | `scikit-learn` |
| **Feature Engineering** | How raw data becomes model-ready input | `pandas`, `scikit-learn` |
| **Neural Network Basics** | Perceptrons, activation functions, forward/backward pass | — |
| **Classical ML Libraries** | Scikit-learn — the gateway to practical ML | `scikit-learn` |

**Honest time estimate:** 4–6 weeks at 1hr/day (~100 hrs total at 8–12 hrs/week)

---

## LAYER 3A — AI Engineer Specialization
> This is what our current 2-course syllabus covers

| Module | Topics |
|---|---|
| **LLM Engineering** | Prompt engineering, context management, parameter control |
| **Pipeline Hooks** | Middleware, lifecycle, observability |
| **Knowledge Systems** | RAG, embeddings, vector databases |
| **Agents & Orchestration** | Tool use, MCP, multi-agent systems |
| **Evals & Reliability** | Testing prompts, guardrails, monitoring |
| **Production Systems** | Deployment, scaling, cost architecture |
| **Infra & System Design** | Databases, queues, API design, CI/CD |

**→ This is your current path. Already planned in detail.**

**Note on hand-rolled vs. library code:** the current syllabus deliberately hand-rolls every primitive (chunking, embedding, cosine similarity, BM25, re-ranking, etc.) before naming the library that wraps it — see `Applied AI Syllbus/Syllabus/AI.md`'s Jargon Decoder table for exactly which library (LangChain, LangGraph, LangSmith, Hugging Face) maps to which hand-built primitive, and which week each gets its dedicated library-usage day (e.g. LangGraph → Wk7 D4, Hugging Face/local models → Wk12 D2). "When do I actually practice calling LangChain in realistic production shape, not just know the mapping" is intentionally deferred to **Course 2 (Infra & System Design, below)** — that's where real deployment-shaped code belongs, once the primitives are solid.

---

## LAYER 3B — ML Engineer Specialization
> What you'd add to become an ML Engineer on top of the foundation

| Module | Topics | Key libraries |
|---|---|---|
| **Deep Learning** | CNNs, RNNs, attention mechanism, transformer architecture | `PyTorch` or `TensorFlow`/Keras |
| **PyTorch / TensorFlow** | Building and training neural networks from scratch (tensors, models, `tf.data`) | `PyTorch`, `TensorFlow` |
| **LLM & Transformer Libraries** | Loading/running pretrained transformer models, prompt engineering at the library level | Hugging Face `transformers`, Anthropic SDK, LangChain (chains/RAG usage, not just the mapping table) |
| **Training Infrastructure** | GPUs, distributed training, mixed precision, gradient checkpointing | — |
| **Model Optimization** | Quantization, pruning, distillation — making models smaller/faster | — |
| **Fine-tuning** | LoRA, QLoRA, PEFT — adapting pretrained models to specific domains | Hugging Face `peft`/`transformers` |
| **MLOps** | Experiment tracking, model versioning, training pipelines | MLflow, Weights & Biases (W&B) |
| **Evaluation & Benchmarking** | BLEU, ROUGE, perplexity, domain-specific benchmarks | — |
| **Research Literacy** | Reading papers, implementing from scratch, staying current | — |

**Honest time estimate:** 6–9 months at 1hr/day — this is a deep path

**Production & systems (closes out Layer 3B, either path):** testing, async/concurrency, Docker, APIs, deployment, logging — the same "Production Systems" and "Infra & System Design" modules already listed under Layer 3A apply here too; this isn't a separate track, it's shared groundwork both specializations eventually need.

---

## LAYER 4 — Advanced Specializations
> After mastering Layer 3 — where you go deep

### AI Engineer Advanced
| Specialization | Focus |
|---|---|
| **AI Product Architecture** | Designing AI systems at org scale |
| **Multi-modal Systems** | Vision + audio + text pipelines |
| **AI Security** | Adversarial attacks, prompt injection at scale |
| **Domain AI** | Finance AI, Legal AI, Medical AI — vertical depth |

### ML Engineer Advanced
| Specialization | Focus |
|---|---|
| **NLP Research** | Transformers, BERT, GPT architecture internals |
| **Computer Vision** | Image classification, detection, segmentation |
| **Reinforcement Learning** | RLHF, reward modeling — how LLMs are aligned |
| **ML Systems** | Designing training infrastructure at scale |
| **Applied Research** | Closing the gap between papers and production |

---

## Where You Are + What's Ahead

```
✅ DONE         Weeks 1–3    LLM Control + Tools + MCP
                             (AI Engineer Layer 3A started)

🔄 NEXT         Week 4       Hooks & Middleware
                Weeks 5–11   RAG → Agents → Evals → Production

📋 PLANNED      Course 2     Infra & System Design (8 weeks)

🔮 FUTURE       Layer 1+2    Foundation Math + ML Core
                             (adds ML Engineer path)
                Layer 3B     Deep Learning + Fine-tuning + MLOps
                             (completes ML Engineer path)
```

---

## Honest Recommendation for Your Situation

**Don't try to do both paths simultaneously.**

Finish the AI Engineer path completely first (your current 2 courses).
That alone makes you hireable and gives you real income.

Then decide:
- If you enjoy building products → stay AI Engineer, go deeper into Layer 4A
- If you're drawn to how models work → add Layer 1+2 foundation, then Layer 3B

Most people who try to learn both at once end up mediocre at both.
**Sequential mastery beats parallel mediocrity.**

---

## The One Thing That Separates Good from Great

At any layer, at any specialization:

> **The engineer who can evaluate their own work — who writes evals, measures outcomes, and iterates systematically — will always outperform the engineer who ships and hopes.**

This is why evals are in our syllabus. It applies equally to ML engineering.