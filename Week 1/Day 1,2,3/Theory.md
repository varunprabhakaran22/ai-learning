# Day 1 — Section 1: The 5 Hard Engineering Facts

---

## ① No Memory Between API Calls

Every API call starts fresh — complete amnesia.  
"Memory" is something you engineer yourself by resending the entire conversation history every single call.

**What actually gets sent on message 3:**

```json
messages: [
  { "role": "user",      "content": "What is an API rate limit?" },
  { "role": "assistant", "content": "An API rate limit is..." },
  { "role": "user",      "content": "Give me 3 strategies to handle it" },
  { "role": "assistant", "content": "1. Retry logic  2. Caching  3..." },
  { "role": "user",      "content": "Which strategy is cheapest?" }
]
```

The model doesn't remember message 1 and 2. You just pasted them in.  
That's the entire trick behind AI "memory."

**Proof:**

```
Call 1: "What did I just ask you about?"
→ Model: "I have no idea"

Call 2: "We were discussing rate limits. What did I just ask you about?"
→ Model: "You asked about rate limits!"
```

Same model. No memory. You just injected the context.

---

## ② Doesn't Retrieve Facts — Guesses From Weights

The model is like a student who read 1000 books over 5 years, walked into an exam with no books, and reconstructs answers purely from memory.

**During training:**

```
LLM reads billions of documents
  → Wikipedia, books, code, websites

All compressed into billions of decimal numbers (weights)
Original documents are thrown away
Model is now just a giant file of numbers
```

**Weights are not 0s and 1s. They are decimal numbers like:**

```
0.234
-1.847
0.001
3.492
-0.673
```

Think of each weight like a volume knob:
- `0.0` → this connection is silent, ignored
- `1.0` → this connection is loud, important
- `-1.0` → this connection actively suppresses something

The model has **billions** of these knobs. Training slowly adjusts all of them until they encode the patterns of human language.

**When you ask something:**

```
You:  "What is the capital of France?"
LLM:  Pattern matches from weights → "Paris" ✅
      (seen "capital of France = Paris" millions of times in training)
```

**When the pattern doesn't exist:**

```
You:  "What did Elon Musk tweet on March 3rd 2024?"
LLM:  No pattern exists → reconstructs something plausible
      "Elon Musk tweeted: Excited about Starship launch progress!" ❌ MADE UP
```

It doesn't know the difference between what it actually learned and what it made up.  
Both come out with the **same confident tone.**  
This is called **hallucination.**

---

## ③ Output is Probability, Not Logic

The model is not a calculator. Every word it produces is a weighted dice roll.

```
"The sky is ___"

Temperature 0:   "blue" (always — most likely word, deterministic)
Temperature 1:   "blue", "vast", "endless", "a canvas" (varies each time)
```

**Temperature controls the randomness:**

| Temperature | Behaviour | Use for |
|---|---|---|
| 0.0 – 0.3 | Consistent, predictable | Facts, code, data |
| 0.7 – 1.0 | Creative, varied | Creative writing, brainstorming |

Same prompt can produce different outputs.  
Reliability must be **designed in by you** — the model won't do it itself.

---

## ④ Context Window is Its Entire Working World

**Two completely different things — don't mix them up:**

| | What it is | Example |
|---|---|---|
| **Weights** | Permanent knowledge from training | Knows Paris is capital of France |
| **Context Window** | Temporary working memory for this conversation | What you typed right now |

**Think of it like a human:**

```
Weights         = long term memory (permanent, from training)
Context Window  = short term memory (only exists during this conversation)
```

You answer using BOTH combined — just like a human in an exam using their memory + a document handed to them.

**How the token bucket works:**

```
Total context window     = 8192 tokens

System prompt            =  200 tokens
Conversation history     =  500 tokens
Your new question        =   50 tokens
─────────────────────────────────────
Total input              =  750 tokens
Remaining for reply      = 7442 tokens available
max_tokens set to 1024   = AI replies in max 1024 tokens
```

**What is a token?**

```
1 token ≈ ¾ of a word (rough average over a paragraph, not per word)

"Hello"              → 1 token  (common word = 1 chunk)
"Hello, how are you" → 5 tokens (words + punctuation + spaces)
"Unbelievable"       → 3 tokens (Un + belie + vable — rare word, split up)
```

Punctuation and spaces count too. Long/rare words get split into smaller pieces.

**As conversation grows, the bucket fills:**

