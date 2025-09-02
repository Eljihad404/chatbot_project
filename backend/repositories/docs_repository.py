from typing import Optional, List, Dict, Any
from sqlalchemy.orm import Session
from utils.models import Document

def insert_document(db: Session, doc: Document) -> None:
    db.add(doc)

def get(db: Session, doc_id: str) -> Optional[Document]:
    return db.get(Document, doc_id)

def delete(db: Session, doc: Document) -> None:
    db.delete(doc)

def list_recent(db: Session, count: int) -> List[Document]:
    return db.query(Document).order_by(Document.uploaded_at.desc()).limit(count).all()

def list_docs(db: Session, q: Optional[str], tag: Optional[str], skip: int, limit: int):
    qry = db.query(Document)
    if q:
        like = f"%{q}%"
        qry = qry.filter(Document.filename.ilike(like))
    if tag:
        qry = qry.filter(Document.tags.like(f"%{tag}%"))
    total = qry.count()
    items = qry.order_by(Document.uploaded_at.desc()).offset(skip).limit(limit).all()
    return {"items": items, "total": total}
