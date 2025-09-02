from typing import List, Dict, Optional, Any
from datetime import datetime, timedelta, timezone
import json
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
from sqlalchemy.sql import func
from sqlalchemy import or_, cast, String

from utils.models import User, Role, UserRole, Chat, Message, File, Activity, ConfigKV, Setting

# ---------- Dashboard ----------
def metrics(db: Session) -> Dict[str, int]:
    users_cnt = db.query(func.count(User.id)).scalar() or 0
    chats_cnt = db.query(func.count(Chat.id)).scalar() or 0
    docs_cnt  = db.query(func.count(File.id)).scalar() or 0
    db_tokens = (db.query(func.coalesce(func.sum(func.length(Message.content)), 0)).scalar() or 0) // 4
    return {"Users": users_cnt, "Chats": chats_cnt, "Tokens": int(db_tokens), "Docs": docs_cnt}

def token_usage(db: Session) -> List[Dict[str, int]]:
    since = datetime.now(timezone.utc) - timedelta(days=7)
    rows = (
        db.query(
            func.date_trunc('day', Message.created_at).label("d"),
            (func.sum(func.length(Message.content)) / 4.0).label("tok"),
        )
        .filter(Message.created_at >= since)
        .group_by(func.date_trunc('day', Message.created_at))
        .order_by(func.date_trunc('day', Message.created_at))
        .all()
    )
    today = datetime.now(timezone.utc).date()
    series = {(today - timedelta(days=i)).strftime("%a"): 0 for i in range(6, -1, -1)}
    for d, tok in rows:
        series[d.date().strftime("%a")] = int(tok or 0)
    return [{"day": k, "tokens": v} for k, v in series.items()]

# ---------- Users ----------
def list_users(db: Session, q: Optional[str]) -> List[Dict[str, Any]]:
    query = db.query(User)
    if q:
        like = f"%{q}%"
        query = query.filter((User.username.ilike(like)) | (User.email.ilike(like)))
    users = query.order_by(User.created_at.desc()).all()

    roles_map: Dict[str, List[str]] = {}
    if users:
        ids = [u.id for u in users]
        rows = (
            db.query(UserRole.user_id, Role.name)
              .join(Role, Role.role_id == UserRole.role_id)
              .filter(UserRole.user_id.in_(ids))
              .all()
        )
        for uid, rname in rows:
            roles_map.setdefault(str(uid), []).append(rname)

    return [
        dict(
            id=str(u.id),
            username=u.username,
            email=u.email,
            is_active=u.is_active,
            roles=roles_map.get(str(u.id), []),
            created_at=u.created_at,
            last_login=u.last_login,
        ) for u in users
    ]

def update_user(db: Session, user_id: str, payload) -> Dict[str, bool]:
    user = db.get(User, user_id)
    if not user:
        from fastapi import HTTPException
        raise HTTPException(404, "User not found")

    if payload.username is not None and payload.username != user.username:
        exists = db.query(User).filter(User.username == payload.username, User.id != user.id).first()
        if exists:
            from fastapi import HTTPException
            raise HTTPException(409, "Username already in use")
        user.username = payload.username

    if payload.email is not None and payload.email != user.email:
        exists = db.query(User).filter(User.email == payload.email, User.id != user.id).first()
        if exists:
            from fastapi import HTTPException
            raise HTTPException(409, "Email already in use")
        user.email = payload.email

    if payload.is_active is not None:
        user.is_active = payload.is_active

    if payload.roles is not None:
        db.query(UserRole).filter(UserRole.user_id == user.id).delete()
        for rname in payload.roles:
            role = db.query(Role).filter_by(name=rname).first()
            if not role:
                role = Role(name=rname, description=f"{rname} role")
                db.add(role); db.commit(); db.refresh(role)
            db.add(UserRole(user_id=user.id, role_id=role.role_id))

    try:
        db.commit()
        db.refresh(user)
    except IntegrityError:
        db.rollback()
        from fastapi import HTTPException
        raise HTTPException(409, "Username or email already in use")

    return {"ok": True}

