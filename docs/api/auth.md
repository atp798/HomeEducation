# `/auth/*`

User account creation, login, email verification, and password reset.

> Mounted in `backend/routes/auth.py`. All paths are after the Vite proxy has stripped `/api`.

## `POST /auth/register`

Create a new user. Sends a verification email.

**Body**
```json
{
  "email": "user@example.com",
  "password": "min8chars",
  "phone": "+8613800000000"   // optional
}
```

**Response 200**
```json
{
  "user_id": "u_abc123",
  "message": "verification email sent"
}
```

**Errors**
- `400` — email already exists
- `422` — invalid email or weak password

## `POST /auth/login`

Exchange credentials for a JWT.

**Body**
```json
{ "email": "user@example.com", "password": "min8chars" }
```

**Response 200**
```json
{
  "token": "eyJhbGciOi...",
  "user": { "id": "u_abc123", "email": "...", "status": "active" }
}
```

**Errors**
- `401` — bad credentials
- `403` — email not verified (when SMTP is configured and `require_verification` is on)

## `POST /auth/verify-email`

Consume the token from the verification email.

**Body**
```json
{ "token": "abc123" }
```

**Response 200**
```json
{ "ok": true }
```

**Errors**
- `400` — token expired or unknown

## `POST /auth/reset-password`

Start the password-reset flow. Always returns 200 even if the email is unknown (to avoid leaking account existence).

**Body**
```json
{ "email": "user@example.com" }
```

**Response 200**
```json
{ "ok": true }
```

## `POST /auth/reset-password/confirm`

Set a new password using a token from the reset email.

**Body**
```json
{ "token": "abc123", "new_password": "newMin8chars" }
```

**Response 200**
```json
{ "ok": true }
```

## `GET /auth/me`

Return the current user. Requires `Authorization: Bearer <jwt>`.

**Response 200**
```json
{
  "id": "u_abc123",
  "email": "user@example.com",
  "status": "active",
  "created_at": "2026-05-26T08:00:00Z"
}
```

**Errors**
- `401` — missing or invalid token
