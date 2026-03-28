import uuid
from datetime import datetime, timezone, timedelta
from fastapi import APIRouter, HTTPException, Request, status
from pydantic import BaseModel
from typing import Optional

from database import get_db
from repositories.user import UserRepository, OtpRepository
from utils.auth import hash_password, verify_password, sign_token, generate_otp
from services.notify import send_sms_code, send_email_code

router = APIRouter(prefix="/auth", tags=["auth"])


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
async def register(body: RegisterRequest):
    db = get_db()
    repo = UserRepository(db)

    if repo.find_by_email(body.email):
        raise HTTPException(status_code=400, detail="Email already registered")

    user = repo.create(email=body.email, password_hash=hash_password(body.password))
    token = sign_token({"id": user["id"], "email": user["email"]})
    return {
        "token": token,
        "user": {"id": user["id"], "email": user["email"], "phone": user["phone"]},
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
        "user": {"id": user["id"], "email": user.get("email"), "phone": user.get("phone")},
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
