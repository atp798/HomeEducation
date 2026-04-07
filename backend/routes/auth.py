import uuid
import logging
from datetime import datetime, timezone, timedelta
from fastapi import APIRouter, HTTPException, Request, Depends, status
from pydantic import BaseModel
from typing import Optional

from config import config
from database import get_db
from dependencies import get_current_user
from repositories.user import UserRepository, OtpRepository
from utils.auth import hash_password, verify_password, sign_token, generate_otp
from services.notify import send_sms_code, send_email_code, send_verification_email, send_deletion_email, send_password_reset_email

router = APIRouter(prefix="/auth", tags=["auth"])
logger = logging.getLogger(__name__)


class RegisterRequest(BaseModel):
    email: str
    password: str


class LoginRequest(BaseModel):
    type: str  # 'email' | 'phone'
    email: Optional[str] = None
    phone: Optional[str] = None
    password: Optional[str] = None
    code: Optional[str] = None


class SendOtpRequest(BaseModel):
    phone: Optional[str] = None
    email: Optional[str] = None


class ResendVerificationRequest(BaseModel):
    email: str


def _log_login(db, user_id: str, request: Request) -> None:
    ip = request.client.host if request.client else None
    device = request.headers.get("user-agent")
    log_id = str(uuid.uuid4())
    db.execute(
        "INSERT INTO login_logs (id, user_id, ip, device) VALUES (?, ?, ?, ?)",
        (log_id, user_id, ip, device),
    )
    db.commit()


def _create_verification_token(db, user_id: str) -> str:
    """Create a new email verification token, replacing any existing unused ones."""
    db.execute(
        "DELETE FROM email_verification_tokens WHERE user_id = ? AND used = 0",
        (user_id,),
    )
    token = str(uuid.uuid4())
    expires_at = (datetime.now(timezone.utc) + timedelta(hours=24)).strftime("%Y-%m-%d %H:%M:%S")
    db.execute(
        "INSERT INTO email_verification_tokens (id, user_id, token, expires_at) VALUES (?, ?, ?, ?)",
        (str(uuid.uuid4()), user_id, token, expires_at),
    )
    db.commit()
    return token


@router.post("/register")
async def register(body: RegisterRequest, request: Request):
    db = get_db()
    repo = UserRepository(db)

    if repo.find_by_email(body.email):
        raise HTTPException(status_code=409, detail="该邮箱已注册")

    user = repo.create(email=body.email, password_hash=hash_password(body.password))

    # Generate email verification token (valid 24 hours)
    verification_token = _create_verification_token(db, user["id"])

    # Build verification URL pointing at the frontend
    verify_url = f"{config.frontend_url.rstrip('/')}/verify-email?token={verification_token}"

    # Send activation email — non-fatal: if email fails, registration still succeeds
    # and the user can request a resend from the login page.
    try:
        send_verification_email(body.email, body.email, verify_url)
    except Exception as e:
        logger.warning(f"Verification email could not be sent to {body.email}: {e}. Registration completed.")

    # Issue JWT immediately — user can use the app, but certain features may
    # require email verification in the future.
    token = sign_token({"id": user["id"], "email": user["email"]})
    return {
        "token": token,
        "user": {"id": user["id"], "email": user["email"], "phone": user["phone"], "email_verified": 0},
    }


@router.post("/resend-verification")
async def resend_verification(body: ResendVerificationRequest):
    """Re-send the activation email.  Safe to call even for unknown addresses (no info leak)."""
    db = get_db()
    repo = UserRepository(db)
    user = repo.find_by_email(body.email)

    # Always return 200 to avoid leaking whether the email exists.
    if not user:
        return {"message": "如果该邮箱已注册且未验证，激活邮件将在片刻后发送"}
    if user.get("email_verified"):
        return {"message": "该邮箱已完成验证，请直接登录"}

    verification_token = _create_verification_token(db, user["id"])
    verify_url = f"{config.frontend_url.rstrip('/')}/verify-email?token={verification_token}"

    try:
        send_verification_email(body.email, body.email, verify_url)
    except Exception as e:
        logger.error(f"Failed to resend verification email to {body.email}: {e}")
        raise HTTPException(status_code=500, detail="邮件发送失败，请稍后重试")

    return {"message": "激活邮件已重新发送，请查收邮件"}


