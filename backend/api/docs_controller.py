import os
from typing import List, Optional
from pathlib import Path
from fastapi import APIRouter, UploadFile, File, Form, Depends, HTTPException
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from utils.db import get_db
from api.auth_controller import get_current_user
from schemas import DocumentOut, DocumentList, UploadResponse
from services import docs_service as svc

router = APIRouter()  # keep same, mount under /docs in main.py

@router.post("/upload", response_model=UploadResponse)
async def upload_docs(
    files: List[UploadFile] = File(...),
    source: Optional[str] = Form(None),
    tags: Optional[str] = Form(None),
    db: Session = Depends(get_db),
    user=Depends(get_current_user),
):
    return await svc.upload_docs(db, files, source, tags, user)

@router.get("/", response_model=DocumentList)
def list_docs(
    q: Optional[str] = None,
    tag: Optional[str] = None,
    skip: int = 0,
    limit: int = 50,
    db: Session = Depends(get_db),
):
    return svc.list_docs(db, q, tag, skip, limit)

@router.delete("/{doc_id}")
def delete_doc(doc_id: str, db: Session = Depends(get_db)):
    return svc.delete_doc(db, doc_id)

@router.post("/reindex/{doc_id}")
def reindex_doc(doc_id: str, db: Session = Depends(get_db)):
    return svc.reindex_doc(db, doc_id)

@router.get("/download/{doc_id}")
def download_doc(doc_id: str, db: Session = Depends(get_db)):
    path, filename = svc.download_path(db, doc_id)
    return FileResponse(path=path, filename=filename)
