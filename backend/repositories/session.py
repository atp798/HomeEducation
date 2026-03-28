import uuid
import sqlite3
from typing import Optional, List


def _row(row) -> Optional[dict]:
    return dict(row) if row else None


def _rows(rows) -> List[dict]:
    return [dict(r) for r in rows]


class SessionRepository:
    def __init__(self, db: sqlite3.Connection):
        self.db = db

    def find_by_user_id(self, user_id: str, filter: Optional[str] = None) -> List[dict]:
        """
        Find sessions sorted by the last message time (not session updated_at).
        filter: 'today' | 'week' | 'all' | None  (None = all)
        """
        date_filter = ""
        if filter == "today":
            date_filter = "AND date(lm.last_at) = date('now')"
        elif filter == "week":
            date_filter = "AND lm.last_at >= datetime('now', '-7 days')"

        sql = f"""
            SELECT s.*
            FROM sessions s
            JOIN (
                SELECT session_id, MAX(created_at) AS last_at
                FROM messages
                GROUP BY session_id
            ) lm ON lm.session_id = s.id
            WHERE s.user_id = ?
            {date_filter}
            ORDER BY lm.last_at DESC
        """
        rows = self.db.execute(sql, (user_id,)).fetchall()
        return _rows(rows)

    def find_by_id(self, session_id: str) -> Optional[dict]:
        row = self.db.execute("SELECT * FROM sessions WHERE id = ?", (session_id,)).fetchone()
        return _row(row)

    def create(self, user_id: str, title: str = "新咨询") -> dict:
        session_id = str(uuid.uuid4())
        self.db.execute(
            "INSERT INTO sessions (id, user_id, title) VALUES (?, ?, ?)",
            (session_id, user_id, title),
        )
        self.db.commit()
        return self.find_by_id(session_id)

    def update(self, session_id: str, **fields) -> Optional[dict]:
        if not fields:
            return self.find_by_id(session_id)
        set_parts = ", ".join(f"{k} = ?" for k in fields)
        values = list(fields.values()) + [session_id]
        self.db.execute(
            f"UPDATE sessions SET {set_parts}, updated_at = datetime('now') WHERE id = ?",
            values,
        )
        self.db.commit()
        return self.find_by_id(session_id)

    def delete(self, session_id: str) -> None:
        self.db.execute("DELETE FROM messages WHERE session_id = ?", (session_id,))
        self.db.execute("DELETE FROM sessions WHERE id = ?", (session_id,))
        self.db.commit()
