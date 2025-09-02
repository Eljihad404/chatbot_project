# app/services/chat_service.py
import os, json, re, uuid
from typing import List, Dict, Literal, Any, Optional
from sqlalchemy.orm import Session
from sqlalchemy.sql import func
from sqlalchemy.exc import ProgrammingError, OperationalError
from langchain_core.documents import Document
from langchain_core.prompts import ChatPromptTemplate
from langgraph.graph import StateGraph, START, END

from core.ai import retriever, llm, DATA_DIR
from utils.db import SessionLocal
from utils.models import User as UserModel, Chat as ChatModel, Message as MessageModel, File as FileModel, Setting
from repositories import chat_repository as repo

DEFAULT_AGENT_POLICIES = {
    "router": {"enabled": True, "roles": ["admin", "user"]},
    "rag": {"enabled": True, "roles": ["admin", "user"]},
    "summarize": {"enabled": True, "roles": ["admin", "user"]},
    "code": {"enabled": False, "roles": ["admin"]},
    "admin": {"enabled": True, "roles": ["admin"]},
    "llm": {"enabled": True, "roles": ["admin", "user"]},
}
AGENT_POLICIES_CACHE: Dict[str, Dict[str, Any]] = {k: dict(v) for k, v in DEFAULT_AGENT_POLICIES.items()}
AGENT_KEYS = list(DEFAULT_AGENT_POLICIES.keys())

ROUTER_PROMPT = ChatPromptTemplate.from_messages([
    ("system",
     """You are a router. Choose ONE route for the user request.
Available routes: rag, summarize, code, admin, llm.
Return strict JSON as {{"route":"rag|summarize|code|admin|llm","reason":"..."}} only.
"""),
    ("human", "{question}")
])


RAG_QA_PROMPT = ChatPromptTemplate.from_messages([
    ("system",
     """You are a helpful enterprise assistant.
Answer using only the provided context. If not in the context, say you don't have that information.
Cite sources like [Doci].
Context:
{context}
"""),
    ("human", "{question}")
])

SUMMARY_PROMPT = ChatPromptTemplate.from_messages([
    ("system", "Summarize the following into 5–7 bullet points.\n\nContent:\n{context}"),
    ("human", "Summarize for: {question}")
])

LLM_FALLBACK_PROMPT = ChatPromptTemplate.from_messages([
    ("system", "You are a concise assistant."),
    ("human", "{question}")
])

class GraphState(dict):
    question: str
    user_id: str
    roles: List[str]
    policies: Dict[str, Dict[str, Any]]
    route: Literal["rag", "summarize", "code", "admin", "llm"]
    context_docs: List[Any]
    answer: str

def _format_docs_for_context(docs: List[Document]) -> str:
    parts = []
    for i, d in enumerate(docs or []):
        meta = dict(getattr(d, "metadata", {}) or {})
        src = meta.get("source") or meta.get("file") or meta.get("path") or f"doc{i}"
        page = getattr(d, "page_content", "") or ""
        parts.append(f"[Doc{i}] {src}\n\n{page}")
    return "\n\n---\n\n".join(parts)

def _is_allowed(agent: str, policies: Dict[str, Dict[str, Any]], roles: List[str]) -> bool:
    cfg = policies.get(agent, {"enabled": False, "roles": []})
    return bool(cfg.get("enabled") and any(r in cfg.get("roles", []) for r in roles))

def _get_agent_policies(db: Session) -> Dict[str, Dict[str, Any]]:
    try:
        row = db.query(Setting).filter(Setting.key == "agent_policies").first()
        if row and isinstance(row.value, dict):
            merged = DEFAULT_AGENT_POLICIES.copy()
            merged.update({
                k: {**merged.get(k, {}), **v}
                for k, v in row.value.items()
                if k in AGENT_KEYS
            })
            return merged
    except (ProgrammingError, OperationalError):
        # Table missing or DB not ready — fall back quietly.
        pass
    # No row or error -> sane defaults
    return AGENT_POLICIES_CACHE

def _user_roles(db: Session, user_id: uuid.UUID) -> List[str]:
    u: UserModel = db.query(UserModel).filter(UserModel.id == user_id).first()
    roles: List[str] = []
    if not u:
        return ["user"]
    if getattr(u, "is_admin", False):
        roles.append("admin")
    if not roles:
        roles.append("user")
    return roles

def node_router(state: GraphState) -> GraphState:
    policies, roles = state["policies"], state["roles"]
    if not _is_allowed("router", policies, roles):
        route = "rag" if _is_allowed("rag", policies, roles) else "llm"
        return {**state, "route": route}
    out = llm.invoke(ROUTER_PROMPT.format_messages(question=state["question"]))
    try:
        data = json.loads(out.content.strip().strip("`"))
        route = data.get("route", "rag")
    except Exception:
        route = "rag"
    if not _is_allowed(route, policies, roles):
        for cand in ["rag", "llm", "summarize"]:
            if _is_allowed(cand, policies, roles):
                route = cand
                break
    return {**state, "route": route}

def node_rag(state: GraphState) -> GraphState:
    raw_docs = retriever.invoke(state["question"]) or []
    docs: List[Document] = []
    for d in raw_docs:
        if isinstance(d, Document):
            docs.append(d)
        else:
            page = getattr(d, "page_content", str(d))
            meta = getattr(d, "metadata", {}) or {}
            docs.append(Document(page_content=page, metadata=meta))
    if not docs:
        return {**state, "context_docs": [], "answer": "I don’t have that in the knowledge base."}
    context_text = _format_docs_for_context(docs)
    out = llm.invoke(RAG_QA_PROMPT.format_messages(context=context_text, question=state["question"]))
    content = out if isinstance(out, str) else getattr(out, "content", "")
    return {**state, "context_docs": docs, "answer": content}

