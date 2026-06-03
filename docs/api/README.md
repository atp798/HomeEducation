# API Reference

The HTTP API is served by FastAPI on `localhost:3001`. The Vite dev proxy (`:7194`) strips `/api` before forwarding, so the public URL is `https://home-edu.make-it.com.cn:7194/api/...` but the backend itself only sees the post-strip path.

## Conventions

- All requests and responses are JSON unless noted.
- Auth (where required) is `Authorization: Bearer <jwt>`.
- Errors are `{"detail": "<message>"}` with a 4xx/5xx status code.
- Timestamps are ISO 8601 UTC.
- IDs are server-issued strings (UUIDs or short hashes — never trust client IDs).

## Endpoints

| Method | Path                                | Auth | Module                              | Doc                       |
|--------|-------------------------------------|------|-------------------------------------|---------------------------|
| GET    | `/health`                           | —    | `main.py`                           | (inline)                  |
| POST   | `/auth/register`                    | —    | `routes/auth.py`                    | [auth.md](auth.md)        |
| POST   | `/auth/login`                       | —    | `routes/auth.py`                    | [auth.md](auth.md)        |
| POST   | `/auth/verify-email`                | —    | `routes/auth.py`                    | [auth.md](auth.md)        |
| POST   | `/auth/reset-password`              | —    | `routes/auth.py`                    | [auth.md](auth.md)        |
| GET    | `/auth/me`                          | ✅   | `routes/auth.py`                    | [auth.md](auth.md)        |
| POST   | `/chat/sessions`                    | ✅   | `routes/chat.py`                    | [chat.md](chat.md)        |
| GET    | `/chat/sessions`                    | ✅   | `routes/chat.py`                    | [chat.md](chat.md)        |
| DELETE | `/chat/sessions/{id}`               | ✅   | `routes/chat.py`                    | [chat.md](chat.md)        |
| GET    | `/chat/sessions/{id}/messages`      | ✅   | `routes/chat.py`                    | [chat.md](chat.md)        |
| POST   | `/chat/sessions/{id}/messages`      | ✅   | `routes/chat.py`                    | [chat.md](chat.md)        |
| GET    | `/chat/messages/stream`             | ✅   | `routes/chat.py` (SSE)              | [chat.md](chat.md)        |
| GET    | `/settings`                         | ✅   | `routes/settings.py`                | [settings.md](settings.md)|
| PUT    | `/settings`                         | ✅   | `routes/settings.py`                | [settings.md](settings.md)|

## SSE notes

`GET /chat/messages/stream` is a long-lived `text/event-stream` connection. The Vite proxy sets:

```
x-accel-buffering: no
cache-control: no-cache
```

so chunks reach the browser in real time. The client must call `eventSource.close()` on unmount to avoid leaks.
