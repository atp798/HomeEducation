from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import Optional

from database import get_db
from dependencies import get_current_user
from repositories.user import UserRepository
from utils.auth import hash_password, verify_password

router = APIRouter(prefix="/settings", tags=["settings"])


class UpdateSettingsRequest(BaseModel):
    theme: Optional[str] = None
    language: Optional[str] = None
    notification_ai_reply: Optional[bool] = None
    notification_new_session: Optional[bool] = None
    dnd_start: Optional[str] = None
    dnd_end: Optional[str] = None


class ChangePasswordRequest(BaseModel):
    # frontend sends camelCase
    oldPassword: Optional[str] = None
    newPassword: Optional[str] = None
    # also accept snake_case for direct API calls
    old_password: Optional[str] = None
    new_password: Optional[str] = None

    def get_old(self) -> str:
        return self.oldPassword or self.old_password or ""

    def get_new(self) -> str:
        return self.newPassword or self.new_password or ""


class BindEmailRequest(BaseModel):
    email: str
    code: Optional[str] = None


class BindPhoneRequest(BaseModel):
    phone: str
    code: str


def _ensure_settings(db, user_id: str) -> None:
    db.execute("INSERT OR IGNORE INTO user_settings (user_id) VALUES (?)", (user_id,))
    db.commit()


@router.get("")
async def get_settings(user=Depends(get_current_user)):
    db = get_db()
    _ensure_settings(db, user["id"])
    user_row = db.execute("SELECT id, email, phone, created_at FROM users WHERE id = ?", (user["id"],)).fetchone()
    settings_row = db.execute("SELECT * FROM user_settings WHERE user_id = ?", (user["id"],)).fetchone()
    return {
        "user": dict(user_row) if user_row else None,
        "settings": dict(settings_row) if settings_row else None,
    }


@router.put("")
async def update_settings(body: UpdateSettingsRequest, user=Depends(get_current_user)):
    db = get_db()
    _ensure_settings(db, user["id"])

    updates = {}
    if body.theme is not None:
        updates["theme"] = body.theme
    if body.language is not None:
        updates["language"] = body.language
    if body.notification_ai_reply is not None:
        updates["notification_ai_reply"] = 1 if body.notification_ai_reply else 0
    if body.notification_new_session is not None:
        updates["notification_new_session"] = 1 if body.notification_new_session else 0
    if body.dnd_start is not None:
        updates["dnd_start"] = body.dnd_start
    if body.dnd_end is not None:
        updates["dnd_end"] = body.dnd_end

    if updates:
        set_parts = ", ".join(f"{k} = ?" for k in updates)
        values = list(updates.values()) + [user["id"]]
        db.execute(
            f"UPDATE user_settings SET {set_parts}, updated_at = datetime('now') WHERE user_id = ?",
            values,
        )
        db.commit()

    row = db.execute("SELECT * FROM user_settings WHERE user_id = ?", (user["id"],)).fetchone()
    return dict(row) if row else {}


@router.get("/login-logs")
async def get_login_logs(user=Depends(get_current_user)):
    db = get_db()
    rows = db.execute(
        "SELECT * FROM login_logs WHERE user_id = ? AND created_at >= datetime('now', '-30 days') ORDER BY created_at DESC",
        (user["id"],),
    ).fetchall()
    return [dict(r) for r in rows]


@router.put("/password")
async def change_password(body: ChangePasswordRequest, user=Depends(get_current_user)):
    db = get_db()
    repo = UserRepository(db)
    user_row = repo.find_by_id(user["id"])
    if not user_row or not user_row.get("password_hash"):
        raise HTTPException(status_code=400, detail="No password set for this account")
    if not verify_password(body.get_old(), user_row["password_hash"]):
        raise HTTPException(status_code=401, detail="Old password is incorrect")
    repo.update(user["id"], password_hash=hash_password(body.get_new()))
    return {"success": True}


@router.post("/bind-email")
async def bind_email(body: BindEmailRequest, user=Depends(get_current_user)):
    db = get_db()
    repo = UserRepository(db)
    if repo.find_by_email(body.email):
        raise HTTPException(status_code=400, detail="Email already in use")
    repo.update(user["id"], email=body.email)
    return {"success": True}


@router.post("/bind-phone")
async def bind_phone(body: BindPhoneRequest, user=Depends(get_current_user)):
    db = get_db()
    from repositories.user import OtpRepository
    otp_repo = OtpRepository(db)
    otp = otp_repo.find_valid(phone=body.phone, code=body.code)
    if not otp:
        raise HTTPException(status_code=401, detail="Invalid or expired OTP")
    otp_repo.mark_used(otp["id"])

    repo = UserRepository(db)
    if repo.find_by_phone(body.phone):
        raise HTTPException(status_code=400, detail="Phone already in use")
    repo.update(user["id"], phone=body.phone)
    return {"success": True}