# ---------- Chat console ----------
def user_chats(db: Session, user_id: str) -> List[Dict[str, Any]]:
    rows = db.query(Chat).filter(Chat.user_id == user_id).order_by(Chat.created_at.desc()).all()
    return [{"id": str(c.id), "title": c.title, "created_at": c.created_at} for c in rows]

def chat_messages(db: Session, chat_id: str, limit: int) -> List[Dict[str, Any]]:
    rows = (
        db.query(Message)
          .filter(Message.chat_id == chat_id)
          .order_by(Message.created_at.asc())
          .limit(limit)
          .all()
    )
    return [{"id": str(m.id), "role": m.sender, "text": m.content, "created_at": m.created_at} for m in rows]

def admin_reply(db: Session, chat_id: str, payload) -> Dict[str, bool]:
    chat = db.get(Chat, chat_id)
    if not chat:
        from fastapi import HTTPException
        raise HTTPException(404, "Chat not found")
    role = (payload.role or "assistant").strip().lower()
    if role not in ("user", "assistant"):
        role = "assistant"
    db.add(Message(chat_id=chat_id, sender=role, content=payload.text))
    db.commit()
    return {"ok": True}

def admin_edit_message(db: Session, chat_id: str, message_id: str, payload) -> Dict[str, bool]:
    msg = db.get(Message, message_id)
    if not msg or str(msg.chat_id) != str(chat_id):
        from fastapi import HTTPException
        raise HTTPException(404, "Message not found")
    if msg.sender != "assistant":
        from fastapi import HTTPException
        raise HTTPException(400, "Only assistant messages can be edited")
    msg.content = payload.text
    db.commit()
    return {"ok": True}

def admin_delete_message(db: Session, chat_id: str, message_id: str) -> Dict[str, bool]:
    msg = db.get(Message, message_id)
    if not msg or str(msg.chat_id) != str(chat_id):
        from fastapi import HTTPException
        raise HTTPException(404, "Message not found")
    if msg.sender != "assistant":
        from fastapi import HTTPException
        raise HTTPException(400, "Only assistant messages can be deleted")
    db.delete(msg); db.commit()
    return {"ok": True}

# ---------- Logs ----------
def list_logs(
    db: Session,
    limit: int, offset: int,
    q: Optional[str], level: Optional[str], user_id: Optional[str],
    date_from: Optional[datetime], date_to: Optional[datetime],
) -> Dict[str, Any]:
    qry = db.query(Activity)
    if q:
        qry = qry.filter(or_(Activity.activity.ilike(f"%{q}%"),
                             cast(Activity.metadata, String).ilike(f"%{q}%")))
    if level:
        qry = qry.filter(Activity.level == level)
    if user_id:
        qry = qry.filter(Activity.user_id == user_id)
    if date_from:
        qry = qry.filter(Activity.occurred_at >= date_from)
    if date_to:
        qry = qry.filter(Activity.occurred_at <= date_to)

    total = qry.count()
    rows = qry.order_by(Activity.occurred_at.desc()).offset(offset).limit(limit).all()

    def to_out(r) -> Dict[str, Any]:
        md = r.metadata if isinstance(r.metadata, dict) else None
        return dict(
            id=r.id,
            user_id=str(r.user_id) if getattr(r, "user_id", None) else None,
            activity=r.activity,
            level=getattr(r, "level", None),
            occurred_at=r.occurred_at,
            metadata=md,
        )

    return {"total": total, "items": [to_out(r) for r in rows]}

def export_logs_csv(
    db: Session,
    q: Optional[str], level: Optional[str], user_id: Optional[str],
    date_from: Optional[datetime], date_to: Optional[datetime],
):
    qry = db.query(Activity)
    if q:
        qry = qry.filter(or_(Activity.activity.ilike(f"%{q}%"),
                             cast(Activity.metadata, String).ilike(f"%{q}%")))
    if level:
        qry = qry.filter(Activity.level == level)
    if user_id:
        qry = qry.filter(Activity.user_id == user_id)
    if date_from:
        qry = qry.filter(Activity.occurred_at >= date_from)
    if date_to:
        qry = qry.filter(Activity.occurred_at <= date_to)
    rows = qry.order_by(Activity.occurred_at.desc()).all()

    def iter_csv():
        import csv, io
        output = io.StringIO()
        writer = csv.writer(output)
        writer.writerow(["id","occurred_at","level","user_id","activity","metadata"])
        yield output.getvalue(); output.seek(0); output.truncate(0)
        for r in rows:
            writer.writerow([
                r.id,
                r.occurred_at.isoformat(),
                getattr(r, "level", ""),
                str(getattr(r, "user_id", "") or ""),
                r.activity,
                json.dumps(r.metadata or {}),
            ])
            yield output.getvalue(); output.seek(0); output.truncate(0)
    return iter_csv()

