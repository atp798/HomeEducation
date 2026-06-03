# 0002. RAG: TF-IDF + jieba, no vector database

- **Status:** Accepted
- **Date:** 2026-05-26
- **Deciders:** Finger, Straka

## Context and Problem Statement

The chat feature needs to ground AI answers in a curated knowledge base of Chinese-language home-education material. We needed a retrieval mechanism that:
- Works on Chinese text (which means: jieba for tokenization, not whitespace splitting)
- Is fast at query time (every chat message triggers a retrieval)
- Doesn't require infrastructure we don't already have (no extra servers, no API keys, no Docker)
- Returns "good enough" results — we don't need state-of-the-art

## Considered Options

- **A. TF-IDF + jieba in-process** — pure Python, no external deps beyond jieba. Index fits in RAM.
- **B. Embeddings + a vector DB** (Chroma, FAISS, Qdrant, pgvector) — better semantic match, but adds a process and a dependency.
- **C. BM25** — slightly better than TF-IDF for short queries, similar cost.

## Decision

We chose **Option A**: TF-IDF with jieba tokenization, computed in-process at FastAPI startup, held in RAM for the life of the process.

Implementation in `backend/services/rag.py`:
1. Walk `data/llm_ref/home-edu-etl-llm_combine-prompt/*.txt` (35 files, ~396 KB).
2. Split on blank lines into paragraphs.
3. Long paragraphs (≥ 600 chars) split on sentence boundaries.
4. Tokenize with jieba, drop stop-words and single chars.
5. Compute per-chunk TF-IDF vectors.
6. At query time: tokenize the query, build a vector, cosine-similarity against the corpus, take top-3 from 3 distinct source files.

## Consequences

Good:
- Zero infrastructure. The index lives in the FastAPI process. ~2-3s startup cost on first request, instant afterward.
- Easy to inspect — `RAG` debug logs show the retrieved chunks and scores.
- Easy to extend — drop new `.txt` files into the KB dir, restart, done.

Bad:
- Pure keyword match. Semantic miss when a user paraphrases ("如何教育孩子" vs "培养儿童"). Acceptable for the current corpus.
- Cold start takes 2-3s while the RAG service loads. Mitigated by running `load()` in a thread pool during FastAPI's lifespan.

Neutral:
- When the corpus grows past a few MB, we'll need to revisit (BM25 or a small vector DB).

## References

- `backend/services/rag.py` — full implementation
- `docs/architecture/backend.md` — RAG section
- `docs/investigations/` — past performance investigations
