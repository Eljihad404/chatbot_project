from typing import List, Optional, Dict, Any
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from pydantic import BaseModel

from utils.db import get_db
from api.auth_controller import get_current_user, require_admin
from schemas.auth import UserOut
from repositories import chat_repository as repo
from services import chat_service as svc

router = APIRouter()
__all__ = ["router", "init_rag_chain"]

# Startup hook (same signature as before)
async def init_rag_chain():
    return await svc.init_rag_chain()

# -------- Schemas for UI --------
class MessageContent(BaseModel):
    text: str

class MessageOut(BaseModel):
    role: str
    content: List[MessageContent]

class ChatRequest(BaseModel):
    message: str
    chat_id: Optional[str] = None

class NewChatIn(BaseModel):
    title: Optional[str] = "New chat"

class RenameChatIn(BaseModel):
    chat_id: str
    title: str

# -------- Routes (paths unchanged) --------
@router.post("/chat/new")
def create_chat(payload: NewChatIn, user: UserOut = Depends(get_current_user), db: Session = Depends(get_db)):
    c = repo.create_chat(db, user.id, (payload.title or "New chat").strip() or "New chat")
    return {"id": str(c.id), "title": c.title}

@router.post("/chat/rename")
def rename_chat(payload: RenameChatIn, user: UserOut = Depends(get_current_user), db: Session = Depends(get_db)):
    c = repo.get_chat(db, payload.chat_id)
    if not c or c.user_id != user.id:
        raise HTTPException(status_code=404, detail="Chat not found")
    c = repo.rename_chat(db, payload.chat_id, (payload.title or c.title).strip() or c.title)
    return {"id": str(c.id), "title": c.title}

@router.get("/chats")
def list_chats(user: UserOut = Depends(get_current_user), db: Session = Depends(get_db)):
    rows = repo.list_user_chats(db, user.id)
    return [{"id": str(c.id), "title": c.title, "created_at": c.created_at} for c in rows]

@router.get("/chat/{chat_id}")
def get_chat_history(chat_id: str, user: UserOut = Depends(get_current_user), db: Session = Depends(get_db)) -> List[MessageOut]:
    c = repo.get_chat(db, chat_id)
    if not c or c.user_id != user.id:
        raise HTTPException(status_code=404, detail="Chat not found")
    msgs = repo.list_messages(db, chat_id)
    out: List[MessageOut] = []
    for m in msgs:
        role = getattr(m, "role", None) or getattr(m, "sender", "assistant")
        out.append(MessageOut(role=role, content=[MessageContent(text=m.content)]))
    return out

@router.post("/chat/stream")
async def stream_chat(req: ChatRequest, user: UserOut = Depends(get_current_user), db: Session = Depends(get_db)):
    chat_id = svc.ensure_chat_for_user(db, user.id, req.message, req.chat_id)

    # save user message
    repo.insert_message(db, chat_id, "user", req.message)

    answer = svc.run_graph_once(db, user.id, req.message)

    # save assistant message
    repo.insert_message(db, chat_id, "assistant", answer)

    async def gen():
        CHUNK = 512
        for i in range(0, len(answer), CHUNK):
            yield answer[i:i+CHUNK]

    return StreamingResponse(gen(), media_type="text/plain")

# Agent policy endpoints are consolidated under admin_controller to avoid route collisions.
# If you need them here too, we can mirror them — but one definition is safer.
