# Password Reset Flow Investigation Report

**Date:** 2026-04-07
**Investigated by:** AI Agent

## Summary

After thorough investigation of the `/auth/forgot-password` endpoint, the code was found to be **already correct** with proper safeguards in place. The fixes from commits `131cb09` and `5010a3f` are properly applied.

## Findings

### 1. Code Analysis - `forgot_password` function (routes/auth.py)

```python
@router.post("/forgot-password")
async def forgot_password(body: ForgotPasswordRequest):
    db = get_db()
    repo = UserRepository(db)
    user = repo.find_by_email(body.email)

    if user and not user.get("email_verified"):
        # Blocks unverified users (commit 131cb09)
        raise HTTPException(status_code=403, ...)

    if user:
        # Generate token first (in-memory only), send email, then persist (commit 5010a3f)
        raw_token = str(uuid.uuid4())
        reset_url = ...
        try:
            send_password_reset_email(...)
        except Exception as e:
            logger.error(...)
            raise HTTPException(status_code=500, ...)
        _create_password_reset_token(db, user["id"], raw_token)

    return {"message": "如果该邮箱已注册，密码重置邮件将在片刻后发送，请查收邮件"}
```

### 2. Behavior for Different Cases

| Case | `find_by_email` result | Email Sent? | HTTP Response |
|------|------------------------|-------------|---------------|
| Non-existent email | `None` | ❌ No | 200 (generic message) |
| Deleted account | `None` (hard delete) | ❌ No | 200 (generic message) |
| Unverified user | `user` with `email_verified=0` | ❌ No | 403 |
| Verified user | `user` with `email_verified=1` | ✅ Yes | 200 |

### 3. Database Schema

- **No soft-delete**: `confirm_delete` performs `DELETE FROM users WHERE id = ?` (hard delete)
- **No `deleted_at` column**: Users table has only: `id, email, phone, password_hash, email_verified, created_at, updated_at`
- **No separate deleted users table**

### 4. Email Configuration

- `EMAIL_PROVIDER=smtp` - Real emails sent via Aliyun SMTP (`smtpdm.aliyun.com:80`)
- SMTP credentials configured correctly
- No mock mode active

### 5. Verified Test Results

```
non-existent email -> 200, NO email sent (confirmed by log)
deleted account -> 200, NO email sent (user not in DB)
unverified account -> 403, NO email sent
verified account -> 200, email SENT (log: "Password reset email sent to atp1798@gmail.com")
```

## Conclusion

The reported issue (receiving password reset emails for non-existent/deleted accounts) could not be reproduced with the current code. The likely explanations are:

1. **Testing on older code version**: The fixes (commits `131cb09`, `5010a3f`) may not have been deployed when the issue was reported
2. **Misunderstanding**: The user may have tested with an email they thought was deleted/non-existent but was actually registered and verified
3. **Different environment**: Testing may have occurred on a different deployment

## Current Status

- ✅ Service restarted on port 3001 (was found dead, now running)
- ✅ Code verified correct on `main` branch
- ✅ No action items - code is functioning as designed
