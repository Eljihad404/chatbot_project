# 📚 RAG Chatbot Platform

An enterprise-grade Retrieval-Augmented Generation (RAG) chatbot built with **FastAPI, React.js, LangChain, Qdrant, and Groq LLM**.  
It supports **document uploads, vector database search, user authentication, and admin dashboards** for analytics and monitoring.

---

## 🚀 Features
- User authentication (JWT-based)
- Document upload and vector embedding with **Qdrant**
- Retrieval-Augmented Generation (RAG) with **LangChain + Groq**
- Admin dashboard with token usage & latency metrics
- Real-time response streaming with typing animation
- Modular backend (controllers/services/models)

---

## 📂 Project Structure
.
├── backend/ # FastAPI backend
│ ├── main.py # Entry point
│ ├── auth/ # Authentication module
│ ├── chat/ # Chatbot & RAG logic
│ ├── admin/ # Admin dashboard APIs
│ ├── services/ # Business logic
│ ├── models.py # SQLAlchemy models
│ └── db.py # Database setup
│
├── frontend/ # React frontend
│ ├── src/ # Components & pages
│ ├── package.json
│ └── .env
│
├── docker-compose.yml
├── README.md
└── .env


---

## ⚙️ Setup Instructions

### 1️⃣ Clone the repository
git clone https://github.com/your-username/rag-chatbot.git
cd rag-chatbot


cd backend
python -m venv my_env
my_env\Scripts\activate      # Windows
# source my_env/bin/activate # Linux/Mac

pip install -r requirements.txt


Start the FastAPI server:

uvicorn main:app --reload

3️⃣ Frontend Setup

cd frontend
npm install
npm run dev

4️⃣Qdrant (Vector Database)

docker run -p 6333:6333 -v ./qdrant_storage:/qdrant/storage qdrant/qdrant

Create a .env file inside backend/:
SECRET_KEY=change-me
ACCESS_TOKEN_EXPIRE_MINUTES=120

DATABASE_URL=postgresql+psycopg2://user:password@localhost:5432/rag_db

QDRANT_HOST=localhost
QDRANT_PORT=6333

GROQ_API_KEY=your_api_key

CORS_ORIGINS=http://localhost:3000
