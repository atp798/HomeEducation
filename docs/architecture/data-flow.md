# Data Flow

End-to-end traces of the most important user actions.

## 1. Login

```
Browser (Login.tsx)
   │ POST /api/auth/login  {email, password}
   │ via api/client.ts → axios
   ▼
Vite dev proxy :7194
   │ strips /api → POST /auth/login
   ▼
FastAPI :3001  (routes/auth.py → login())
   │ 1. Look up user by email (repositories/auth_repo.py)
   │ 2. bcrypt.checkpw(password, user.password_hash)
   │ 3. PyJWT.encode({sub: user_id}, JWT_SECRET, exp=+7d)
   ▼
Response 200  {token, user}
   │
   ▼
Browser (authStore.setAuth(token, user))
   │ - stores token in localStorage
   │ - stores user in zustand
   │ - <Navigate to="/chat" replace />
```

## 2. Chat message (the interesting one)

```
Browser (Chat.tsx)
   │ POST /api/chat/sessions/{id}/messages
   │ body: {role: "user", content: "..."}
   │ → Vite proxy → /chat/sessions/{id}/messages
   ▼
FastAPI  (routes/chat.py)
   │ 1. Auth via Depends(current_user)  → 401 if no token
   │ 2. Persist user message in SQLite (repositories/chat_repo.py)
   │ 3. Load conversation history for the session
   │ 4. rag_service.build_context(user_message)
   │     - jieba tokenize the user message
   │     - cosine-similarity against the in-memory TF-IDF index
   │     - top-3 chunks from 3 distinct source files
   │     - return formatted "参考知识库" block (or None)
   │ 5. Build messages = [system, *history, user]
   │     where system = SYSTEM_PROMPT + (RAG block or "")
   │ 6. OpenAI-compatible stream via httpx.AsyncClient
   ▼
Response 200  text/event-stream
   │ event: message
   │ data: {"delta": "..."}
   │ event: message
   │ data: {"delta": "..."}
   │ ...
   │ event: done
   │ data: {"session_id": "..."}
   ▼
Browser (api/client.ts → EventSource-like)
   │ onmessage → append delta to current bubble (Chat.tsx state)
   │ on "done" → scroll to bottom, persist assistant message
```

The Vite proxy injects `x-accel-buffering: no` and `cache-control: no-cache` for `text/event-stream` responses so chunks arrive in real time, not buffered.

## 3. Page load (cold cache)

```
Browser hits https://home-edu.make-it.com.cn:7194/
   │ 1. index.html (~1 KB, gzip 0.5 KB)
   │    - <link rel="modulepreload"> for vendor-react, vendor-markdown, ...
   │ 2. Browser fetches vendor-react (167 KB, gzip 53 KB) — cached for 1 year
   │ 3. Browser fetches vendor-markdown (45 KB, gzip 13 KB) — cached
   │ 4. Browser fetches index.js (21 KB, gzip 9 KB) — current code
   │ 5. React mounts → <Suspense> shows PageLoader
   │ 6. lazy() resolves the requested page chunk (4-15 KB)
   │ 7. Page renders, fires data fetches
   ▼
First contentful paint ≈ <1s on a warm cache, ≈2-3s cold
```

Because vendor chunks are content-hashed and rarely change, the browser cache covers ~95% of subsequent visits.

## 4. Registration + email verification

```
Register form
   │ POST /api/auth/register {email, password, phone?}
   │ → bcrypt hash → INSERT user (status=pending)
   │ → generate email token, send via SMTP (or mock provider)
   ▼
User clicks link in email
   │ GET /verify-email?token=...
   │ → VerifyEmail.tsx
   │ POST /api/auth/verify-email {token}
   │ → mark user.status = active
   ▼
Auto-login → <Navigate to="/chat" />
```

## 5. Settings update

```
Settings.tsx
   │ PUT /api/settings  {theme, notify, dnd_start, dnd_end}
   │ → routes/settings.py → settings_repo.upsert(user_id, ...)
   ▼
Response 200  {ok: true}
   │
   ▼
themeStore.apply(theme) → useTheme hook toggles <html class="dark">
```

## Error flow

All FastAPI routes raise `HTTPException(status_code, detail)`. The axios client in `frontend/src/api/client.ts` intercepts responses and:

- `401` → clear `authStore`, redirect to `/login`
- `403` → show a toast
- `4xx/5xx` → show toast with `error.response.data.detail`

Server logs go to stdout, and optionally to `LOG_FILE` if configured (rotating, 10 MB × 5 files).
