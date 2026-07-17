# Day 2 Lessons — RAG Pipeline Architecture

## Part A — "RAG pipeline production best practices"
_(not yet read — log notes here after reading)_

## Part B — "chunking strategies for RAG"
_(not yet read — log notes here after reading)_

## Part C — Experiment: same question, three context qualities
Run the same question through the pipeline three times and compare answers:
1. No context (skip augmentation entirely, ask Claude directly)
2. Bad chunks (deliberately retrieve irrelevant chunks, e.g. force topK to pull from the wrong document)
3. Good chunks (normal pipeline behavior)

Document the quality difference in each answer — this is the concrete, hands-on version of the point that a wrong answer needs to be traced to which pipeline stage broke (retrieval handing over the wrong context vs. generation misreading correct context), since identical generation-step behavior produces very different answer quality depending on what augmentation fed it.
