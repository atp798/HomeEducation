import uuid
import sqlite3
from typing import Optional, List


def _row(row) -> Optional[dict]:
    return dict(row) if row else None


def _rows(rows) -> List[dict]:
    return [dict(r) for r in rows]


class MessageRepository:
    def __init__(self, db: sqlite3.Connection):
        self.db = db

    def find_by_session_id(self, session_id: str, page: int = 1, size: int = 50) -> List[dict]:
        offset = (page - 1) * size
        rows = self.db.execute(
            "SELECT * FROM messages WHERE session_id = ? ORDER BY created_at ASC LIMIT ? OFFSET ?",
            (session_id, size, offset),
        ).fetchall()
        return _rows(rows)

    def count_by_session_id(self, session_id: str) -> int:
        row = self.db.execute(
            "SELECT COUNT(*) AS cnt FROM messages WHERE session_id = ?", (session_id,)
        ).fetchone()
        return row["cnt"] if row else 0

    def create(self, session_id: str, role: str, content: str) -> dict:
        msg_id = str(uuid.uuid4())
        self.db.execute(
            "INSERT INTO messages (id, session_id, role, content) VALUES (?, ?, ?, ?)",
            (msg_id, session_id, role, content),
        )
        self.db.commit()
        row = self.db.execute("SELECT * FROM messages WHERE id = ?", (msg_id,)).fetchone()
        return _row(row)
