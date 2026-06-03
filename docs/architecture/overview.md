# System Architecture Overview

## What is this app?

A bilingual (zh-CN) AI-powered home education consulting web app. Users register, log in, and chat with an AI assistant that draws on a curated Chinese-language knowledge base of family-education course material via RAG.

## High-level diagram

```
┌──────────────────────────────────────────────────────────────┐
│                          Browser                             │
│  React 18 + Vite SPA  (http://home-edu.make-it.com.cn:7194)  │
│  - Pages lazy-loaded via React.lazy + Suspense               │
│  - State: Zustand stores (auth, theme, toast)                │
│  - API: axios + custom SSE client                            │
└──────────────┬──────────────────────────┬────────────────────┘
               │ /api/* (HTTP)            │ /chat/messages/stream (SSE)
               │                          │
               ▼                          │
┌──────────────────────────┐               │
│  Vite dev proxy :7194    │               │
│  (strips /api prefix)    │               │
└──────────────┬───────────┘               │
               │                           │
               ▼                           ▼
┌──────────────────────────────────────────────────────────────┐
│            FastAPI backend  (localhost:3001)                 │
│  - routes/      : auth, chat, settings                       │
│  - services/    : rag (TF-IDF + jieba), AI client (httpx)    │
│  - repositories/: SQLite data access                        │
│  - main.py      : lifespan starts RAG index in executor      │
└──────────────┬───────────────────────────────────────────────┘
               │
       ┌───────┴───────┐
       ▼               ▼
┌──────────────┐  ┌──────────────────────────┐
│  SQLite DB   │  │  External AI (OpenAI-    │
│  (./data/    │  │  compatible streaming)   │
│  app.db)     │  │  + 35-file KB at         │
│              │  │  data/llm_ref/...        │
└──────────────┘  └──────────────────────────┘
```

## Two processes, one repo

| Process | Port | Entry point            | Auto-reload |
|---------|------|------------------------|-------------|
| Backend | 3001 | `backend/main.py`      | Yes (uvicorn reload) |
| Frontend| 7194 | `frontend/vite.config.ts` | Yes (HMR) |

Both run as long-lived background processes on the dev machine. There is no nginx or reverse proxy in front — Vite serves the SPA directly and proxies `/api/*` to FastAPI.

## Why these choices?

See `../adr/`:

- `0001-frontend-stack.md` — React + Vite + manual chunks
- `0002-rag-implementation.md` — TF-IDF + jieba (no vector DB)
- `0003-bilingual-content.md` — i18n hook + content strategy
- `0004-no-nginx-dev.md` — Vite proxy instead of reverse proxy in dev

## Non-goals (for now)

- Multi-tenant / org accounts
- Vector database (we use TF-IDF, which is "good enough" for ~35 KB corpus)
- Server-side rendering (SPA is fine; SEO isn't a priority for an auth-walled app)
- WebSocket transport for chat (SSE is simpler and works through the existing proxy)

## Where to go next

- New to the codebase? Read `../guides/getting-started.md`
- Adding a feature? Read `../guides/openspec-workflow.md`
- Want to understand a module? See `frontend.md` or `backend.md`
