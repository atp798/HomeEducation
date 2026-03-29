import uuid
import logging
from datetime import datetime, timezone, timedelta
from fastapi import APIRouter, HTTPException, Request, status
from pydantic import BaseModel
from typing import Optional

from config import config
from database import get_db
from repositories.user import UserRepository, OtpRepository
from utils.auth import hash_password, verify_password, sign_token, generate_otp
from services.notify import send_sms_code, send_email_code

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


def _log_login(db, user_id: str, request: Request) -> None:
    ip = request.client.host if request.client else None
    device = request.headers.get("user-agent")
    log_id = str(uuid.uuid4())
    db.execute(
        "INSERT INTO login_logs (id, user_id, ip, device) VALUES (?, ?, ?, ?)",
        (log_id, user_id, ip, device),
    )
    db.commit()


@router.post("/register")
async def register(body: RegisterRequest, request: Request):
    db = get_db()
    repo = UserRepository(db)

    if repo.find_by_email(body.email):
        raise HTTPException(status_code=409, detail="该邮箱已注册")

    user = repo.create(email=body.email, password_hash=hash_password(body.password))

    # Generate email verification token (valid 24 hours)
    verification_token = str(uuid.uuid4())
    expires_at = (datetime.now(timezone.utc) + timedelta(hours=24)).strftime("%Y-%m-%d %H:%M:%S")
    db.execute(
        "INSERT INTO email_verification_tokens (id, user_id, token, expires_at) VALUES (?, ?, ?, ?)",
        (str(uuid.uuid4()), user["id"], verification_token, expires_at),
    )
    db.commit()

    # Build verification URL pointing at the frontend
    frontend_origin = config.cors_origin.rstrip("/")
    verify_url = f"{frontend_origin}/verify-email?token={verification_token}"

    # Mock: log the link; replace with real email send when mail service is ready
    logger.info(f"[Mock Email] Verification link for {body.email}: {verify_url}")

    # Issue JWT immediately — login works without verifying email (per requirements)
    token = sign_token({"id": user["id"], "email": user["email"]})
    return {
        "token": token,
        "user": {"id": user["id"], "email": user["email"], "phone": user["phone"], "email_verified": 0},
        # Mock only — remove when real email service is configured
        "verifyUrl": verify_url,
        "verificationToken": verification_token,
    }


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
        raise HTTPException(status_code=400, detail="激活链接已过期，请重新注册或申请新链接")

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
            raise HTTPException(status_code=400, detail="Email and password required")
        user = user_repo.find_by_email(body.email)
        if not user or not user.get("password_hash"):
            raise HTTPException(status_code=401, detail="Invalid credentials")
        if not verify_password(body.password, user["password_hash"]):
            raise HTTPException(status_code=401, detail="Invalid credentials")

    elif body.type == "phone":
        if not body.phone or not body.code:
            raise HTTPException(status_code=400, detail="Phone and code required")
        otp = otp_repo.find_valid(phone=body.phone, code=body.code)
        if not otp:
            raise HTTPException(status_code=401, detail="Invalid or expired OTP")
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
