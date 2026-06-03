# 0001. Frontend stack: React 18 + Vite 5 + manual vendor chunks

- **Status:** Accepted
- **Date:** 2026-05-26
- **Deciders:** Finger (edu-group agent), with Straka's approval

## Context and Problem Statement

We needed a fast, type-safe SPA framework that:
- Compiles quickly during development (HMR is non-negotiable)
- Produces a small, cacheable production bundle
- Supports lazy code-splitting out of the box
- Has a strong ecosystem for the libraries we need (Markdown rendering, state, routing)

## Considered Options

- **A. Next.js (React + SSR + file-based routing)** — biggest ecosystem, but SSR is overkill for an auth-walled app and adds deployment complexity.
- **B. React + Vite + manual chunks** — fast HMR, small bundles, full control over code splitting, no SSR baggage.
- **C. SvelteKit** — smaller bundles, but smaller ecosystem and the team has more React experience.

## Decision

We chose **Option B**: React 18 + Vite 5 + TypeScript, with `manualChunks` defined as a function in `vite.config.ts` to split vendor code by concern:

- `vendor-react` (react, react-dom, react-router-dom)
- `vendor-markdown` (react-markdown, remark-gfm)
- `vendor-state` (zustand)
- `vendor-api` (axios)
- `vendor-icons` (lucide-react) — kept separate because the package is 46 MB on disk
- `vendor-date` (date-fns)
- `vendor-misc` — fallback for everything else

All page-level components are wrapped in `React.lazy()` with a single `<Suspense>` near the router root, plus a smaller `<Suspense>` inside `MainLayout` for the per-tab pages.

## Consequences

Good:
- Cold-cache first load is under 2-3s; warm cache is sub-second.
- Vendor chunks are content-hashed; they almost never invalidate, so the browser cache covers ~95% of repeat visits.
- Vite's dev server is fast — HMR is effectively instant.

Bad:
- No SSR → no SEO. Acceptable because the entire app is behind auth.
- Manual chunking needs maintenance. If we add a new heavy dep, we have to update the function.

Neutral:
- Locked to React 18. When 19 stabilizes, the upgrade is non-trivial (Suspense semantics changed slightly).

## References

- `frontend/vite.config.ts` — current chunk function
- `docs/architecture/frontend.md` — full frontend write-up
- The lazy-loading refactor landed on branch `feat/loading-speed-optimization` (merged 2026-05-26)