```
Call 1:  [sys: 200] [msg1: 100]                          =  300 tokens ✅
Call 2:  [sys: 200] [msg1: 100] [msg2: 200]              =  500 tokens ✅
Call 3:  [sys: 200] [msg1: 100] [msg2: 200] [msg3: 400]  =  900 tokens ✅
...
Call 20: [sys: 200] [all history: 8000]                  = 8200 tokens ❌ ERROR
```

**When context window fills up:**

| Option | What happens |
|---|---|
| Option 1 | API throws an error → your app crashes |
| Option 2 | Oldest messages get trimmed automatically |
| Option 3 | Old messages get summarized to save space |

In a basic setup — it just throws an error. You handle it yourself.

**Images also eat from your context window:**

```
Images are not tokenized like text.
They are split into small patches (chunks of pixels) → converted to numbers.

System prompt     =  200 tokens
Your question     =   50 tokens
1 image uploaded  = ~1600 tokens
──────────────────────────────
Total input used  = 1850 tokens
Remaining         = 6342 tokens
```

Only **multimodal models** support images (Claude, GPT-4V). Text-only models throw an error.

---

## ⑤ You Are Constructing Its Reality

You are not chatting with it.  
You are building a document every single API call that becomes the model's entire reality for that one call.

```
System prompt          → sets behavior, rules, personality
+ Conversation history → injected memory you manage yourself
+ Real data/context    → facts the model was never trained on
+ Your new question    → the actual ask
─────────────────────────────────────────────────────────
= The complete reality the model lives in for this one API call
```

**The API parameters you control:**

| Key | What it does | When to go deep |
|---|---|---|
| `model` | Which AI model to use | Week 2 |
| `max_tokens` | Max reply length (hard limit per model) | Week 2 |
| `temperature` | Randomness of output (0 = consistent, 1 = creative) | Done ✅ |
| `system` | Instructions to the AI — plain string | Day 2/3 |
| `messages` | Full conversation history array | Done ✅ |

---

## ⑥ System Prompt Is Just Higher-Weighted Text, Not a Hard Rule

There's no special channel for `system`. Under the hood, system + history + new message are **all concatenated into one token sequence** before the transformer sees any of it. The model has no concept of "rules" vs "conversation" — it's all just tokens it predicts the next token from.

```
Actual sequence the model sees:
[SYSTEM: You are a strict JSON API...]
[USER: What's the weather?]
[ASSISTANT: {"temp": 72}]
```

System prompts "win" only because training (RLHF) taught the model to weight that slot more heavily than user text. That's why:
- Long conversations dilute a system rule's influence (more competing tokens later).
- Prompt injection / jailbreaks are possible at all — it's a strong statistical bias, not a hard boundary like a function's type signature.
- Asking for "JSON only" raises the *probability* of JSON-shaped output — it doesn't guarantee valid syntax. Real enforcement = parse + validate + retry, not a stronger-worded prompt.

**Rule of thumb:** the more critical a constraint, the more you should verify it in code rather than trust the prompt alone.

---

## ⑦ Temperature and Top-P Both Reshape the Same Distribution — Differently

Every next-token step produces one probability distribution (via softmax over the model's raw scores). Temperature and top-p don't change what the model "thinks" — they only change how you sample from that fixed distribution.

```
Temperature — divides scores before softmax:
  T < 1 → sharpens (top choice dominates more)
  T > 1 → flattens (choices become more equal)
  T → 0 → effectively always picks the #1 token

Top-P — cuts the list AFTER softmax:
  keeps only the smallest set of top tokens whose probabilities sum to P
  discards the rest, then samples from what's left
  the size of this kept set changes dynamically — a very confident position
  might keep just 1 token at P=0.9; an uncertain one might keep 10
```

Neither adds new options the model didn't already consider — temperature/top-p can surface a token that was at 5%, never one at ~0%. Setting both aggressively at once fights itself (temperature tries to flatten, top-p tries to cut) — pick one lever, leave the other at its neutral default (temp=1.0 or top_p=1.0).

---

## The One Mindset Shift

```
AI user thinks:     "I'm chatting with an intelligent being"

AI engineer thinks: "I'm calling a stateless probabilistic function.
                     I control the input.
                     I must engineer the reliability.
                     The model is a powerful but unreliable component."
```

That shift is what Day 1 is all about. ✅

---

*Next: Section 2 — What to Read + Experiments*