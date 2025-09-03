# utils/langchain_store.py
import os
import time
import uuid
from typing import List, Dict, Optional

from qdrant_client import QdrantClient
from qdrant_client.models import (
    Distance,
    VectorParams,
    PointStruct,
    Filter,
    FieldCondition,
    MatchValue,
    FilterSelector,
)

# LangChain embeddings — support old/new import paths
try:
    from langchain_huggingface import HuggingFaceEmbeddings
except Exception:
    from langchain.embeddings import HuggingFaceEmbeddings  # older LC

# --------------------
# Config
# --------------------
QDRANT_URL = os.getenv("QDRANT_URL", "http://qdrant:6333")  # <- use compose service name by default
QDRANT_API_KEY = os.getenv("QDRANT_API_KEY")  # optional
QDRANT_COLLECTION = os.getenv("QDRANT_COLLECTION", "jesa_docs")
EMBED_MODEL = os.getenv("EMBEDDING_MODEL", "sentence-transformers/all-MiniLM-L6-v2")
DISTANCE = os.getenv("EMBED_DISTANCE", "COSINE").upper()  # COSINE | DOT | EUCLID

# Optional embeddings device (cpu/cuda)
EMBED_DEVICE = os.getenv("EMBED_DEVICE", "cpu")

# --------------------
# Lazy singletons
# --------------------
_client: Optional[QdrantClient] = None
_embeddings: Optional[HuggingFaceEmbeddings] = None


def get_client() -> QdrantClient:
    global _client
    if _client is None:
        _client = QdrantClient(url=QDRANT_URL, api_key=QDRANT_API_KEY, timeout=30.0)
    return _client


def get_embeddings() -> HuggingFaceEmbeddings:
    global _embeddings
    if _embeddings is None:
        # Avoid heavy downloads at import-time; create on first use
        # For langchain_huggingface>=0.0.3: use model_kwargs to set device
        try:
            _embeddings = HuggingFaceEmbeddings(model_name=EMBED_MODEL, model_kwargs={"device": EMBED_DEVICE})
        except TypeError:
            # Older LC fallback
            _embeddings = HuggingFaceEmbeddings(model_name=EMBED_MODEL)
    return _embeddings


def _embedding_dim() -> int:
    """
    Robustly get the sentence embedding dimension from the embeddings object.
    """
    embeddings = get_embeddings()
    for attr in ("client", "model"):
        try:
            st = getattr(embeddings, attr)
            return st.get_sentence_embedding_dimension()
        except Exception:
            pass
    # Fallback: run once
    return len(embeddings.embed_query("dimension probe"))


def ensure_collection(retries: int = 60, delay: float = 1.0) -> None:
    """
    Ensure the target collection exists. Retry while Qdrant is booting.
    Call this from FastAPI startup.
    """
    client = get_client()
    dist_map = {"COSINE": Distance.COSINE, "DOT": Distance.DOT, "EUCLID": Distance.EUCLID}
    dim = None

    for attempt in range(1, retries + 1):
        try:
            # Quick readiness probe
            try:
                client.get_collection(QDRANT_COLLECTION)
                return  # already exists
            except Exception:
                pass

            # Lazily compute dim only when Qdrant seems reachable to save time
            if dim is None:
                dim = _embedding_dim()

            client.create_collection(
                collection_name=QDRANT_COLLECTION,
                vectors_config=VectorParams(size=dim, distance=dist_map.get(DISTANCE, Distance.COSINE)),
            )
            return
        except Exception as e:
            if attempt == retries:
                raise RuntimeError(f"Qdrant not reachable after {retries} attempts: {e}") from e
            time.sleep(delay)


# --------------------
# Public API
# --------------------
def upsert_document(doc_id: str, chunks: List[str], metadata: Dict):
    """
    Embed chunks and upsert to Qdrant. Uses deterministic UUIDv5 per (doc_id, chunk_index).
    """
    if not chunks:
        return

    vectors = get_embeddings().embed_documents(chunks)
    if len(vectors) != len(chunks):
        raise ValueError("embed_documents returned a different length than chunks")

    points: List[PointStruct] = []
    for i, (vec, text) in enumerate(zip(vectors, chunks)):
        pid = uuid.uuid5(uuid.NAMESPACE_URL, f"{doc_id}:{i}")
        points.append(
            PointStruct(
                id=str(pid),  # send as string
                vector=vec,
                payload={
                    **(metadata or {}),
                    "doc_id": doc_id,
                    "chunk_index": i,
                    "text": text,
                },
            )
        )

    get_client().upsert(collection_name=QDRANT_COLLECTION, points=points)


def delete_document(doc_id: str):
    """
    Delete all vectors for a given document by payload filter.
    """
    cond = Filter(must=[FieldCondition(key="doc_id", match=MatchValue(value=doc_id))])
    selector = FilterSelector(filter=cond)
    get_client().delete(collection_name=QDRANT_COLLECTION, points_selector=selector)
