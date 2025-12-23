import os
from typing import Any
from contextlib import asynccontextmanager
from pathlib import Path

import psycopg
from psycopg_pool import AsyncConnectionPool
from dotenv import load_dotenv

"""
Environment loading strategy:
- Prefer backend/.env
- Fallback to project root .env (parent of backend)
- Respect already-set OS environment variables
"""

# Prefer backend/.env
backend_env_path = Path(__file__).parent / '.env'
load_dotenv(dotenv_path=backend_env_path)

# If not set, fallback to project root .env
DATABASE_URL = os.getenv("DATABASE_URL")
if not DATABASE_URL:
    root_env_path = Path(__file__).parent.parent / '.env'
    load_dotenv(dotenv_path=root_env_path)
    DATABASE_URL = os.getenv("DATABASE_URL")
    print(f"[DEBUG] .env path (backend): {backend_env_path}")
    print(f"[DEBUG] .env exists (backend): {backend_env_path.exists()}")
    print(f"[DEBUG] .env path (root): {root_env_path}")
    print(f"[DEBUG] .env exists (root): {root_env_path.exists()}")
    # Log resolved DB connection info without exposing password
    try:
        # postgres://user:pass@host:port/dbname
        if DATABASE_URL and "://" in DATABASE_URL:
            scheme, rest = DATABASE_URL.split("://", 1)
            creds, hostpart = rest.split("@", 1)
            user = creds.split(":", 1)[0]
            host, dbname = hostpart.split("/", 1)
            print(f"[DEBUG] DB resolved -> user={user}, host={host}, db={dbname}")
        else:
            print(f"[DEBUG] DATABASE_URL after fallback: {DATABASE_URL}")
    except Exception:
        print(f"[DEBUG] DATABASE_URL after fallback: {DATABASE_URL}")

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
