# 0004. No nginx in dev: Vite proxy + direct uvicorn

- **Status:** Accepted
- **Date:** 2026-05-26
- **Deciders:** Finger, Straka

## Context and Problem Statement

The dev box is also the public host. The app needs to be reachable at `home-edu.make-it.com.cn:7194` (frontend) and `localhost:3001` (backend). The simplest possible setup today is: Vite serves the SPA on `:7194` and proxies `/api/*` to FastAPI on `:3001`. There is no nginx, no systemd, no Docker.

## Considered Options

- **A. Vite dev server + uvicorn (current)** — one command per process, no config drift between local and prod.
- **B. nginx in front of both** — production-grade, but adds a config file and a third process to restart on every change.
- **C. Vite preview mode + built dist** — closer to prod, but loses HMR.

## Decision

**Option A** for dev. We accept that prod will be different (nginx + built dist + gunicorn). The cost of divergence is small because:
- The Vite proxy already injects the right SSE headers, so the only real difference is the static asset host.
- The FastAPI app doesn't know whether it's behind a proxy or not — it just answers HTTP.

When prod is set up, we'll write ADR-0005 covering the move.

## Consequences

Good:
- One process restart per code change. No stateful proxy in the way.
- HMR works as expected.
- Port `7194` is the only one the public DNS needs to point at.

Bad:
- Vite dev server is slower at serving static assets than nginx.
- No HTTP/2 push, no Brotli compression (vite preview with `vite-plugin-compression` is the closer-to-prod option).
- If the dev box reboots, the processes don't auto-start. We restart them by hand for now.

Neutral:
- The Vite dev server's `allowedHosts` whitelist is the only security boundary for now. Tighten before opening the box up further.

## References

- `frontend/vite.config.ts` — `server.allowedHosts`, `server.proxy`
- `docs/guides/deployment.md` — restart commands
- `docs/guides/getting-started.md` — first-time setup
