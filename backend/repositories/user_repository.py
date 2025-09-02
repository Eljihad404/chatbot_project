# app/repositories/user_repository.py
import uuid
from typing import Optional, List
from sqlalchemy.orm import Session
from sqlalchemy import or_, func

from utils.models import User, Role, UserRole

def get_by_username(db: Session, username: str) -> Optional[User]:
    return db.query(User).filter(User.username == username).first()

def get_by_email(db: Session, email: str) -> Optional[User]:
    return db.query(User).filter(func.lower(User.email) == email.lower()).first()

def get_by_identifier(db: Session, identifier: str) -> Optional[User]:
    ident = identifier.strip()
    return (
        db.query(User)
        .filter(or_(User.username == ident, func.lower(User.email) == ident.lower()))
        .first()
    )

def create_user(db: Session, username: str, email_norm: str, hashed_password: str) -> User:
    user = User(username=username, email=email_norm, hashed_password=hashed_password)
    db.add(user)
    db.commit()
    db.refresh(user)
    return user

def ensure_default_user_role(db: Session) -> Role:
    role = db.query(Role).filter_by(name="user").first()
    if not role:
        role = Role(name="user", description="Regular authenticated user")
        db.add(role)
        db.commit()
        db.refresh(role)
    return role

def assign_role(db: Session, user_id: uuid.UUID, role_id: int) -> None:
    db.add(UserRole(user_id=user_id, role_id=role_id))
    db.commit()

def get_user_roles(db: Session, user_id: uuid.UUID) -> List[str]:
    rows = (
        db.query(Role.name)
        .join(UserRole, Role.role_id == UserRole.role_id)
        .filter(UserRole.user_id == user_id)
        .all()
    )
    return [r[0] for r in rows]

def update_last_login(db: Session, user: User) -> None:
    from datetime import datetime, timezone
    user.last_login = datetime.now(timezone.utc)
    db.commit()
