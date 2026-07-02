# Day 1 Recap — How to Think Like an AI Engineer

## Memory / Statelessness
- **User thinks:** "It remembers our conversation."
- **Engineer thinks:** "There is no memory. I resend the entire history myself, every call. What looks like memory is just me pasting the transcript back in."

## Facts / Hallucination
- **User thinks:** "It knows things and looks them up."
- **Engineer thinks:** "It's reconstructing an answer from compressed patterns in its weights. A real fact and a made-up one come out with the same confident tone — I can't trust fluency as a signal of truth."

## Output / Determinism
- **User thinks:** "Same question should give the same answer."
- **Engineer thinks:** "Every word is a weighted dice roll. Reliability isn't free — I have to design it in (temperature=0 for facts/code, higher only when I actually want variety)."

## Context Window
- **User thinks:** "It just knows what we've been discussing."
- **Engineer thinks:** "Weights = permanent training knowledge. Context window = temporary working memory that I fill. It's a hard limit — if I don't manage it (trim/summarize), the call just errors."
- Even if something fits in the window, it isn't read equally well — stuff buried in the middle of a long context gets used less reliably than the start/end.

## System Prompts
- **User thinks:** "The system prompt is a rule the model has to follow."
- **Engineer thinks:** "It's just text in the same token stream as everything else — it only carries more weight because training taught the model to prioritize that slot. It's a strong bias, not a hard boundary. Critical constraints still need to be verified in code (e.g. 'JSON only' doesn't guarantee valid JSON — I still parse and retry)."

## Temperature vs Top-P
- **User thinks:** "These are just 'creativity sliders.'"
- **Engineer thinks:** "Both reshape the same fixed probability distribution the model already produced — they never introduce an option the model didn't already consider. Temperature reshapes ALL odds; top-p cuts the list to the top options. I pick one lever and leave the other at default, instead of tuning both and losing control."

## The Overall Shift
```
User:      "I'm chatting with an intelligent being."
Engineer:  "I'm calling a stateless probabilistic function.
            I control the input. I must engineer the reliability.
            The model is powerful but unreliable — treat it like a component, not a colleague."
```

## Still need to cover / do
- Transformer architecture experiments (attention, embeddings) — see Lessons.md Part A
- Token economics & context management (tokenizers, cost, budgeting) — see Day 4/
- Day 2 syllabus: prompt structure, chain-of-thought, few-shot (Week 2)
- Week 1 Day 5: Smart CLI Assistant integration project
