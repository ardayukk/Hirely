import os
from typing import Any
from contextlib import asynccontextmanager

import psycopg
from psycopg_pool import AsyncConnectionPool
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")

# Support Django-style discrete DB_* env vars by constructing a DATABASE_URL if absent
if not DATABASE_URL:
    db_name = os.getenv("DB_NAME")
    db_user = os.getenv("DB_USER")
    db_pass = os.getenv("DB_PASSWORD")
    db_host = os.getenv("DB_HOST", "localhost")
    db_port = os.getenv("DB_PORT", "5432")
    if all([db_name, db_user, db_pass]):
        # Standard psycopg DSN
        DATABASE_URL = f"postgresql://{db_user}:{db_pass}@{db_host}:{db_port}/{db_name}"

# Initialize connection pool at module level
_pool: AsyncConnectionPool = None

async def init_pool():
    """Initialize the connection pool (call on app startup)."""
    global _pool
    if not DATABASE_URL:
        raise RuntimeError("DATABASE_URL is not set")
    _pool = AsyncConnectionPool(DATABASE_URL, min_size=5, max_size=20)
    await _pool.open()

async def close_pool():
    """Close the connection pool (call on app shutdown)."""
    global _pool
    if _pool:
        await _pool.close()

@asynccontextmanager
async def get_connection() -> Any:
    global _pool
    # Lazy-init the pool if not already initialized (handles missing startup hooks)
    if _pool is None:
        await init_pool()
    async with _pool.connection() as conn:
        yield conn
