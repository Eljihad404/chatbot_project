import os, hashlib, shutil
from typing import List, Optional, Dict, Any
from pathlib import Path
from datetime import datetime
from fastapi import UploadFile, HTTPException
from sqlalchemy.orm import Session

from utils.models import Document
from repositories import docs_repository as repo
from utils.utils_text import extract_text, chunk_text  # keep original paths if yours differ
from utils.langchain_store import upsert_document, delete_document  # keep original paths

STORAGE_DIR = Path(os.getenv("DOCS_STORAGE_DIR", "storage/docs"))
STORAGE_DIR.mkdir(parents=True, exist_ok=True)
ALLOWED_EXTS = {".pdf", ".docx", ".txt", ".md"}

def _sha256_fileobj(fp) -> str:
    h = hashlib.sha256()
    for chunk in iter(lambda: fp.read(1024 * 1024), b""):
        h.update(chunk)
    return h.hexdigest()

async def upload_docs(db: Session, files: List[UploadFile], source: Optional[str], tags: Optional[str], user) -> Dict[str, Any]:
    tags_list = [t.strip() for t in (tags or "").split(",") if t.strip()] or None

    for uf in files:
        ext = Path(uf.filename).suffix.lower()
        if ext not in ALLOWED_EXTS:
            raise HTTPException(status_code=400, detail=f"Unsupported file type: {ext}")

        uf.file.seek(0)
        content_hash = _sha256_fileobj(uf.file)
        uf.file.seek(0)

        doc_id = hashlib.md5((uf.filename + content_hash).encode()).hexdigest()
        safe_name = f"{doc_id}{ext}"
        dest_path = STORAGE_DIR / safe_name

        try:
            with dest_path.open("wb") as out:
                shutil.copyfileobj(uf.file, out)
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Failed to save file: {e}")

        size_bytes = dest_path.stat().st_size

        # Extract & chunk
        try:
            text = extract_text(str(dest_path))
            chunks = chunk_text(text)
            if not chunks:
                dest_path.unlink(missing_ok=True)
                raise HTTPException(status_code=400, detail=f"No extractable text in {uf.filename}")
        except HTTPException:
            raise
        except Exception as e:
            dest_path.unlink(missing_ok=True)
            raise HTTPException(status_code=400, detail=f"Failed to process {uf.filename}: {e}")

        metadata = {
            "filename": uf.filename,
            "ext": ext,
            "source": source,
            "tags": tags_list,
            "uploaded_by": (getattr(user, "id", None) or getattr(user, "email", None)
                            or (user.get("id") if isinstance(user, dict) else None) or "anonymous"),
            "uploaded_at": datetime.utcnow().isoformat(),
            "content_hash": content_hash,
        }
        try:
            upsert_document(doc_id, chunks, metadata)
        except Exception as e:
            dest_path.unlink(missing_ok=True)
            raise HTTPException(status_code=500, detail=f"Indexing error: {e}")

        try:
            repo.insert_document(db, Document(
                id=doc_id, filename=uf.filename, ext=ext, size_bytes=size_bytes,
                content_hash=content_hash, storage_path=str(dest_path),
                source=source, tags=tags_list, uploaded_by=metadata["uploaded_by"],
                status="ready",
            ))
        except Exception as e:
            try:
                delete_document(doc_id)
            except Exception:
                pass
            dest_path.unlink(missing_ok=True)
            raise HTTPException(status_code=500, detail=f"Database error: {e}")

    db.commit()

    items = repo.list_recent(db, count=len(files))
    return {"created": items}

def list_docs(db: Session, q: Optional[str], tag: Optional[str], skip: int, limit: int):
    return repo.list_docs(db, q, tag, skip, limit)

def delete_doc(db: Session, doc_id: str):
    doc = repo.get(db, doc_id)
    if not doc:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Document not found")
    try:
        delete_document(doc_id)
    except Exception as e:
        from fastapi import HTTPException
        raise HTTPException(status_code=500, detail=f"Failed to delete from vector DB: {e}")
    Path(doc.storage_path).unlink(missing_ok=True)
    repo.delete(db, doc)
    db.commit()
    return {"ok": True}

def reindex_doc(db: Session, doc_id: str):
    doc = repo.get(db, doc_id)
    if not doc:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Document not found")
    try:
        text = extract_text(doc.storage_path)
        chunks = chunk_text(text)
        if not chunks:
            from fastapi import HTTPException
            raise HTTPException(status_code=400, detail=f"No extractable text in {doc.filename}")
        delete_document(doc_id)
        upsert_document(doc_id, chunks, {
            "filename": doc.filename,
            "ext": doc.ext,
            "source": doc.source,
            "tags": doc.tags,
            "uploaded_by": doc.uploaded_by,
            "uploaded_at": doc.uploaded_at.isoformat() if hasattr(doc.uploaded_at, "isoformat") else str(doc.uploaded_at),
            "content_hash": doc.content_hash,
        })
        return {"ok": True}
    except Exception as e:
        from fastapi import HTTPException
        raise HTTPException(status_code=500, detail=f"Reindex error: {e}")

def download_path(db: Session, doc_id: str):
    doc = repo.get(db, doc_id)
    if not doc:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Document not found")
    return doc.storage_path, doc.filename
