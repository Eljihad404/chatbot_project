import os
from qdrant_client import QdrantClient
from qdrant_client.models import VectorParams, Distance

try:
    from langchain_qdrant import QdrantVectorStore
except Exception:
    from langchain_community.vectorstores import Qdrant as QdrantVectorStore

from langchain_huggingface import HuggingFaceEmbeddings
from langchain_groq import ChatGroq

# ---- Config
DATA_DIR = os.getenv("DATA_DIR", "data")
QDRANT_URL = os.getenv("QDRANT_URL", "http://localhost:6333")
QDRANT_COLLECTION_NAME = os.getenv("QDRANT_COLLECTION", "my_text_files_collection")
GROQ_MODEL = os.getenv("GROQ_MODEL", "meta-llama/llama-4-maverick-17b-128e-instruct")
HF_TOKEN = os.getenv("HUGGINGFACE_HUB_TOKEN")
EMBED_MODEL = os.getenv("EMBEDDINGS_MODEL", "sentence-transformers/all-MiniLM-L6-v2")

def _load_embeddings():
    if HF_TOKEN:
        os.environ["HUGGINGFACE_HUB_TOKEN"] = HF_TOKEN
    # same fallback behavior as your original
    try:
        return HuggingFaceEmbeddings(model_name=EMBED_MODEL)
    except Exception:
        for alt in [
            "sentence-transformers/all-MiniLM-L6-v2",
            "intfloat/e5-small-v2",
            "BAAI/bge-small-en-v1.5",
            "thenlper/gte-small",
        ]:
            try: return HuggingFaceEmbeddings(model_name=alt)
            except Exception: continue
        raise

embeddings = _load_embeddings()

qdrant_key = os.getenv("QDRANT_API_KEY")
client = QdrantClient(url=QDRANT_URL, api_key=qdrant_key)

def ensure_qdrant_collection_exists():
    try:
        names = {c.name for c in client.get_collections().collections}
    except Exception:
        names = set()
    if QDRANT_COLLECTION_NAME in names:
        return
    try:
        dim = len(embeddings.embed_query("dim-probe"))
    except Exception:
        dim = len(embeddings.embed_documents(["dim-probe"])[0])
    client.recreate_collection(
        collection_name=QDRANT_COLLECTION_NAME,
        vectors_config=VectorParams(size=dim, distance=Distance.COSINE)
    )
ensure_qdrant_collection_exists()

def make_vectorstore():
    for kwargs in [
        dict(client=client, collection_name=QDRANT_COLLECTION_NAME, embedding=embeddings),
        dict(client=client, collection_name=QDRANT_COLLECTION_NAME, embeddings=embeddings),
        dict(qdrant_client=client, collection_name=QDRANT_COLLECTION_NAME, embedding=embeddings),
        dict(qdrant_client=client, collection_name=QDRANT_COLLECTION_NAME, embeddings=embeddings),
    ]:
        try: return QdrantVectorStore(**kwargs)
        except TypeError: continue
    raise RuntimeError("Failed to initialize QdrantVectorStore")

vectorstore = make_vectorstore()
retriever = vectorstore.as_retriever(search_kwargs={"k": 3})

groq_key = os.getenv("GROQ_API_KEY")
if not groq_key:
    raise RuntimeError("Missing GROQ_API_KEY")
llm = ChatGroq(api_key=groq_key, model_name=GROQ_MODEL, temperature=0.2)
