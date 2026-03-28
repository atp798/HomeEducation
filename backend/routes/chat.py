import json
import asyncio
from fastapi import APIRouter, HTTPException, Depends, Request
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from typing import Optional, AsyncGenerator

from database import get_db
from dependencies import get_current_user
from repositories.session import SessionRepository
from repositories.message import MessageRepository
from services.ai import stream_chat_sse

router = APIRouter(prefix="/chat", tags=["chat"])


class CreateSessionRequest(BaseModel):
    title: Optional[str] = "新咨询"


class UpdateSessionRequest(BaseModel):
    title: Optional[str] = None
    archived: Optional[int] = None  # frontend sends 0/1


class StreamMessageRequest(BaseModel):
    # frontend sends camelCase sessionId
    sessionId: Optional[str] = None
    session_id: Optional[str] = None
    content: str

    def get_session_id(self) -> str:
        return self.sessionId or self.session_id or ""


@router.post("/sessions")
async def create_session(body: CreateSessionRequest, user=Depends(get_current_user)):
    db = get_db()
    repo = SessionRepository(db)
    session = repo.create(user_id=user["id"], title=body.title or "新咨询")
    # Frontend expects { sessionId, title, session }
    return {"sessionId": session["id"], "title": session["title"], "session": session}


@router.get("/sessions")
async def list_sessions(filter: Optional[str] = None, user=Depends(get_current_user)):
    db = get_db()
    repo = SessionRepository(db)
    msg_repo = MessageRepository(db)
    sessions = repo.find_by_user_id(user["id"], filter=filter)

    # Attach lastMessage and messageCount for frontend SessionWithPreview type
    result = []
    for s in sessions:
        msgs = msg_repo.find_by_session_id(s["id"], page=1, size=1)
        # get actual last message
        last_rows = db.execute(
            "SELECT * FROM messages WHERE session_id = ? ORDER BY created_at DESC LIMIT 1",
            (s["id"],)
        ).fetchall()
        last_msg = dict(last_rows[0]) if last_rows else None
        count = msg_repo.count_by_session_id(s["id"])
        result.append({**s, "lastMessage": last_msg, "messageCount": count})

    return result


@router.get("/sessions/{session_id}/history")
async def get_history(session_id: str, page: int = 1, size: int = 50, user=Depends(get_current_user)):
    db = get_db()
    session_repo = SessionRepository(db)
    session = session_repo.find_by_id(session_id)
    if not session or session["user_id"] != user["id"]:
        raise HTTPException(status_code=404, detail="Session not found")

    msg_repo = MessageRepository(db)
    messages = msg_repo.find_by_session_id(session_id, page=page, size=size)
    total = msg_repo.count_by_session_id(session_id)
    return {"messages": messages, "total": total, "page": page, "size": size}


@router.delete("/sessions/{session_id}")
async def delete_session(session_id: str, user=Depends(get_current_user)):
    db = get_db()
    repo = SessionRepository(db)
    session = repo.find_by_id(session_id)
    if not session or session["user_id"] != user["id"]:
        raise HTTPException(status_code=404, detail="Session not found")
    repo.delete(session_id)
    return {"success": True}


@router.patch("/sessions/{session_id}")
async def update_session(session_id: str, body: UpdateSessionRequest, user=Depends(get_current_user)):
    db = get_db()
    repo = SessionRepository(db)
    session = repo.find_by_id(session_id)
    if not session or session["user_id"] != user["id"]:
        raise HTTPException(status_code=404, detail="Session not found")

    updates = {}
    if body.title is not None:
        updates["title"] = body.title
    if body.archived is not None:
        updates["archived"] = body.archived  # already 0/1 from frontend

    updated = repo.update(session_id, **updates)
    return updated


@router.post("/messages/stream")
async def stream_message(body: StreamMessageRequest, request: Request, user=Depends(get_current_user)):
    db = get_db()
    session_repo = SessionRepository(db)
    msg_repo = MessageRepository(db)

    sid = body.get_session_id()
    session = session_repo.find_by_id(sid)
    if not session or session["user_id"] != user["id"]:
        raise HTTPException(status_code=404, detail="Session not found")

    # Save user message
    msg_repo.create(sid, "user", body.content)

    # Build message history for context
    all_messages = msg_repo.find_by_session_id(sid, size=50)
    chat_messages = [{"role": m["role"], "content": m["content"]} for m in all_messages]

    # Accumulate full AI response for saving even if client disconnects
    full_response = []

    async def generate() -> AsyncGenerator[str, None]:
        async for chunk in stream_chat_sse(chat_messages):
            # Parse chunk to accumulate text
            if chunk.startswith("data: "):
                try:
                    data = json.loads(chunk[6:])
                    if data.get("text"):
                        full_response.append(data["text"])
                except Exception:
                    pass
            yield chunk

        # Save AI response to DB after streaming completes
        response_text = "".join(full_response)
        if response_text:
            msg_repo.create(sid, "assistant", response_text)
            # Auto-title session if still default
            if session["title"] == "新咨询":
                auto_title = body.content[:20] + ("…" if len(body.content) > 20 else "")
                session_repo.update(sid, title=auto_title)

    return StreamingResponse(
        generate(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
            "Connection": "keep-alive",
        },
    )
