from typing import List, Optional
from sqlalchemy.orm import Session
from sqlalchemy.sql import func
from utils.models import Chat as ChatModel, Message as MessageModel

def create_chat(db: Session, user_id, title: str) -> ChatModel:
    c = ChatModel(user_id=user_id, title=title)
    db.add(c); db.commit(); db.refresh(c)
    return c

def get_chat(db: Session, chat_id: str) -> Optional[ChatModel]:
    return db.get(ChatModel, chat_id)

def rename_chat(db: Session, chat_id: str, title: str) -> Optional[ChatModel]:
    c = db.get(ChatModel, chat_id)
    if not c: return None
    c.title = title
    db.commit(); db.refresh(c)
    return c

def list_user_chats(db: Session, user_id) -> List[ChatModel]:
    return db.query(ChatModel).filter(ChatModel.user_id == user_id).order_by(ChatModel.created_at.desc()).all()

def list_messages(db: Session, chat_id: str) -> List[MessageModel]:
    return db.query(MessageModel).filter(MessageModel.chat_id == chat_id).order_by(MessageModel.created_at.asc()).all()

def insert_message(db: Session, chat_id: str, role: str, content: str) -> MessageModel:
    m = MessageModel(chat_id=chat_id, content=content)
    if hasattr(m, "role"): m.role = role
    else: m.sender = role
    db.add(m); db.commit(); db.refresh(m)
    return m