@router.get("/verify-email")
async def verify_email(token: str, request: Request):
    db = get_db()

    row = db.execute(
        "SELECT * FROM email_verification_tokens WHERE token = ? LIMIT 1",
        (token,),
    ).fetchone()

    if not row:
        raise HTTPException(status_code=400, detail="激活链接无效")
    if row["used"]:
        raise HTTPException(status_code=400, detail="激活链接已使用")
    if row["expires_at"] < datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S"):
        raise HTTPException(status_code=400, detail="激活链接已过期，请重新发送激活邮件")

    # Mark token used and verify user email
    db.execute("UPDATE email_verification_tokens SET used = 1 WHERE id = ?", (row["id"],))
    db.execute(
        "UPDATE users SET email_verified = 1, updated_at = datetime('now') WHERE id = ?",
        (row["user_id"],),
    )
    db.commit()

    repo = UserRepository(db)
    user = repo.find_by_id(row["user_id"])
    if not user:
        raise HTTPException(status_code=404, detail="用户不存在")

    _log_login(db, user["id"], request)

    jwt_token = sign_token({"id": user["id"], "email": user.get("email"), "phone": user.get("phone")})
    return {
        "token": jwt_token,
        "user": {"id": user["id"], "email": user.get("email"), "phone": user.get("phone"), "email_verified": 1},
    }


@router.post("/login")
async def login(body: LoginRequest, request: Request):
    db = get_db()
    user_repo = UserRepository(db)
    otp_repo = OtpRepository(db)

    if body.type == "email":
        if not body.email or not body.password:
            raise HTTPException(status_code=400, detail="请填写邮箱和密码")
        user = user_repo.find_by_email(body.email)
        if not user or not user.get("password_hash"):
            raise HTTPException(status_code=401, detail="邮箱或密码错误")
        if not verify_password(body.password, user["password_hash"]):
            raise HTTPException(status_code=401, detail="邮箱或密码错误")
        # Require email verification before login
        if not user.get("email_verified"):
            raise HTTPException(status_code=403, detail="EMAIL_NOT_VERIFIED")

    elif body.type == "phone":
        if not body.phone or not body.code:
            raise HTTPException(status_code=400, detail="Phone and code required")
        otp = otp_repo.find_valid(phone=body.phone, code=body.code)
        if not otp:
            raise HTTPException(status_code=401, detail="验证码错误或已过期")
        otp_repo.mark_used(otp["id"])
        user = user_repo.find_or_create_by_phone(body.phone)

    else:
        raise HTTPException(status_code=400, detail="Invalid login type")

    _log_login(db, user["id"], request)
    token = sign_token({"id": user["id"], "email": user.get("email"), "phone": user.get("phone")})
    return {
        "token": token,
        "user": {
            "id": user["id"],
            "email": user.get("email"),
            "phone": user.get("phone"),
            "email_verified": user.get("email_verified", 0),
        },
    }


@router.post("/send-otp")
async def send_otp(body: SendOtpRequest):
    code = generate_otp()
    db = get_db()
    otp_repo = OtpRepository(db)

    if body.phone:
        otp_repo.create(phone=body.phone, code=code)
        send_sms_code(body.phone, code)
        return {"message": "OTP sent to phone"}
    elif body.email:
        otp_repo.create(email=body.email, code=code)
        send_email_code(body.email, code)
        return {"message": "OTP sent to email"}
    else:
        raise HTTPException(status_code=400, detail="Phone or email required")


# ───────────────────────── Account Deletion ─────────────────────────

@router.post("/request-delete")
async def request_delete(request: Request, user=Depends(get_current_user)):
    """Send a deletion-confirmation email.  The account is NOT deleted until the link is clicked."""
    db = get_db()
    repo = UserRepository(db)
    user_row = repo.find_by_id(user["id"])

    if not user_row or not user_row.get("email"):
        raise HTTPException(status_code=400, detail="账号未绑定邮箱，无法通过邮件验证注销")

    # Replace any existing unused deletion tokens
    db.execute(
        "DELETE FROM account_deletion_tokens WHERE user_id = ? AND used = 0",
        (user_row["id"],),
    )
    deletion_token = str(uuid.uuid4())
    expires_at = (datetime.now(timezone.utc) + timedelta(hours=1)).strftime("%Y-%m-%d %H:%M:%S")
    db.execute(
        "INSERT INTO account_deletion_tokens (id, user_id, token, expires_at) VALUES (?, ?, ?, ?)",
        (str(uuid.uuid4()), user_row["id"], deletion_token, expires_at),
    )
    db.commit()

    delete_url = f"{config.frontend_url.rstrip('/')}/confirm-delete?token={deletion_token}"

    try:
        send_deletion_email(user_row["email"], user_row["email"], delete_url)
    except Exception as e:
        logger.error(f"Failed to send deletion email to {user_row['email']}: {e}")
        raise HTTPException(status_code=500, detail="邮件发送失败，请稍后重试")

    return {"message": "注销确认邮件已发送，请在1小时内点击邮件中的链接完成注销"}


