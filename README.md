# 家庭教育咨询 - AI Home Education Consulting

A full-stack AI-powered home education consulting web application built with **Python + FastAPI** (backend) and **React + Vite + TypeScript** (frontend).

> Looking for documentation? Start at [`docs/README.md`](docs/README.md).
> AI coding agent? Read [`AGENTS.md`](AGENTS.md) (or `CLAUDE.md` — they're the same file).

## Features

- AI chat consulting powered by OpenAI-compatible APIs with real-time SSE streaming
- RAG augmentation from a curated Chinese-language knowledge base (35 files, ~396 KB)
- Email/password registration and login, with email verification and password reset flows
- Phone number + OTP login (mock SMS for development)
- Session history with filter, archive, and delete
- User settings: theme (light/dark/system), notifications, DND hours, language
- Mobile-first responsive design with swipe gesture navigation
- Dark mode support
- Bilingual UI (zh-CN primary, English stretch goal)

## Project Structure

```
HomeEducation/
├── backend/                 Python + FastAPI backend
│   ├── main.py              FastAPI app, lifespan, CORS, route mounting
│   ├── config.py            Env-driven Config singleton
│   ├── database.py          init_db() — idempotent schema
│   ├── dependencies.py      current_user / current_user_optional
│   ├── routes/              auth.py, chat.py, settings.py
│   ├── repositories/        Data access layer
│   ├── services/rag.py      TF-IDF + jieba RAG service (in-process)
│   ├── data/
│   │   ├── app.db           SQLite (auto-created, gitignored)
│   │   └── llm_ref/         RAG knowledge base (35 .txt files)
│   ├── requirements.txt
│   └── .env                 Local secrets (never commit)
├── frontend/                React + Vite + TypeScript frontend
│   ├── vite.config.ts       Manual vendor chunks, dev server, /api proxy
│   ├── src/
│   │   ├── App.tsx          Router + lazy page imports
│   │   ├── api/client.ts    HTTP + SSE client
│   │   ├── store/           Zustand state stores
│   │   ├── hooks/           Custom React hooks
│   │   ├── i18n/            Translations (zh-CN)
│   │   ├── components/      Reusable UI components
│   │   └── pages/           Route-level components (all lazy)
│   └── tests/               Vitest unit tests
├── openspec/                Spec-driven development artifacts
│   ├── config.yaml          Project context + per-artifact rules
│   ├── specs/               Source-of-truth specs (delta format)
│   └── changes/             In-flight + archived changes
├── docs/                    Documentation
│   ├── architecture/        System design
│   ├── guides/              How-to (getting-started, deployment, openspec, ...)
│   ├── adr/                 Architecture decision records
│   ├── investigations/      Post-mortems and bug investigations
│   └── api/                 HTTP API reference
├── scripts/                 Helper scripts
│   └── sync-agent-docs.sh   Keep AGENTS.md and CLAUDE.md in sync
├── AGENTS.md                Agent-facing instructions (symlinked to CLAUDE.md)
├── CLAUDE.md                Symlink → AGENTS.md
└── OpenSpec/                The OpenSpec framework source (vendored; not used at runtime)
```

## Quick start

```bash
# Backend
cd backend
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
# Edit .env (copy from a teammate) — set JWT_SECRET, AI_BASE_URL, AI_API_KEY, AI_MODEL
python3 main.py               # → http://localhost:3001

# Frontend (separate terminal)
cd frontend
npm install
npm run dev                    # → http://localhost:7194
```

Full setup: see [`docs/guides/getting-started.md`](docs/guides/getting-started.md).

## OpenSpec workflow

For non-trivial changes (new features, multi-file edits, API changes), use OpenSpec:

```bash
# In your AI coding agent:
/opsx:propose "<idea>"   # drafts proposal + design + tasks + spec deltas
/opsx:apply              # implement task by task
/opsx:archive            # finalize
```

Details: [`docs/guides/openspec-workflow.md`](docs/guides/openspec-workflow.md).

## Documentation map

| Audience       | Start here                                                              |
|----------------|-------------------------------------------------------------------------|
| New dev        | [`docs/guides/getting-started.md`](docs/guides/getting-started.md)      |
| Adding feature | [`docs/guides/openspec-workflow.md`](docs/guides/openspec-workflow.md)  |
| Deploying      | [`docs/guides/deployment.md`](docs/guides/deployment.md)                |
| Reviewing      | [`docs/adr/`](docs/adr/) + [`docs/architecture/`](docs/architecture/)   |
| API consumer   | [`docs/api/`](docs/api/)                                                |

## Contributing

1. Read [`AGENTS.md`](AGENTS.md).
2. Branch off `main` (`feat/...`, `fix/...`, `chore/...`).
3. Use OpenSpec for non-trivial changes.
4. Conventional commits in English.
5. Update docs in the same PR.
6. Add an ADR in `docs/adr/` for any significant design decision.
7. Verify with `npm run build` (frontend) and a smoke test (backend).

## License

Private project. All rights reserved.
