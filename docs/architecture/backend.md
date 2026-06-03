# Backend Architecture

## Stack

- **Python 3.x** (3.10+ recommended)
- **FastAPI** — async web framework
- **uvicorn** — ASGI server, with `--reload` in dev
- **SQLite** — file-based DB at `backend/data/app.db` (no separate server)
- **PyJWT** — JWT auth
- **bcrypt** — password hashing
- **httpx** — async HTTP client for AI calls
- **jieba** — Chinese tokenizer for RAG
- **python-dotenv** — env loading

## Directory layout

```
backend/
├── main.py              # FastAPI app, lifespan, CORS, routes
├── config.py            # Config singleton (env-driven)
├── database.py          # init_db() + connection helpers
├── dependencies.py      # FastAPI dependency injection (auth, db)
├── requirements.txt
├── .env                 # local secrets (NEVER commit)
├── data/
│   ├── app.db           # SQLite
│   └── llm_ref/
│       └── home-edu-etl-llm_combine-prompt/  # 35 RAG KB files
├── routes/
│   ├── auth.py          # register, login, verify-email, reset-password
│   ├── chat.py          # chat sessions, messages, SSE stream
│   └── settings.py      # user settings, theme, notifications
├── repositories/        # data access layer
├── services/
│   └── rag.py           # TF-IDF RAG service (singleton)
└── utils/
```

## Lifecycle

`main.py` uses FastAPI's `lifespan` context manager:

```python
@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()                         # create tables if missing
    await asyncio.get_event_loop().run_in_executor(None, rag_service.load)
    yield
```

- `init_db()` runs on first request — schema is idempotent.
- `rag_service.load()` reads 35 `.txt` files (~396 KB), chunks them, builds an in-memory TF-IDF index. Runs in a thread pool so it doesn't block the event loop. The index is held in RAM and reused on every request.

## CORS

Wide-open in dev:
```python
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["*"],
    allow_credentials=True,
)
```
Tighten before production.

## Routing

Routes are mounted **without** the `/api` prefix:

```python
app.include_router(auth_router)
app.include_router(chat_router)
app.include_router(settings_router)
```

The Vite dev proxy strips `/api` before forwarding, and the SSE `client.ts` calls `/chat/messages/stream` directly. This means:

- A POST to `localhost:7194/api/auth/login` → Vite strips → `localhost:3001/auth/login` → `routes/auth.py`
- An SSE GET to `localhost:7194/chat/messages/stream?session_id=...` → no proxy needed (Vite serves it through FastAPI directly because the path doesn't start with `/api`)

If you add a new route, follow the same convention.

## Auth

- JWT in `Authorization: Bearer <token>`, 7-day expiry (`JWT_EXPIRES_DAYS`).
- `dependencies.py` exposes `current_user` and `current_user_optional` as FastAPI dependencies — use them in protected routes:
  ```python
  @router.get("/me")
  async def me(user = Depends(current_user)):
      return user
  ```
- Password hashing via bcrypt. **Never** log or echo a password or OTP.

## RAG service

`services/rag.py` implements a simple TF-IDF retriever (no external ML deps):

1. At startup, walk `data/llm_ref/home-edu-etl-llm_combine-prompt/*.txt`.
2. Split each file on blank lines into paragraphs.
3. Split long paragraphs (≥ 600 chars) on sentence boundaries.
4. Tokenize with jieba, drop stop-words and single chars.
5. Compute TF-IDF vectors for all chunks.
6. At query time, tokenize the query, build a vector, cosine-similarity against the corpus, take top-3 from 3 distinct source files.

The retrieved passages are formatted as a "参考知识库" block and prepended to the AI system prompt. If no chunk scores above `MIN_SCORE = 0.02`, the block is omitted.

**Why not a vector DB?** The corpus is small (~35 files, 396 KB) and the response quality is "good enough" with TF-IDF. See `../adr/0002-rag-implementation.md`.

## Streaming chat

`routes/chat.py` exposes an SSE endpoint that:
1. Pulls the user message from the request.
2. Calls `rag_service.build_context(message)` → optional context block.
3. Streams the AI response token-by-token via `httpx.AsyncClient.stream(...)`.
4. Re-emits each chunk to the client as an SSE event.

The frontend consumes it with a custom `EventSource`-style client (see `frontend/src/api/client.ts`).

## Configuration

`config.py` reads from `backend/.env` (loaded via `python-dotenv`). All knobs:

| Env var              | Default                              | Used for                        |
|----------------------|--------------------------------------|---------------------------------|
| `PORT`               | `3001`                               | uvicorn port                    |
| `CORS_ORIGIN`        | `http://localhost:5173`              | CORS allow-origin (legacy)      |
| `JWT_SECRET`         | `your-secret-key-change-in-production` | JWT signing                   |
| `DB_PATH`            | `./data/app.db`                      | SQLite file                     |
| `AI_BASE_URL`        | empty                                | OpenAI-compatible base          |
| `AI_API_KEY`         | empty                                | Auth for AI provider            |
| `AI_MODEL`           | empty                                | Model id                        |
| `SMTP_HOST` / `SMTP_PORT` / `SMTP_USER` / `SMTP_PASS` | mock | Outbound email            |
| `FRONTEND_URL`       | falls back to `CORS_ORIGIN`          | Used in email links             |
| `LOG_LEVEL`          | `INFO`                               | uvicorn + app log verbosity     |
| `LOG_FILE`           | empty                                | If set, also writes rotating log |

**Never commit `.env`.** Add new entries to a local `.env.example` if you need to share defaults.

## Conventions

- Routes return plain dicts or Pydantic models — pick Pydantic for typed contracts.
- DB access goes through `repositories/*` — never raw SQL in route handlers.
- Long-running blocking work belongs in a thread pool, not the event loop.
- All errors that should reach the user get a `HTTPException(status_code=..., detail=...)`.
