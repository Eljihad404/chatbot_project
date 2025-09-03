# 📚 RAG Chatbot Platform

Enterprise-grade Retrieval-Augmented Generation (RAG) chatbot built with **FastAPI**, **React**, **LangChain**, **Qdrant**, **PostgreSQL**, and **Groq**.  
Supports document upload, semantic search, auth with roles, and an admin dashboard for usage analytics.

---

## ✨ Features

- 🔐 **Auth** — JWT with roles (`user`, `admin`)
- 📂 **Docs** — upload → chunk → embed into **Qdrant**
- 🧠 **RAG** — LangChain retriever + Groq LLM
- ⚡ **Streaming** — real-time typing effect in UI
- 📊 **Admin** — token usage & chat analytics
- 🧩 **Modular** — controllers / services / models
- 🎨 **Modern UI** — dark mode, chat sidebar, document manager

---

## 🧱 Tech Stack

**Frontend:** React (Vite) → served by Nginx in prod  
**Backend:** FastAPI, SQLAlchemy, Pydantic v2  
**Vector DB:** Qdrant  
**Relational DB:** PostgreSQL  
**RAG:** LangChain + sentence-transformers  
**LLM:** Groq (API)  
**Infra:** Docker / Docker Compose


---

## 🚀 Quick Start (Docker Compose – recommended)

1. Create `.env` at the **repo root**:

```env
# Security
SECRET_KEY=change-me
ACCESS_TOKEN_EXPIRE_MINUTES=120

# DB (Compose uses service name 'postgres')
POSTGRES_DB=rag_db
POSTGRES_USER=rag_user
POSTGRES_PASSWORD=rag_pass

# SQLAlchemy URL used by backend
DATABASE_URL=postgresql+psycopg2://rag_user:rag_pass@postgres:5432/rag_db

# Qdrant
QDRANT_URL=http://qdrant:6333
QDRANT_COLLECTION=jesa_docs

# LLM
GROQ_API_KEY=your_api_key

# CORS
CORS_ORIGINS=http://localhost:3000

## Build & run:
docker compose build --no-cache
docker compose up

## Open:
Backend API: http://localhost:8000

Frontend UI: http://localhost:3000

Qdrant Dashboard: http://localhost:6333/dashboard


### 💻 Run Locally (without Docker)

## Backend
cd backend
python -m venv my_env
# Windows:
my_env\Scripts\activate
# Linux/Mac:
# source my_env/bin/activate

pip install -r requirements.txt
uvicorn main:app --reload
# http://localhost:8000 

## Frontend
cd frontend
npm install
npm run dev
# http://localhost:3000

## Qdrant (standalone in Docker)
docker run -p 6333:6333 \
  -v ./qdrant_storage:/qdrant/storage \
  qdrant/qdrant
# Dashboard: http://localhost:6333/dashboard

## PostgreSQL
Install locally or run in Docker. Then create DB:

# sql
Copy code
CREATE DATABASE rag_db;
Set DATABASE_URL accordingly, e.g.:

# bash
Copy code
postgresql+psycopg2://user:password@localhost:5432/rag_db

## Configuration 
| Key                           | Example                                                        | Notes                            |
| ----------------------------- | -------------------------------------------------------------- | -------------------------------- |
| `SECRET_KEY`                  | `change-me`                                                    | JWT signing                      |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | `120`                                                          | Token TTL (minutes)              |
| `DATABASE_URL`                | `postgresql+psycopg2://rag_user:rag_pass@postgres:5432/rag_db` | SQLAlchemy URL                   |
| `POSTGRES_DB`                 | `rag_db`                                                       | Compose only                     |
| `POSTGRES_USER`               | `rag_user`                                                     | Compose only                     |
| `POSTGRES_PASSWORD`           | `rag_pass`                                                     | Compose only                     |
| `QDRANT_URL`                  | `http://qdrant:6333`                                           | Vector DB endpoint               |
| `QDRANT_COLLECTION`           | `jesa_docs`                                                    | Vector collection name           |
| `GROQ_API_KEY`                | `...`                                                          | Groq LLM key                     |
| `CORS_ORIGINS`                | `http://localhost:3000`                                        | Allowed frontend origin          |
| `EMBEDDING_MODEL` (optional)  | `sentence-transformers/all-MiniLM-L6-v2`                       | Embeddings model                 |
| `EMBED_DEVICE` (optional)     | `cpu` / `cuda`                                                 | Device for sentence-transformers |

### 📜 License

MIT © 2025 El-Houssaine El-Jihad

