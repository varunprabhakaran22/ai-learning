# Day 3 Lessons — Advanced Retrieval Strategies

## Part A — "advanced RAG techniques 2025"
_(not yet read — log notes here after reading)_

## Part B — "re-ranking in RAG pipelines"
_(not yet read — log notes here after reading)_

## Part C — Experiment: basic vs hybrid vs re-ranked, scored on 20 queries
Per the syllabus showcase task: compare basic RAG (Day 2) vs hybrid search vs hybrid+re-ranked results on 20 queries, score relevance, and produce a benchmark table (basic vs advanced improvement).

Design the 20 queries to specifically probe the failure modes Theory.md named:
- A few queries with exact codes/IDs (probes hybrid search's BM25 component)
- A few "Plan A vs Plan B"-style near-duplicate queries (probes re-ranking)
- A few phrased as questions vs. how the source document is phrased as statements (probes whether HyDE would help, even though HyDE isn't in `example.js` yet)

Log relevance scores (even a manual 1-5 judgment per query is fine) and note which technique fixed which specific query, not just an aggregate pass/fail.
