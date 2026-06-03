# 0003. Bilingual content: zh-CN first, English later

- **Status:** Accepted
- **Date:** 2026-05-26
- **Deciders:** Straka

## Context and Problem Statement

The home-education knowledge base is in Simplified Chinese, and the primary user base is Chinese-speaking parents. But the codebase comments, commit messages, and technical docs benefit from being in English so they survive team growth and tooling changes.

We needed a rule for which language goes where.

## Considered Options

- **A. zh-CN everywhere** — consistent, but English-speaking contributors (and most AI coding tools) will struggle with comments and commit messages.
- **B. English everywhere** — easier for tooling, alienates the primary user.
- **C. zh-CN in user-facing content, English in code/commits/docs** — split by audience.

## Decision

**Option C.** The rule:

| Surface                                | Language   |
|----------------------------------------|------------|
| UI strings, emails, AI system prompt   | zh-CN      |
| Knowledge base content (`data/llm_ref/`) | zh-CN    |
| Inline code comments                   | English    |
| Commit messages                        | English    |
| Pull request titles / descriptions     | English    |
| `docs/`, `README.md`, `AGENTS.md`      | English    |
| OpenSpec proposals                     | English    |
| AI model `system` prompt               | Chinese (with English placeholder) |

## Consequences

Good:
- Codebase stays contributor-friendly.
- Users get a native-language experience.
- AI tools (which default to English) can review PRs without translation friction.

Bad:
- Switching context between Chinese (for product) and English (for code) is a small cognitive cost.
- Translating user feedback into the right place takes discipline.

Neutral:
- When English UI ships, we add a toggle and the i18n hook already supports it.

## References

- `frontend/src/i18n/` — current translation files
- `backend/services/rag.py` — comment style example
- This ADR is mirrored in `AGENTS.md` so coding agents pick it up
