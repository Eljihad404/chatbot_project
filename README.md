📚 RAG Chatbot Platform

An enterprise-grade Retrieval-Augmented Generation (RAG) chatbot built with FastAPI, React.js, LangChain, Qdrant, and Groq LLM.
It supports document uploads, semantic search, user authentication, and admin dashboards for analytics and monitoring.

🚀 Features

🔐 User authentication (JWT-based with role support: user/admin)

📂 Document upload & embedding into Qdrant vector database

🧠 Retrieval-Augmented Generation with LangChain + Groq LLM

📊 Admin dashboard: token usage, chat analytics

⚡ Real-time streaming with typing animation in UI

🧩 Modular architecture (controllers / services / models)

🎨 Modern React UI with dark mode, chat sidebar, and document manager

🛠️ Setup Instructions
1️⃣ Clone the repository
git clone https://github.com/your-username/rag-chatbot.git
cd rag-chatbot

2️⃣ Backend Setup (FastAPI)
Create virtual environment
cd backend
python -m venv my_env
# Activate:
my_env\Scripts\activate      # Windows
# source my_env/bin/activate # Linux/Mac

Install dependencies
pip install -r requirements.txt

Run backend server
uvicorn main:app --reload


Backend will run at 👉 http://localhost:8000

3️⃣ Frontend Setup (React.js)
cd frontend
npm install
npm run dev


Frontend will run at 👉 http://localhost:3000

4️⃣ Vector Database (Qdrant)

Run Qdrant in Docker:

docker run -p 6333:6333 \
  -v ./qdrant_storage:/qdrant/storage \
  qdrant/qdrant


Qdrant dashboard: 👉 http://localhost:6333/dashboard

5️⃣ Database (PostgreSQL)

Make sure PostgreSQL is installed and running.
Create a database:

CREATE DATABASE rag_db;

6️⃣ Environment Variables

Create a .env file inside backend/:

# Security
SECRET_KEY=change-me
ACCESS_TOKEN_EXPIRE_MINUTES=120

# Database
DATABASE_URL=postgresql+psycopg2://user:password@localhost:5432/rag_db

# Qdrant
QDRANT_HOST=localhost
QDRANT_PORT=6333

# LLM
GROQ_API_KEY=your_api_key

# CORS (frontend allowed origins)
CORS_ORIGINS=http://localhost:3000

🧑‍💻 Usage

Sign up / login in the frontend UI

Upload documents → automatically embedded into Qdrant

Ask questions → chatbot retrieves context + generates response with Groq

Admins → monitor token usage & latency metrics in the dashboard

🐳 Optional: Docker Compose

You can run everything with a single command:

docker-compose up --build

 Deploy to Kubernetes


📜 License

MIT License © 2025 El-houssaine El-jihad