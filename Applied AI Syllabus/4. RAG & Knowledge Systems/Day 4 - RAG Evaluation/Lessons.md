# Day 4 Lessons — RAG Evaluation

## Part A — RAGAS docs
_(not yet read — log notes here after reading)_

## Part B — "RAG evaluation metrics explained"
_(not yet read — log notes here after reading)_

## Part C — Experiment: run the pipeline on 10 Q&A pairs, score with RAGAS-style metrics
Per the syllabus showcase task: build 10 real Q&A pairs against your own documents (not the 2-item toy set in `example.js`), run them through `createRAGEvaluator`, and inspect the per-question scores — not just the aggregate.

Specifically look for:
- A question where Context Recall is low (the right chunk existed but wasn't retrieved) — trace it back to a Day 2/3 pipeline knob (chunk size, topK, hybrid alpha).
- A question where Faithfulness is low (Claude added something not in the retrieved context) — inspect the actual answer text to see what got invented.
- Whether swapping in Day 3's advanced pipeline (hybrid + re-rank) instead of `example.js`'s brute-force retrieval measurably improves Context Precision/Recall on the same 10 questions — this is the direct benchmark the syllabus asks for.
