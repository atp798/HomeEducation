import uuid
import sqlite3
from datetime import datetime, timezone, timedelta
from typing import Optional


def _row(row) -> Optional[dict]:
    return dict(row) if row else None


class UserRepository:
    def __init__(self, db: sqlite3.Connection):
        self.db = db

    def find_by_id(self, user_id: str) -> Optional[dict]:
        row = self.db.execute("SELECT * FROM users WHERE id = ?", (user_id,)).fetchone()
        return _row(row)

    def find_by_email(self, email: str) -> Optional[dict]:
        row = self.db.execute("SELECT * FROM users WHERE email = ?", (email,)).fetchone()
        return _row(row)

    def find_by_phone(self, phone: str) -> Optional[dict]:
        row = self.db.execute("SELECT * FROM users WHERE phone = ?", (phone,)).fetchone()
        return _row(row)

    def create(self, email: Optional[str] = None, phone: Optional[str] = None, password_hash: Optional[str] = None) -> dict:
        user_id = str(uuid.uuid4())
        self.db.execute(
            "INSERT INTO users (id, email, phone, password_hash) VALUES (?, ?, ?, ?)",
            (user_id, email, phone, password_hash),
        )
        # create default settings
        self.db.execute(
            "INSERT OR IGNORE INTO user_settings (user_id) VALUES (?)",
            (user_id,),
        )
        self.db.commit()
        return self.find_by_id(user_id)

    def find_or_create_by_phone(self, phone: str) -> dict:
        user = self.find_by_phone(phone)
        if user:
            return user
        return self.create(phone=phone)

    def update(self, user_id: str, **fields) -> Optional[dict]:
        if not fields:
            return self.find_by_id(user_id)
        set_parts = ", ".join(f"{k} = ?" for k in fields)
        values = list(fields.values()) + [user_id]
        self.db.execute(
            f"UPDATE users SET {set_parts}, updated_at = datetime('now') WHERE id = ?",
            values,
        )
        self.db.commit()
        return self.find_by_id(user_id)


class OtpRepository:
    def __init__(self, db: sqlite3.Connection):
        self.db = db

    def create(self, phone: Optional[str] = None, email: Optional[str] = None, code: str = "", user_id: Optional[str] = None) -> dict:
        otp_id = str(uuid.uuid4())
        expires_at = (datetime.now(timezone.utc) + timedelta(minutes=5)).strftime("%Y-%m-%d %H:%M:%S")
        self.db.execute(
            "INSERT INTO otp_codes (id, user_id, phone, email, code, expires_at) VALUES (?, ?, ?, ?, ?, ?)",
            (otp_id, user_id, phone, email, code, expires_at),
        )
        self.db.commit()
        row = self.db.execute("SELECT * FROM otp_codes WHERE id = ?", (otp_id,)).fetchone()
        return dict(row)

    def find_valid(self, phone: Optional[str] = None, email: Optional[str] = None, code: str = "") -> Optional[dict]:
        if phone:
            row = self.db.execute(
                "SELECT * FROM otp_codes WHERE phone = ? AND code = ? AND used = 0 AND expires_at > datetime('now') ORDER BY created_at DESC LIMIT 1",
                (phone, code),
            ).fetchone()
        else:
            row = self.db.execute(
                "SELECT * FROM otp_codes WHERE email = ? AND code = ? AND used = 0 AND expires_at > datetime('now') ORDER BY created_at DESC LIMIT 1",
                (email, code),
            ).fetchone()
        return _row(row)

    def mark_used(self, otp_id: str) -> None:
        self.db.execute("UPDATE otp_codes SET used = 1 WHERE id = ?", (otp_id,))
        self.db.commit()
