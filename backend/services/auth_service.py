# app/services/auth_service.py
import uuid
from datetime import timedelta
from typing import List, Optional, Tuple

from sqlalchemy.orm import Session
from jose import JWTError

from repositories import user_repository as users_repo
from repositories import verification_code_repository as vc_repo
from core.security import verify_password, get_password_hash, create_access_token
from utils.security_codes import generate_code, hash_code, verify_code, RESET_CODE_TTL_MIN, RESET_MAX_ATTEMPTS
from utils.models import User

# --- Users ---
def register_user(db: Session, username: str, email: str, password: str) -> Tuple[User, List[str]]:
    email_norm = email.lower()

    # Unique check (username OR email)
    exists = db.query(User).filter(
        (User.username == username) | (User.email.ilike(email_norm))
    ).first()
    if exists:
        from fastapi import HTTPException
        raise HTTPException(status_code=400, detail="Username or email already registered")

    user = users_repo.create_user(db, username, email_norm, get_password_hash(password))

    # Ensure 'user' role exists and assign
    role_user = users_repo.ensure_default_user_role(db)
    users_repo.assign_role(db, user.id, role_user.role_id)

    roles = users_repo.get_user_roles(db, user.id)
    return user, roles

def authenticate(db: Session, identifier: str, password: str) -> Tuple[User, List[str]]:
    user = users_repo.get_by_identifier(db, identifier)
    if not user or not verify_password(password, user.hashed_password):
        from fastapi import HTTPException, status
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )

    users_repo.update_last_login(db, user)
    roles = users_repo.get_user_roles(db, user.id)
    return user, roles

def make_jwt_for_user(user: User, roles: List[str]) -> str:
    return create_access_token({"sub": str(user.id), "roles": roles})

# --- Password reset flow ---
def request_password_reset(db: Session, email: str, send_email_fn) -> None:
    user = users_repo.get_by_email(db, email)
    if not user:
        return  # do nothing (avoid enumeration)

    # Invalidate previous active codes
    vc_repo.consume_all_for_purpose(db, user.id, "password_reset")

    code = generate_code()
    vc_repo.create_code_record(
        db,
        user_id=user.id,
        purpose="password_reset",
        code_hash=hash_code(code),
        expires_at=vc_repo.now_utc() + timedelta(minutes=RESET_CODE_TTL_MIN),
    )

    # Send email (swallow exceptions like original)
    html = f"""
    <div style="font-family:Inter,Arial,sans-serif">
      <h2>Your password reset code</h2>
      <p>Hello {user.username},</p>
      <p>Use this code to reset your password: <b style="font-size:20px">{code}</b></p>
      <p>This code expires in {RESET_CODE_TTL_MIN} minutes. If you didn’t request it, ignore this email.</p>
    </div>
    """
    try:
        send_email_fn(to_email=user.email, subject="Your password reset code", html=html)
    except Exception:
        pass

def verify_reset_code(db: Session, email: str, code: str) -> bool:
    user = users_repo.get_by_email(db, email)
    if not user:
        return False

    rec = vc_repo.get_active_code(db, user.id, "password_reset")
    if not rec or rec.attempts >= RESET_MAX_ATTEMPTS:
        return False

    if not verify_code(code, rec.code_hash):
        vc_repo.increment_attempts(db, rec)
        return False

    return True

def reset_password(db: Session, email: str, code: str, new_password: str) -> None:
    user = users_repo.get_by_email(db, email)
    if not user:
        return

    rec = vc_repo.get_active_code(db, user.id, "password_reset")
    if not rec or rec.attempts >= RESET_MAX_ATTEMPTS:
        return

    if not verify_code(code, rec.code_hash):
        vc_repo.increment_attempts(db, rec)
        return

    # consume and update password
    rec.consumed_at = vc_repo.now_utc()
    user.hashed_password = get_password_hash(new_password)
    db.commit()
