# AGENTS.md — Instructions for AI coding agents

> **This file is mirrored at `CLAUDE.md` via a symlink.** When you edit one, run
> `bash scripts/sync-agent-docs.sh` (or the symlink ensures they stay identical).
> Both names are kept because different agent harnesses (OpenClaw, Claude Code, etc.)
> look for different filenames by convention.

## Project: Home Education Consulting (家庭教育咨询)

A bilingual (zh-CN) AI-powered home education consulting web app. Users register,
log in, and chat with an AI assistant that draws on a curated Chinese-language
knowledge base via RAG.

## Stack at a glance

- **Backend** — Python 3.x + FastAPI + uvicorn, SQLite (file-based), JWT auth (PyJWT),
  bcrypt, httpx for AI calls, jieba for Chinese tokenization in the RAG service.
- **Frontend** — React 18 + Vite 5 + TypeScript, Zustand state, react-router,
  react-markdown, Tailwind CSS, lucide-react icons, date-fns.
- **AI** — OpenAI-compatible streaming API + a TF-IDF RAG index built in-process at
  startup from 35 `.txt` files in `backend/data/llm_ref/`.
- **Dev infra** — Vite dev server on `:7194` proxies `/api/*` to uvicorn on `:3001`.
  No nginx. SQLite file at `backend/data/app.db`.

## Repo layout (essentials)

```
HomeEducation/
├── backend/                 Python + FastAPI
│   ├── main.py              App entry, lifespan, CORS, route mounting
│   ├── config.py            Env-driven Config singleton
│   ├── database.py          init_db()
│   ├── dependencies.py      current_user / current_user_optional
│   ├── routes/              auth.py, chat.py, settings.py
│   ├── repositories/        data access
│   ├── services/            rag.py (TF-IDF + jieba)
│   ├── data/
│   │   ├── app.db           SQLite (gitignored, auto-created)
│   │   └── llm_ref/         RAG knowledge base
│   └── .env                 Local secrets (NEVER commit)
├── frontend/                React + Vite
│   ├── vite.config.ts       Manual vendor chunks, dev proxy
│   ├── src/
│   │   ├── App.tsx          Router + lazy page imports
│   │   ├── api/client.ts    HTTP + SSE client
│   │   ├── components/      Reusable UI
│   │   ├── hooks/           useAuth, useTheme, useSwipe, ...
│   │   ├── i18n/            Translations (zh-CN primary)
│   │   ├── pages/           Route-level, all lazy-loaded
│   │   └── store/           Zustand stores
│   └── tests/
├── openspec/                OpenSpec workflow artifacts
│   ├── config.yaml          Project context + per-artifact rules
│   ├── specs/               Source-of-truth specs (delta format)
│   └── changes/             In-flight + archived changes
├── docs/                    Documentation (see docs/README.md)
│   ├── architecture/        System design
│   ├── guides/              How-to
│   ├── adr/                 Architecture decision records
│   ├── investigations/      Post-mortems
│   └── api/                 HTTP API reference
├── AGENTS.md                ← you are here (symlinked to CLAUDE.md)
├── CLAUDE.md                ← symlink → AGENTS.md
└── scripts/sync-agent-docs.sh  Ensures the two stay identical
```

## Conventions

### Language split (per ADR 0003)

| Surface                              | Language   |
|--------------------------------------|------------|
| UI strings, emails, AI system prompt | zh-CN      |
| Knowledge base content               | zh-CN      |
| Code comments, commit messages, PRs  | English    |
| `docs/`, `README.md`, `AGENTS.md`    | English    |
| OpenSpec proposals                   | English    |

### Commits

