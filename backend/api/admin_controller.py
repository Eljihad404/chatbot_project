from typing import List, Dict, Optional, Any
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from utils.db import get_db
from api.auth_controller import require_admin
from services import admin_service
from schemas.auth import UserOut  # only for type hints if needed
from pydantic import BaseModel, Field, EmailStr

router = APIRouter(prefix="/admin", tags=["admin"])

# -------- Dashboard --------
@router.get("/metrics", dependencies=[Depends(require_admin)])
def metrics(db: Session = Depends(get_db)) -> Dict[str, int]:
    return admin_service.metrics(db)

@router.get("/token-usage", dependencies=[Depends(require_admin)])
def token_usage(db: Session = Depends(get_db)) -> List[Dict[str, int]]:
    return admin_service.token_usage(db)

# -------- Users --------
class UserRow(BaseModel):
    id: str
    username: str
    email: str
    is_active: bool
    roles: List[str]
    created_at: Optional[datetime]
    last_login: Optional[datetime]

@router.get("/users", response_model=List[UserRow], dependencies=[Depends(require_admin)])
def list_users(db: Session = Depends(get_db), q: Optional[str] = None):
    return admin_service.list_users(db, q)

class UserUpdate(BaseModel):
    username: Optional[str] = Field(default=None, min_length=1)
    email: Optional[EmailStr] = None
    is_active: Optional[bool] = None
    roles: Optional[List[str]] = None

@router.patch("/users/{user_id}", dependencies=[Depends(require_admin)])
def update_user(user_id: str, payload: UserUpdate, db: Session = Depends(get_db)):
    return admin_service.update_user(db, user_id, payload)

# -------- Chat console --------
class ChatRow(BaseModel):
    id: str
    title: str
    created_at: Optional[datetime]

@router.get("/users/{user_id}/chats", response_model=List[ChatRow], dependencies=[Depends(require_admin)])
def user_chats(user_id: str, db: Session = Depends(get_db)):
    return admin_service.user_chats(db, user_id)

class AdminMessage(BaseModel):
    text: str
    role: str

class AdminMsgRow(BaseModel):
    id: str
    role: str
    text: str
    created_at: datetime

@router.get("/chats/{chat_id}/messages", response_model=List[AdminMsgRow],
            dependencies=[Depends(require_admin)])
def chat_messages(chat_id: str, db: Session = Depends(get_db), limit: int = 500):
    return admin_service.chat_messages(db, chat_id, limit)

@router.post("/chats/{chat_id}/reply", dependencies=[Depends(require_admin)])
def admin_reply(chat_id: str, payload: AdminMessage, db: Session = Depends(get_db)):
    return admin_service.admin_reply(db, chat_id, payload)

@router.patch("/chats/{chat_id}/messages/{message_id}", dependencies=[Depends(require_admin)])
def admin_edit_message(chat_id: str, message_id: str, payload: AdminMessage, db: Session = Depends(get_db)):
    return admin_service.admin_edit_message(db, chat_id, message_id, payload)

@router.delete("/chats/{chat_id}/messages/{message_id}", dependencies=[Depends(require_admin)])
def admin_delete_message(chat_id: str, message_id: str, db: Session = Depends(get_db)):
    return admin_service.admin_delete_message(db, chat_id, message_id)

# -------- Logs (paged) + CSV export --------
class ActivityOut(BaseModel):
    id: int
    user_id: Optional[str] = None
    activity: str
    level: Optional[str] = None
    occurred_at: datetime
    metadata: Optional[Dict[str, Any]] = None

class PagedActivities(BaseModel):
    total: int
    items: List[ActivityOut]

@router.get("/logs", response_model=PagedActivities, dependencies=[Depends(require_admin)])
def list_logs(
    db: Session = Depends(get_db),
    limit: int = 25,
    offset: int = 0,
    q: Optional[str] = None,
    level: Optional[str] = None,
    user_id: Optional[str] = None,
    date_from: Optional[datetime] = None,
    date_to: Optional[datetime] = None,
):
    return admin_service.list_logs(db, limit, offset, q, level, user_id, date_from, date_to)

@router.get("/logs/export", dependencies=[Depends(require_admin)])
def export_logs_csv(
    db: Session = Depends(get_db),
    q: Optional[str] = None,
    level: Optional[str] = None,
    user_id: Optional[str] = None,
    date_from: Optional[datetime] = None,
    date_to: Optional[datetime] = None,
):
    gen = admin_service.export_logs_csv(db, q, level, user_id, date_from, date_to)
    return StreamingResponse(gen, media_type="text/csv",
                             headers={"Content-Disposition": "attachment; filename=logs.csv"})

class BulkDelete(BaseModel):
    ids: List[int]

@router.delete("/logs/{log_id}", dependencies=[Depends(require_admin)])
def delete_log(log_id: int, db: Session = Depends(get_db)):
    return admin_service.delete_log(db, log_id)

@router.post("/logs/bulk-delete", dependencies=[Depends(require_admin)])
def bulk_delete_logs(payload: BulkDelete, db: Session = Depends(get_db)):
    return admin_service.bulk_delete_logs(db, payload.ids or [])

# -------- Settings --------
class AdminSettings(BaseModel):
    access_token_ttl_min: int = Field(120, ge=5, le=1440)
    smtp_host: str = ""
    smtp_port: int = Field(587, ge=1, le=65535)
    smtp_user: str = ""
    smtp_from: str = ""
    reset_code_ttl_min: int = Field(10, ge=1, le=120)
    reset_max_attempts: int = Field(5, ge=1, le=20)

@router.get("/settings", response_model=AdminSettings, dependencies=[Depends(require_admin)])
def get_admin_settings(db: Session = Depends(get_db)) -> AdminSettings:
    return admin_service.get_admin_settings(db)

@router.patch("/settings", response_model=AdminSettings, dependencies=[Depends(require_admin)])
def update_admin_settings(payload: AdminSettings, db: Session = Depends(get_db)) -> AdminSettings:
    return admin_service.update_admin_settings(db, payload)

# -------- Agent policies (moved here; single source of truth) --------
from pydantic import BaseModel

class AgentCfg(BaseModel):
    enabled: bool = True
    roles: List[str] = Field(default_factory=lambda: ["admin", "user"])

class AgentPolicies(BaseModel):
    router: AgentCfg = AgentCfg(enabled=True, roles=["admin", "user"])
    rag: AgentCfg = AgentCfg(enabled=True, roles=["admin", "user"])
    summarize: AgentCfg = AgentCfg(enabled=True, roles=["admin", "user"])
    code: AgentCfg = AgentCfg(enabled=False, roles=["admin"])
    admin: AgentCfg = AgentCfg(enabled=True, roles=["admin"])
    llm: AgentCfg = AgentCfg(enabled=True, roles=["admin", "user"])

@router.get("/agent-policies", dependencies=[Depends(require_admin)])
def get_agent_policies_admin(db: Session = Depends(get_db)) -> Dict[str, Any]:
    return admin_service.get_agent_policies(db)

@router.put("/agent-policies", dependencies=[Depends(require_admin)])
def put_agent_policies_admin(payload: AgentPolicies, db: Session = Depends(get_db)) -> Dict[str, Any]:
    return admin_service.put_agent_policies(db, payload.model_dump())
