# `/chat/*`

Chat sessions, messages, and the AI streaming endpoint.

> Mounted in `backend/routes/chat.py`. All paths are after the Vite proxy has stripped `/api`.

## `POST /chat/sessions`

Create a new chat session.

**Response 200**
```json
{
  "id": "sess_abc123",
  "title": "新对话",
  "created_at": "2026-05-26T08:00:00Z"
}
```

## `GET /chat/sessions?archived=false&limit=20&offset=0`

List the current user's sessions, most recent first.

**Query params**
- `archived` (bool, default `false`)
- `limit` (int, default `20`, max `100`)
- `offset` (int, default `0`)

**Response 200**
```json
{
  "items": [
    { "id": "sess_abc", "title": "...", "updated_at": "...", "archived": false }
  ],
  "total": 42
}
```

## `DELETE /chat/sessions/{id}`

Soft-delete a session (sets `archived=true`).

**Response 200**
```json
{ "ok": true }
```

## `GET /chat/sessions/{id}/messages`

List all messages in a session, oldest first.

**Response 200**
```json
{
  "items": [
    { "id": "m1", "role": "user",      "content": "如何培养孩子的专注力？", "created_at": "..." },
    { "id": "m2", "role": "assistant", "content": "...", "created_at": "..." }
  ]
}
```

## `POST /chat/sessions/{id}/messages`

Send a user message. **Triggers a RAG-augmented AI reply that is streamed over SSE** via `GET /chat/messages/stream`. This endpoint only persists the user message and returns immediately — the assistant reply arrives through the stream.

**Body**
```json
{ "content": "如何培养孩子的专注力？" }
```

**Response 200**
```json
{ "message_id": "m3", "stream_url": "/chat/messages/stream?session_id=sess_abc" }
```

The frontend typically opens the stream immediately after this call returns.

## `GET /chat/messages/stream?session_id=...`

Server-Sent Events stream. Long-lived. One event per AI token.

**Headers**
- `Content-Type: text/event-stream`
- `Cache-Control: no-cache`
- `X-Accel-Buffering: no` (injected by Vite proxy)

**Event format**
```
event: message
data: {"delta": "首先，"}

event: message
data: {"delta": "建议从"}

event: done
data: {"session_id": "sess_abc", "message_id": "m4"}
```

**Errors**
- `401` — missing or invalid token
- `404` — session not found or not owned by the user
- The client should always call `eventSource.close()` on unmount.

## End-to-end client pattern

```ts
// 1. Post the user message
const { stream_url } = await api.post(`/chat/sessions/${id}/messages`, { content })

// 2. Open the SSE stream
const es = new EventSource(`${stream_url}&token=${token}`)
es.addEventListener('message', (e) => {
  const { delta } = JSON.parse(e.data)
  appendToCurrentBubble(delta)
})
es.addEventListener('done', () => es.close())
```
