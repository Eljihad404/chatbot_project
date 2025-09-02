# app/api/auth_controller.py
import uuid
from typing import List

from fastapi.security import OAuth2PasswordRequestForm
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from jose import jwt, JWTError

from utils.db import get_db
from utils.models import User
from schemas.auth import (
    UserCreate, UserOut, Token,
    RequestReset, VerifyCodeBody, ResetPasswordBody
)
from core.security import (
    oauth2_scheme, create_access_token,
    SECRET_KEY, ALGORITHM
)
from services import auth_service
from utils.email_sender import send_email  # keep existing helper


router = APIRouter(tags=["auth"])

# --------- Endpoints (unchanged paths) ---------

@router.post("/users/register", response_model=UserOut, status_code=201)
def register_user(payload: UserCreate, db: Session = Depends(get_db)):
    user, roles = auth_service.register_user(db, payload.username, payload.email, payload.password)
    return UserOut(
        id=user.id, username=user.username, email=user.email,
        is_active=user.is_active, roles=roles, is_admin=("admin" in roles)
    )

@router.post("/token", response_model=Token)
def login_for_access_token(
    form_data: OAuth2PasswordRequestForm = Depends(),   # <-- type it here
    db: Session = Depends(get_db),
):
    user, roles = auth_service.authenticate(db, form_data.username, form_data.password)
    access_token = auth_service.make_jwt_for_user(user, roles)
    return {"access_token": access_token, "token_type": "bearer"}

# ---- Token -> Current user dependency and admin guard ----

def _fetch_user_from_token(db: Session, token: str) -> User:
    cred_exc = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        sub = payload.get("sub")
        if not sub:
            raise cred_exc
        user_id = uuid.UUID(sub)
    except JWTError:
        raise cred_exc
    user = db.get(User, user_id)
    if not user:
        raise cred_exc
    return user

async def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)) -> UserOut:
    user = _fetch_user_from_token(db, token)
    if not user.is_active:
        raise HTTPException(status_code=401, detail="Inactive user")
    roles = auth_service.users_repo.get_user_roles(db, user.id)  # type: ignore
    return UserOut(
        id=user.id, username=user.username, email=user.email,
        is_active=user.is_active, roles=roles, is_admin=("admin" in roles)
    )

def require_admin(current: UserOut = Depends(get_current_user)) -> UserOut:
    if "admin" not in current.roles:
        raise HTTPException(status_code=403, detail="Admin role required")
    return current

@router.get("/users/me", response_model=UserOut)
def read_users_me(current: UserOut = Depends(get_current_user)):
    return current

# ---- Password reset endpoints (unchanged paths) ----

@router.post("/auth/request-password-reset")
def request_password_reset(body: RequestReset, db: Session = Depends(get_db)):
    auth_service.request_password_reset(db, body.email, send_email_fn=send_email)
    return {"ok": True}

@router.post("/auth/verify-reset-code")
def verify_reset_code(body: VerifyCodeBody, db: Session = Depends(get_db)):
    valid = auth_service.verify_reset_code(db, body.email, body.code)
    return {"valid": valid}

@router.post("/auth/reset-password")
def reset_password(body: ResetPasswordBody, db: Session = Depends(get_db)):
    auth_service.reset_password(db, body.email, body.code, body.new_password)
    return {"ok": True}
