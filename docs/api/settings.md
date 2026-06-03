# `/settings/*`

User-level settings: theme, notification preferences, Do-Not-Disturb hours.

> Mounted in `backend/routes/settings.py`. All paths are after the Vite proxy has stripped `/api`.

## `GET /settings`

Return the current user's settings.

**Response 200**
```json
{
  "theme": "system",          // "light" | "dark" | "system"
  "notifications": {
    "email": true,
    "push": false
  },
  "dnd": {
    "enabled": false,
    "start": "22:00",
    "end": "08:00"
  },
  "language": "zh-CN"          // "zh-CN" | "en-US" (en-US is a stretch goal)
}
```

**Defaults** are returned if the user has never saved settings.

## `PUT /settings`

Replace the current user's settings (partial updates are accepted — only provided fields are changed).

**Body** (all fields optional)
```json
{
  "theme": "dark",
  "notifications": { "email": false, "push": true },
  "dnd": { "enabled": true, "start": "23:00", "end": "07:30" },
  "language": "en-US"
}
```

**Response 200**
```json
{ "ok": true, "settings": { /* full new settings object */ } }
```

**Validation**
- `theme` must be one of `light`, `dark`, `system`
- `dnd.start` / `dnd.end` are 24-hour `HH:MM` strings
- `language` is an IETF tag (currently only `zh-CN` is meaningful)

**Errors**
- `400` — invalid value
- `401` — missing or invalid token
