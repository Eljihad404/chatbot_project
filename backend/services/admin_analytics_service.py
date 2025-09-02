from datetime import datetime, timedelta, timezone
from sqlalchemy.orm import Session
from sqlalchemy import text

def _start_ts(days: int) -> datetime:
    d = max(int(days or 0), 1)
    return datetime.now(timezone.utc) - timedelta(days=d)

def ts_messages(db: Session, days: int):
    start = _start_ts(days)
    sql = text("""
        SELECT to_char(date_trunc('day', m.created_at AT TIME ZONE 'UTC'), 'YYYY-MM-DD') AS day,
               COUNT(*)::int AS messages
        FROM messages m
        WHERE m.created_at >= :start
        GROUP BY 1
        ORDER BY 1
    """)
    rows = db.execute(sql, {"start": start}).fetchall()
    return [dict(r._mapping) for r in rows]

def ts_users(db: Session, days: int):
    start = _start_ts(days)
    sql = text("""
        SELECT to_char(date_trunc('day', m.created_at AT TIME ZONE 'UTC'), 'YYYY-MM-DD') AS day,
               COUNT(DISTINCT c.user_id)::int AS users
        FROM messages m
        JOIN chats c ON c.id = m.chat_id
        WHERE m.created_at >= :start
        GROUP BY 1
        ORDER BY 1
    """)
    rows = db.execute(sql, {"start": start}).fetchall()
    return [dict(r._mapping) for r in rows]

def ts_latency(db: Session, days: int):
    start = _start_ts(days)
    sql = text("""
        WITH seq AS (
          SELECT
            m.chat_id,
            m.sender,
            m.created_at,
            lead(m.created_at) OVER (PARTITION BY m.chat_id ORDER BY m.created_at) AS next_ts,
            lead(m.sender)     OVER (PARTITION BY m.chat_id ORDER BY m.created_at) AS next_sender
          FROM messages m
          WHERE m.created_at >= :start
        ),
        pairs AS (
          SELECT created_at AS user_ts,
                 EXTRACT(EPOCH FROM (next_ts - created_at)) * 1000.0 AS ms
          FROM seq
          WHERE sender = 'user' AND next_sender = 'assistant' AND next_ts IS NOT NULL
        )
        SELECT to_char(date_trunc('day', user_ts AT TIME ZONE 'UTC'), 'YYYY-MM-DD') AS day,
               percentile_cont(0.5)  WITHIN GROUP (ORDER BY ms) AS p50_ms,
               percentile_cont(0.95) WITHIN GROUP (ORDER BY ms) AS p95_ms
        FROM pairs
        GROUP BY 1
        ORDER BY 1
    """)
    rows = db.execute(sql, {"start": start}).fetchall()
    return [dict(r._mapping) for r in rows]

def ts_tokens_cost(db: Session, days: int):
    start = _start_ts(days)
    sql = text("""
        SELECT to_char(date_trunc('day', m.created_at AT TIME ZONE 'UTC'), 'YYYY-MM-DD') AS day,
               SUM(length(m.content) / 4.0) AS tokens
        FROM messages m
        WHERE m.created_at >= :start
        GROUP BY 1
        ORDER BY 1
    """)
    rows = db.execute(sql, {"start": start}).fetchall()
    return [dict(r._mapping) for r in rows]
