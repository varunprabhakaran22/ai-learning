# Day 1 — Section 2: Transformer Architecture + Temperature & Sampling

---

## Part A — The Illustrated Transformer (Jay Alammar)

---

### What Problem Did Transformer Solve?

Before Transformers (2017), AI read text **word by word, left to right.**  
By the time it reached the end of a long sentence — it forgot the beginning.

```
"The cat that was sitting on the mat which was 
bought from the store last tuesday finally moved"

Old AI: by the time it reaches "moved"... 
        forgot "cat" was the subject ❌
```

Transformer solved this by reading **all words at the same time** and figuring out how every word relates to every other word — simultaneously.

---

### The Big Picture

```
Your text goes in
      ↓
┌─────────────┐
│   ENCODER   │  → Understands the input
└─────────────┘
      ↓
┌─────────────┐
│   DECODER   │  → Generates the output word by word
└─────────────┘
      ↓
Response comes out
```

> **Important:** Modern LLMs like Claude and GPT are **Decoder Only.**  
> The Encoder was removed. The Decoder is powerful enough to do both jobs.

---

### Step 1 — Tokenization

```
"The sky is blue"
      ↓
["The", "sky", "is", "blue"]  ← split into tokens
```

---

### Step 2 — Embeddings (Words → Numbers)

The model can't read words. Everything becomes numbers.  
Each token gets converted into a long list of decimal numbers called an **embedding.**

```
"cat" → [0.2, -0.5, 0.8, 0.1, -0.3 ...]
"dog" → [0.2, -0.4, 0.7, 0.1, -0.2 ...]  ← similar to cat!
"car" → [0.9,  0.1, 0.1, 0.8,  0.5 ...]  ← very different
```

Words with similar meanings have similar numbers.  
Think of it like coordinates on a map — cat and dog live close together, cat and car live far apart.

---

### Step 3 — Attention (The Core Invention)

**Attention answers: "Which other words should I focus on to understand this word?"**

```
"The animal didn't cross the street because it was too tired"

What does "it" refer to?

"it" looks at all words:
  animal  → 85% relevant  ← strong attention here ✅
  street  →  8% relevant
  The     →  2% relevant
  tired   →  1% relevant
```

Every word looks at every other word simultaneously — not one at a time.

**How attention is calculated — 3 things per word (Q, K, V):**

```
Q = Query  → "What am I looking for?"
K = Key    → "What do I contain?"
V = Value  → "What information do I give if selected?"
```

Think of it like a search engine:
```
Query = your search term        "looking for the subject of this sentence"
Key   = each word's label       "I am an animal noun" / "I am a street noun"
Value = each word's meaning     actual info about "animal", "street" etc.

Match Query against all Keys → get attention scores → pull the right Values
```

---

### Step 4 — Multi-Head Attention

Instead of doing attention once, the model does it **multiple times in parallel.**  
Each head looks for different types of relationships:

```
Head 1 → grammar relationships
Head 2 → subject/object relationships
Head 3 → meaning/semantic relationships
Head 4 → positional relationships
...up to 96 heads in large models
```

All results are combined. This is why Transformers understand language so richly — they look at text from many angles at once.

---

### Step 5 — Feed Forward Network

After attention, each token passes through a small neural network that **transforms and enriches** the information.

```
Attention output → Feed Forward Network → Richer representation
```

---

### Step 6 — Layers (Stack It All Up)

One round of Attention + Feed Forward = **1 layer.**  
Modern LLMs stack many layers:

```
Input tokens
     ↓
Layer 1  (Attention + Feed Forward)  → basic grammar
     ↓
Layer 2  (Attention + Feed Forward)  → word relationships
     ↓
...
Layer 96 (Attention + Feed Forward)  → complex reasoning
     ↓
Output probabilities for next token
```

> **Always goes through ALL layers — no shortcuts, no early exit.**  
> Even "What is 1+1?" goes through all 96 layers every time.  
> Each layer builds on the previous — skipping is like taking a half-baked cake out of the oven.

---

### Step 7 — Output

```
Layer 96 output
      ↓
Convert to probabilities (Softmax)
      ↓
blue    → 60%
clear   → 20%
vast    → 10%
      ↓
Pick a word based on temperature/top-p
      ↓
Repeat for next token → until done
```

---

### Encoder vs Decoder — What's Inside Each

**Encoder has 2 parts:**

| Part | What it does |
|---|---|
| Self Attention | Every word looks at every other word — finds relationships |
| Feed Forward Network | Takes attention output, enriches it deeper |

**Decoder has 3 parts:**

| Part | What it does |
|---|---|
| Masked Self Attention | Same as encoder BUT can only see previous tokens, not future ones |
| Cross Attention | Connects decoder to encoder — decoder asks encoder "what was the input about?" |
| Feed Forward Network | Same as encoder — enriches before producing final token probabilities |

**Why masked in decoder?**
```
Generating: "The sky is blue and..."

When generating "blue":
  Can see   → "The", "sky", "is"   ✅
  Cannot see → "and", next words   ❌ masked
```
Because during generation you don't know future words yet.

**Why decoder-only models removed Cross Attention:**
```
No encoder → no encoder output → cross attention has nothing to connect to
           → cross attention removed

Decoder only has:
  1. Masked Self Attention
  2. Feed Forward Network
```

---

### Is Transformer the Core Architecture of All LLMs?

**Yes. Every major LLM uses it:**

```
GPT-4    → Transformer ✅
Claude   → Transformer ✅
Gemini   → Transformer ✅
LLaMA    → Transformer ✅
Mistral  → Transformer ✅
```

Invented in 2017 — paper called **"Attention Is All You Need"** by Google.

**What makes LLMs different from each other then?**

```
Same core: Transformer

Differences:
  → Number of layers
  → Number of attention heads
  → Amount and type of training data
  → Fine tuning approach
  → Safety training (RLHF)
  → Context window size
```

Like cars — same basic parts (engine, wheels, steering) but Ferrari ≠ Toyota.

---

*Next: Section 3 — Experiments*