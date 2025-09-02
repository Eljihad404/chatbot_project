# app/schemas/auth.py
import uuid
from typing import List
from pydantic import BaseModel, EmailStr

class UserCreate(BaseModel):
    username: str
    email: EmailStr
    password: str

class UserOut(BaseModel):
    id: uuid.UUID
    username: str
    email: EmailStr
    is_active: bool
    roles: List[str]
    is_admin: bool

class Token(BaseModel):
    access_token: str
    token_type: str

class RequestReset(BaseModel):
    email: EmailStr

class VerifyCodeBody(BaseModel):
    email: EmailStr
    code: str

class ResetPasswordBody(BaseModel):
    email: EmailStr
    code: str
    new_password: str
