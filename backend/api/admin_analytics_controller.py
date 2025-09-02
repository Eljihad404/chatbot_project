from datetime import datetime
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from utils.db import get_db
from api.auth_controller import require_admin
from services import admin_analytics_service as svc

router = APIRouter(prefix="/admin", tags=["admin-analytics"])

@router.get("/timeseries/messages")
def ts_messages(days: int = 30, db: Session = Depends(get_db), _ = Depends(require_admin)):
    return svc.ts_messages(db, days)

@router.get("/timeseries/users")
def ts_users(days: int = 30, db: Session = Depends(get_db), _ = Depends(require_admin)):
    return svc.ts_users(db, days)

@router.get("/latency")
def ts_latency(days: int = 30, db: Session = Depends(get_db), _ = Depends(require_admin)):
    return svc.ts_latency(db, days)

@router.get("/timeseries/tokens_cost")
def ts_tokens_cost(days: int = 30, db: Session = Depends(get_db), _ = Depends(require_admin)):
    return svc.ts_tokens_cost(db, days)