def delete_log(db: Session, log_id: int) -> Dict[str, bool]:
    r = db.query(Activity).filter(Activity.id == log_id).first()
    if not r:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Log not found")
    db.delete(r); db.commit()
    return {"ok": True}

def bulk_delete_logs(db: Session, ids: List[int]) -> Dict[str, int]:
    if not ids:
        return {"deleted": 0}
    deleted = db.query(Activity).filter(Activity.id.in_(ids)).delete(synchronize_session=False)
    db.commit()
    return {"deleted": deleted}

# ---------- Settings ----------
class _AdminSettingsModel:
    # façade around pydantic model used in controller
    pass

def _default_settings_from_env() -> Dict[str, Any]:
    import os
    return dict(
        access_token_ttl_min=int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", 120)),
        smtp_host=os.getenv("SMTP_HOST", ""),
        smtp_port=int(os.getenv("SMTP_PORT", 587)),
        smtp_user=os.getenv("SMTP_USER", ""),
        smtp_from=os.getenv("SMTP_FROM", ""),
        reset_code_ttl_min=int(os.getenv("RESET_CODE_TTL_MIN", 10)),
        reset_max_attempts=int(os.getenv("RESET_MAX_ATTEMPTS", 5)),
    )

def get_admin_settings(db: Session):
    base = _default_settings_from_env()
    row = db.query(ConfigKV).filter(ConfigKV.k == "admin_settings").first()
    if row:
        try:
            overrides = json.loads(row.v)
            base.update(overrides or {})
        except json.JSONDecodeError:
            pass
    from pydantic import BaseModel, Field
    class AdminSettings(BaseModel):
        access_token_ttl_min: int = Field(120, ge=5, le=1440)
        smtp_host: str = ""
        smtp_port: int = Field(587, ge=1, le=65535)
        smtp_user: str = ""
        smtp_from: str = ""
        reset_code_ttl_min: int = Field(10, ge=1, le=120)
        reset_max_attempts: int = Field(5, ge=1, le=20)
    return AdminSettings(**base)

def update_admin_settings(db: Session, payload) :
    data = payload.dict()
    row = db.query(ConfigKV).filter(ConfigKV.k == "admin_settings").first()
    if row:
        row.v = json.dumps(data)
    else:
        db.add(ConfigKV(k="admin_settings", v=json.dumps(data)))
    db.commit()
    return get_admin_settings(db)

# ---------- Agent policies ----------
DEFAULT_AGENT_POLICIES = {
    "router": {"enabled": True,  "roles": ["admin", "user"]},
    "rag":    {"enabled": True,  "roles": ["admin", "user"]},
    "summarize":{"enabled": True,"roles": ["admin", "user"]},
    "code":   {"enabled": False, "roles": ["admin"]},
    "admin":  {"enabled": True,  "roles": ["admin"]},
    "llm":    {"enabled": True,  "roles": ["admin", "user"]},
}

def get_agent_policies(db: Session) -> Dict[str, Any]:
    row = db.query(Setting).filter(Setting.key == "agent_policies").first()
    if row and isinstance(row.value, dict):
        base = {**DEFAULT_AGENT_POLICIES}
        merged = {k: {**base.get(k, {}), **v} for k, v in row.value.items() if k in base}
        return merged
    return DEFAULT_AGENT_POLICIES

def put_agent_policies(db: Session, payload: Dict[str, Any]) -> Dict[str, Any]:
    row = db.query(Setting).filter(Setting.key == "agent_policies").first()
    if not row:
        row = Setting(key="agent_policies", value=payload)
        db.add(row)
    else:
        row.value = payload
    db.commit()
    return row.value
