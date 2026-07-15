# 🧱 Terminologies Mastery — Classical ML / DL / NLP (30 Days)

### Source: `02.Terminologies Mastery.pdf` — 80 Terms · 30 Days

> **When this runs:** after `Applied AI Syllbus/` (Weeks 1–12) is complete.
>
> **Format note:** the source PDF is a terms checklist with a day budget, not a pre-built day-by-day plan. This document keeps the PDF's exact terms and day counts (10/6/4/10 = 30) and only sequences them into a learnable order — no terms added, none dropped. The Jargon Coverage Map at the bottom proves every term lands somewhere. **Depth is not determined by the PDF** — the PDF only supplies the topic list; actual depth per topic is decided when each day's content is written, matching `Applied AI Syllbus`'s bar.

**Workflow note:** the day-by-day breakdown below is the topic roadmap only (scope, sequencing, exercise) — a skeleton for planning, not the actual lesson. `Theory.md` gets written first per day, then read and questioned, then revised based on what the doubt reveals, before moving to `Recap.md` and the next day.

---

## Python Programming (Day 0 + 14 Days)

> **Added beyond the source PDF's original 10-day count (2026-07-13):** Day 0 (runtime-model foundation) and Days 11-14 (type hints, testing, iterators/context managers + lint/format tooling, asyncio) were not in `02.Terminologies Mastery.pdf`'s original term list. Added after an explicit gap-check against "what does a working Python developer need to know" — the PDF's 10 days cover classical syntax/data-science tooling well but omit type hints, testing, the general iterator/context-manager protocol, lint/format tooling, and async — all standard expectations for a professional Python role, not just ML scripting. Confirmed with the user before adding.

**Day 0 — Runtime Model: Interpreter vs Compiler, Bytecode, Sync vs Async**
Not one of the PDF's 80 terms — a prerequisite mental model established before Day 1 so every later day has ground under it. Covers: what a compiler vs an interpreter actually does, why Python needs `python3` installed/present to run anything, bytecode + the `__pycache__`/`.pyc` cache, why an uncaught error halts execution at that line rather than undoing prior output, and Python's sync-by-default execution model vs JS's browser-provided event loop (with `asyncio`/`async`/`await` previewed here, full depth deferred to Day 14).

**Day 1 — Variables & Data Types**

**Day 2 — Data Structures, Slicing & Indexing, Comprehensions**

**Day 3 — Control Flow, Functions & Lambda Functions**

**Day 4 — Decorators & Generators**

**Day 5 — Exception Handling, File I/O & JSON**

**Day 6 — OOP & Classes**

**Day 7 — Modules & Packages, Virtual Environments, Git & GitHub**

**Day 8 — NumPy**

**Day 9 — Pandas**

**Day 10 — Matplotlib & Seaborn, Jupyter Notebook, API Requests**

**Day 11 — Type Hints & the `typing` Module**
*(Added beyond source PDF.)* `def foo(x: int) -> str:` style annotations, `Optional`/`Union`/`list[str]`-style generics, why annotations aren't enforced at runtime (unlike TS) and what actually checks them.

**Day 12 — Testing with `pytest`**
*(Added beyond source PDF.)* Writing test functions, `assert`, fixtures, running a test suite — the professional-baseline skill the original 10 days never touched.

**Day 13 — Iterators, Context Managers & Lint/Format Tooling**
*(Added beyond source PDF.)* The general iterator protocol (`__iter__`/`__next__`) underneath Day 4's generators, writing a custom `with`-compatible class (`__enter__`/`__exit__`) beyond just using `with open(...)`, plus a practical pass on `mypy`/`black`/`ruff` alongside Day 7's Git/packaging content.

**Day 14 — `asyncio` / async-await in Depth**
*(Added beyond source PDF.)* Full depth on the sync-vs-async preview from Day 0 — coroutines, `asyncio.run`, `await`, concurrent tasks, async HTTP (`httpx`/`aiohttp`) vs synchronous `requests`. Not needed for the ML/DL/NLP days directly ahead, but required to call this track complete for a general Python-developer role (e.g. backend/API work later in `Applied AI Syllabus`).

---

## Machine Learning (6 Days)

**Day 1 — Supervised vs Unsupervised vs Reinforcement Learning, Features & Labels, Train/Test Split**

**Day 2 — Classification**

**Day 3 — Regression**

**Day 4 — Evaluation Metrics: Accuracy, Precision, Recall, F1, Confusion Matrix, ROC-AUC, Class Imbalance**

**Day 5 — Overfitting, Underfitting, Cross-Validation & Regularization**

**Day 6 — Clustering & Feature Engineering**

---

## Deep Learning (4 Days)

**Day 1 — Neural Networks, Perceptron, Forward Propagation & Activation Functions**

**Day 2 — Loss Functions, Backpropagation, Gradient Descent, Epochs/Batch/LR**

**Day 3 — Optimizers, Dropout, Batch Normalization, Vanishing Gradients, Hyperparameter Tuning**

**Day 4 — CNN, RNN/LSTM, Pretrained Models, Transfer Learning, Fine-Tuning, SOTA Models/Techniques**

---

## NLP (10 Days)

**Day 1 — Tokenization, Stop Words, Stemming & Lemmatization**

**Day 2 — Bag of Words, Count Vectorizer & N-Grams**

**Day 3 — TF-IDF & Corpus/Vocabulary**

**Day 4 — POS Tagging & NER**

**Day 5 — Word Embeddings, Word2Vec & GloVe**

**Day 6 — Cosine Similarity & Semantic/Document Similarity**

**Day 7 — Attention Mechanism & Self-Attention**

**Day 8 — Transformers & Encoder-Decoder Architecture**

**Day 9 — Language Models & LLMs**

**Day 10 — Vector Embeddings Recap & Handoff to Applied AI Syllbus**

---

## Status

Only this roadmap is written so far. Per-day `Theory.md` / `Recap.md` / `example.py` files get authored one at a time, interactively, as you actually work through the syllabus: `Theory.md` is written first, then read and questioned, then revised based on what the doubt reveals, before `Recap.md` and the next day.
