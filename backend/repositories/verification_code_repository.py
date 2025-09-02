# app/repositories/verification_code_repository.py
from datetime import datetime
import uuid
from typing import Optional
from sqlalchemy.orm import Session

from utils.models import VerificationCode

def now_utc() -> datetime:
    from datetime import timezone
    return datetime.now(timezone.utc)

def get_active_code(db: Session, user_id: uuid.UUID, purpose: str) -> Optional[VerificationCode]:
    return (
        db.query(VerificationCode)
        .filter(
            VerificationCode.user_id == user_id,
            VerificationCode.purpose == purpose,
            VerificationCode.consumed_at.is_(None),
            VerificationCode.expires_at > now_utc(),
        )
        .order_by(VerificationCode.created_at.desc())
        .first()
    )

def consume_all_for_purpose(db: Session, user_id: uuid.UUID, purpose: str) -> None:
    db.query(VerificationCode).filter(
        VerificationCode.user_id == user_id,
        VerificationCode.purpose == purpose,
        VerificationCode.consumed_at.is_(None),
    ).update({VerificationCode.consumed_at: now_utc()})
    db.commit()

def create_code_record(db: Session, user_id: uuid.UUID, purpose: str, code_hash: str, expires_at: datetime) -> VerificationCode:
    rec = VerificationCode(
        user_id=user_id,
        purpose=purpose,
        code_hash=code_hash,
        expires_at=expires_at,
    )
    db.add(rec)
    db.commit()
    db.refresh(rec)
    return rec

def increment_attempts(db: Session, rec: VerificationCode) -> None:
    rec.attempts += 1
    db.commit()
