# app/schemas/__init__.py
# Re-export for convenient imports like "from schemas import DocumentOut"
from .auth import (
    UserCreate, UserOut, Token,
    RequestReset, VerifyCodeBody, ResetPasswordBody,
)
from .docs import (
    DocumentOut, DocumentList, UploadResponse,
)

__all__ = [
    "UserCreate", "UserOut", "Token",
    "RequestReset", "VerifyCodeBody", "ResetPasswordBody",
    "DocumentOut", "DocumentList", "UploadResponse",
]