[Conventional commits](https://www.conventionalcommits.org/), English only,
imperative mood, ≤ 72 char subject. The body explains **why**, not what.

### Frontend

- All page-level components are `default export` and `lazy()`-loaded.
- Single `<Suspense>` near the router root; smaller one inside `MainLayout` for
  the per-tab pages.
- Vite manual chunks are defined as a function in `vite.config.ts` — add new
  heavy deps to it explicitly (`vendor-icons`, `vendor-date`, etc.).
- API calls go through `src/api/client.ts`, never `axios` directly.
- State: Zustand stores in `src/store/`. No Redux.
- Tailwind for styling; dark mode via `useTheme` + `dark:` variants.

### Backend

- Routes return Pydantic models when the contract matters, plain dicts otherwise.
- DB access through `repositories/`, never raw SQL in route handlers.
- `current_user` / `current_user_optional` from `dependencies.py` for auth.
- Long-running blocking work goes in `run_in_executor`.
- `.env` is local-only. Add new env vars to `config.py` and a local
  `.env.example` if teammates need to share defaults.

### OpenSpec

For any non-trivial change (new feature, multi-file edit, API change), use
OpenSpec. See `docs/guides/openspec-workflow.md`. The four commands:

```
/opsx:propose "<idea>"   ← draft proposal + design + tasks + spec deltas
/opsx:apply              ← implement task by task
/opsx:archive            ← move to openspec/changes/archive/ when done
/opsx:explore            ← brainstorm before committing
```

Skip OpenSpec for typo fixes, doc tweaks, one-line bug fixes, and dep bumps.

## Coding methodology (superpowers + gstack)

This project follows the [superpowers](https://github.com/obra/superpowers) methodology and
uses [gstack](https://github.com/garrytan/gstack) skills when running inside OpenClaw or
Claude Code sessions. These complement (do not replace) the OpenSpec workflow above.

- **Brainstorm before coding.** For new features, run `gstack-openclaw-office-hours` (6 forcing
  questions) or `superpowers-brainstorming` to interrogate the idea. Do NOT skip straight to
  `/opsx:propose` — the spec is only as good as the thinking behind it.
- **Spec → plan → apply.** OpenSpec's `/opsx:propose` is the spec. Use
  `superpowers-writing-plans` to break the apply phase into 2–5 minute tasks with exact file
  paths, complete code, and verification steps before `/opsx:apply` starts.
- **TDD.** New behavior gets a failing test first. Frontend: vitest + Testing Library (already
  wired in `frontend/tests/`). Backend: pytest (start `backend/tests/` if not present). RED →
  GREEN → REFACTOR. Delete code written before its test.
- **Subagent-driven execution.** Once the plan is ready, dispatch a fresh subagent per task
  with two-stage review (spec compliance, then code quality). Don't try to apply a 30-task
  change in one context window.
- **Debugging.** For non-obvious bugs, use `gstack-openclaw-investigate` or
  `superpowers-systematic-debugging` (4-phase root cause: reproduce → isolate → understand →
  fix). Verify the fix before declaring done.
- **Periodic retro.** Run `gstack-openclaw-retro` weekly to surface process improvements.

### Skills installed in this OpenClaw workspace

| Skill | When to use |
|---|---|
| `gstack-openclaw-office-hours` | Before any new feature / product idea |
| `gstack-openclaw-ceo-review` | Strategic challenge (4 scope modes) |
| `gstack-openclaw-investigate` | Non-obvious bug, root-cause hunt |
| `gstack-openclaw-retro` | Weekly engineering retrospective |
| `superpowers` | Full methodology bundle (brainstorm, plans, TDD, subagent) |
| `gstack` | Headless-browser QA + dogfooding |

Invoke by saying "load gstack" / "use superpowers" and naming the skill, or use the
`/gstack-openclaw-<name>` / `/superpowers` slash commands.

> **How this composes with OpenSpec.** OpenSpec owns the *what* (proposal, deltas, archive).
> superpowers + gstack own the *how* (interrogation, task sizing, TDD, subagent dispatch).
> They are designed to compose — use both.

## Banned practices

- ❌ Don't run Claude Code without `/login` first.
- ❌ Don't edit `AGENTS.md` and `CLAUDE.md` independently — they must stay
  identical. Edit one, then run `bash scripts/sync-agent-docs.sh`.
- ❌ Don't commit `backend/.env`, `backend/data/app.db*`, or any
  `node_modules/`.
- ❌ Don't add a new vendor dep without updating `frontend/vite.config.ts`'s
  `manualChunks` function.
- ❌ Don't start a new chat message without first calling
  `rag_service.build_context()` — every chat response should be RAG-augmented.
- ❌ Don't `sudo apt install` or any other sudo-requiring command without
  explicit human approval and password.
- ❌ Don't push directly to `main`. Branch off, PR back.

## Always do

- ✅ Read `docs/README.md` first if you're new.
- ✅ Read `docs/guides/openspec-workflow.md` before starting a non-trivial task.
- ✅ Update docs in the same PR as the code change.
- ✅ Write ADRs in `docs/adr/` for significant design decisions.
- ✅ Restart the relevant dev server after `package.json` / `vite.config.ts` /
  `requirements.txt` changes.
- ✅ Verify with `npm run build` after touching `vite.config.ts`.
- ✅ Use the local xray proxy at `127.0.0.1:1080` (HTTP) / `1081` (SOCKS5) for any
  external network access. Direct internet works for some sites but is unreliable
  for GitHub HTTPS. See `~/.openclaw/workspace-edu-group/TOOLS.md` for details.

## Network

- **No proxy, GitHub HTTPS** — works most of the time. Re-try once if it times out.
- **With xray proxy** — required for any external download (npm, pip, gh CLI).
  - HTTP: `http://127.0.0.1:1080`
  - SOCKS5: `socks5://127.0.0.1:1081`
  - `git@github.com:...` (SSH) does **not** need the proxy.
- **Sudo** — almost never available. If you need to install system packages,
  ask the user.

## Quick commands

```bash
# Restart backend
pkill -f "uvicorn main:app" 2>/dev/null
cd backend && nohup python3 -m uvicorn main:app --host 0.0.0.0 --port 3001 \
  > /home/tiger/logs/home-edu-backend.log 2>&1 &

# Restart frontend
pkill -f "vite --port 7194" 2>/dev/null
cd frontend && nohup npm run dev \
  > /home/tiger/logs/home-edu-frontend.log 2>&1 &

# Verify both
curl http://localhost:3001/health
curl -sI http://localhost:7194 | head -1

# Build (after touching vite.config.ts)
cd frontend && npm run build

# Sync AGENTS.md ↔ CLAUDE.md
bash scripts/sync-agent-docs.sh

# Run frontend tests
cd frontend && npm test
```

## graphify

This project has a knowledge graph at graphify-out/ with god nodes, community structure, and cross-file relationships.

When the user types `/graphify`, invoke the `skill` tool with `skill: "graphify"` before doing anything else.

Rules:
- For codebase questions, first run `graphify query "<question>"` when graphify-out/graph.json exists. Use `graphify path "<A>" "<B>"` for relationships and `graphify explain "<concept>"` for focused concepts. These return a scoped subgraph, usually much smaller than GRAPH_REPORT.md or raw grep output.
- Dirty graphify-out/ files are expected after hooks or incremental updates; dirty graph files are not a reason to skip graphify. Only skip graphify if the task is about stale or incorrect graph output, or the user explicitly says not to use it.
- If graphify-out/wiki/index.md exists, use it for broad navigation instead of raw source browsing.
- Read graphify-out/GRAPH_REPORT.md only for broad architecture review or when query/path/explain do not surface enough context.
- After modifying code, run `graphify update .` to keep the graph current (AST-only, no API cost).