def _run_duckdb_sql(nl_or_sql: str) -> str:
    try:
        import duckdb
    except Exception:
        return "DuckDB not installed on server. Ask admin to enable the Code Agent or install duckdb."
    con = duckdb.connect(database=":memory:")
    con.execute("PRAGMA disable_object_cache")
    con.execute("PRAGMA allow_unsigned_extensions=false")
    if os.path.isdir(DATA_DIR):
        for fname in os.listdir(DATA_DIR):
            if fname.lower().endswith(".csv"):
                import os as _os, re as _re
                view = _re.sub(r"\W+", "_", _os.path.splitext(fname)[0])
                path = _os.path.join(DATA_DIR, fname)
                con.execute(f"CREATE VIEW {view} AS SELECT * FROM read_csv_auto('{path}', header=true)")
    sql = nl_or_sql.strip()
    if not sql.upper().startswith("SELECT"):
        prompt = ChatPromptTemplate.from_messages([
            ("system", "Write a single SQLite/DuckDB SELECT query. Only output SQL."),
            ("human",  "Task: {task}\n\nAvailable views: {views}")
        ])
        try:
            views_list = [v for v in con.execute("SHOW TABLES").fetchdf()["name"].tolist()]
        except Exception:
            views_list = []
        sql = llm.invoke(prompt.format_messages(task=nl_or_sql, views=", ".join(views_list))).content.strip().strip("`")
    try:
        df = con.execute(sql).fetchdf()
        if len(df) > 1000:
            df = df.head(1000)
        return df.to_markdown(index=False)
    except Exception as e:
        return f"SQL error: {e}"

def node_summarize(state: GraphState) -> GraphState:
    raw_docs = retriever.invoke(state["question"]) or []
    docs: List[Document] = []
    if raw_docs:
        for d in raw_docs:
            if isinstance(d, Document):
                docs.append(d)
            else:
                page = getattr(d, "page_content", str(d))
                meta = getattr(d, "metadata", {}) or {}
                docs.append(Document(page_content=page, metadata=meta))
    else:
        docs = [Document(page_content=state["question"], metadata={"source": "input"})]
    context_text = _format_docs_for_context(docs)
    out = llm.invoke(SUMMARY_PROMPT.format_messages(context=context_text, question=state["question"]))
    content = out if isinstance(out, str) else getattr(out, "content", "")
    return {**state, "context_docs": docs, "answer": content}

def node_code(state: GraphState) -> GraphState:
    return {**state, "answer": _run_duckdb_sql(state["question"])}

def node_admin(state: GraphState) -> GraphState:
    db = SessionLocal()
    try:
        users_cnt = db.query(func.count(UserModel.id)).scalar() or 0
        chats_cnt = db.query(func.count(ChatModel.id)).scalar() or 0
        docs_cnt  = db.query(func.count(FileModel.id)).scalar() or 0
        tok_est   = (db.query(func.coalesce(func.sum(func.length(MessageModel.content)), 0)).scalar() or 0) // 4
        ans = f"Users: {users_cnt}\nChats: {chats_cnt}\nDocuments: {docs_cnt}\nEstimated tokens stored: {tok_est}"
    except Exception as e:
        ans = f"Admin agent error: {e}"
    finally:
        db.close()
    return {**state, "answer": ans}

def node_llm(state: GraphState) -> GraphState:
    out = llm.invoke(LLM_FALLBACK_PROMPT.format_messages(question=state["question"]))
    return {**state, "answer": out.content}

# compile graph
workflow = StateGraph(GraphState)
workflow.add_node("router", node_router)
workflow.add_node("rag", node_rag)
workflow.add_node("summarize", node_summarize)
workflow.add_node("code", node_code)
workflow.add_node("admin", node_admin)
workflow.add_node("llm", node_llm)
workflow.add_edge(START, "router")

def _route(state: GraphState):
    return state["route"]

workflow.add_conditional_edges("router", _route,
    {"rag": "rag", "summarize": "summarize", "code": "code", "admin": "admin", "llm": "llm"})
for r in ["rag", "summarize", "code", "admin", "llm"]:
    workflow.add_edge(r, END)

app_graph = workflow.compile()

async def init_rag_chain():
    return {"graph": app_graph, "retriever": retriever}

# -------- service helpers used by controller --------
def first_words(s: str, n: int = 8) -> str:
    return " ".join((s or "").strip().split()[:n]) or "New chat"

def ensure_chat_for_user(db: Session, user_id, message: str, chat_id: Optional[str]) -> str:
    if chat_id:
        c = repo.get_chat(db, chat_id)
        if not c or c.user_id != user_id:
            from fastapi import HTTPException
            raise HTTPException(status_code=404, detail="Chat not found")
        return chat_id
    else:
        c = repo.create_chat(db, user_id, first_words(message, 8))
        return str(c.id)

def run_graph_once(db: Session, user_id, message: str) -> str:
    policies = _get_agent_policies(db)
    roles = _user_roles(db, user_id)
    init: GraphState = {
        "question": message,
        "user_id": str(user_id),
        "roles": roles,
        "policies": policies,
        "route": "rag",
        "context_docs": [],
        "answer": "",
    }
    result: GraphState = app_graph.invoke(init)
    return result.get("answer", "") or ""
