# Architecture Decision Records (ADRs)

An ADR is a short, immutable document that captures **one significant design decision** and the trade-offs we accepted when we made it.

## Why

- Future contributors (including future you) will ask "why did we do it this way?"
- ADRs answer that question without archaeology.
- They make disagreements visible early.

## Index

| #    | Title                                | Status     | Date       |
|------|--------------------------------------|------------|------------|
| 0001 | [Frontend stack: React + Vite](0001-frontend-stack.md)   | Accepted   | 2026-05-26 |
| 0002 | [RAG: TF-IDF + jieba, no vector DB](0002-rag-implementation.md) | Accepted | 2026-05-26 |
| 0003 | [Bilingual content: zh-CN first](0003-bilingual-content.md) | Accepted   | 2026-05-26 |
| 0004 | [No nginx in dev: Vite proxy](0004-no-nginx-dev.md)     | Accepted   | 2026-05-26 |

## How to write a new ADR

1. Copy `template.md` to `NNNN-short-kebab-title.md` where `NNNN` is the next four-digit number.
2. Fill in **Status** (`Proposed` or `Accepted`), **Date**, and the rest.
3. Open it as a PR. Discuss. Mark `Accepted` once merged.
4. Add a row to the index above.

## Rules

- **Immutable once Accepted.** If we change our mind, write a *new* ADR that supersedes the old one. Don't edit history.
- **One decision per ADR.** If you find yourself writing about two things, split it.
- **Be honest about trade-offs.** "We picked X because Y" without the downsides is propaganda.
- **Cite evidence.** Links to docs, benchmarks, prior art — anything that supports the decision.

## Template

```markdown
# NNNN. <Title>

- **Status:** Proposed | Accepted | Superseded by NNNN
- **Date:** YYYY-MM-DD
- **Deciders:** <who>

## Context and Problem Statement
<2-4 sentences. What situation forced this decision?>

## Considered Options
- Option A — <one-line>
- Option B — <one-line>
- Option C — <one-line>

## Decision
<We chose Option X because ...>

## Consequences
- Good, because ...
- Bad, because ...
- Neutral, because ...

## References
- <links>
```