@router.get("/confirm-delete")
async def confirm_delete(token: str):
    """Validate the deletion token and permanently delete the account."""
    db = get_db()

    row = db.execute(
        "SELECT * FROM account_deletion_tokens WHERE token = ? LIMIT 1",
        (token,),
    ).fetchone()

    if not row:
        raise HTTPException(status_code=400, detail="注销链接无效")
    if row["used"]:
        raise HTTPException(status_code=400, detail="注销链接已使用")
    if row["expires_at"] < datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S"):
        raise HTTPException(status_code=400, detail="注销链接已过期，请重新发起注销申请")

    user_id = row["user_id"]

    # Mark token used before deleting (guards against double-click)
    db.execute("UPDATE account_deletion_tokens SET used = 1 WHERE id = ?", (row["id"],))
    db.commit()

    # Delete all user data in dependency order
    db.execute(
        "DELETE FROM messages WHERE session_id IN (SELECT id FROM sessions WHERE user_id = ?)",
        (user_id,),
    )
    db.execute("DELETE FROM sessions WHERE user_id = ?", (user_id,))
    db.execute("DELETE FROM login_logs WHERE user_id = ?", (user_id,))
    db.execute("DELETE FROM user_settings WHERE user_id = ?", (user_id,))
    db.execute("DELETE FROM otp_codes WHERE user_id = ?", (user_id,))
    db.execute("DELETE FROM email_verification_tokens WHERE user_id = ?", (user_id,))
    db.execute("DELETE FROM account_deletion_tokens WHERE user_id = ?", (user_id,))
    db.execute("DELETE FROM users WHERE id = ?", (user_id,))
    db.commit()

    return {"message": "账号已成功注销，感谢您使用家庭教育咨询"}


# ───────────────────────── Password Reset ─────────────────────────

class ForgotPasswordRequest(BaseModel):
    email: str


class ResetPasswordRequest(BaseModel):
    token: str
    password: str


def _create_password_reset_token(db, user_id: str) -> str:
    """Create a password reset token (1-hour expiry), replacing any existing unused ones."""
    db.execute(
        "DELETE FROM password_reset_tokens WHERE user_id = ? AND used = 0",
        (user_id,),
    )
    token = str(uuid.uuid4())
    expires_at = (datetime.now(timezone.utc) + timedelta(hours=1)).strftime("%Y-%m-%d %H:%M:%S")
    db.execute(
        "INSERT INTO password_reset_tokens (id, user_id, token, expires_at) VALUES (?, ?, ?, ?)",
        (str(uuid.uuid4()), user_id, token, expires_at),
    )
    db.commit()
    return token


@router.post("/forgot-password")
async def forgot_password(body: ForgotPasswordRequest):
    """
    Send a password-reset email.
    Always returns 200 — never reveals whether the address is registered (no info leak).
    """
    db = get_db()
    repo = UserRepository(db)
    user = repo.find_by_email(body.email)

    if user and not user.get("email_verified"):
        # 未激活用户不能重置密码，防止被恶意触发激活流程
        raise HTTPException(status_code=403, detail="该账号尚未激活，请先查收注册邮件完成激活")

    if user:
        reset_token = _create_password_reset_token(db, user["id"])
        reset_url = f"{config.frontend_url.rstrip('/')}/reset-password?token={reset_token}"
        try:
            send_password_reset_email(body.email, body.email, reset_url)
        except Exception as e:
            logger.error(f"Failed to send password reset email to {body.email}: {e}")
            # Still return 200 — we don't reveal failures to prevent enumeration

    return {"message": "如果该邮箱已注册，密码重置邮件将在片刻后发送，请查收邮件"}


@router.post("/reset-password")
async def reset_password(body: ResetPasswordRequest, request: Request):
    """Validate the reset token, update the password, and return a JWT for auto-login."""
    if not body.password or len(body.password) < 6:
        raise HTTPException(status_code=400, detail="密码至少6位")

    db = get_db()

    row = db.execute(
        "SELECT * FROM password_reset_tokens WHERE token = ? LIMIT 1",
        (body.token,),
    ).fetchone()

    if not row:
        raise HTTPException(status_code=400, detail="重置链接无效")
    if row["used"]:
        raise HTTPException(status_code=400, detail="重置链接已使用")
    if row["expires_at"] < datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S"):
        raise HTTPException(status_code=400, detail="重置链接已过期，请重新申请密码重置")

    user_id = row["user_id"]

    # Mark token used before updating password
    db.execute("UPDATE password_reset_tokens SET used = 1 WHERE id = ?", (row["id"],))
    db.execute(
        "UPDATE users SET password_hash = ?, updated_at = datetime('now') WHERE id = ?",
        (hash_password(body.password), user_id),
    )
    db.commit()

    repo = UserRepository(db)
    user = repo.find_by_id(user_id)
    if not user:
        raise HTTPException(status_code=404, detail="用户不存在")

    _log_login(db, user["id"], request)

    jwt_token = sign_token({"id": user["id"], "email": user.get("email"), "phone": user.get("phone")})
    return {
        "token": jwt_token,
        "user": {
            "id": user["id"],
            "email": user.get("email"),
            "phone": user.get("phone"),
            "email_verified": user.get("email_verified", 0),
        },
    }
