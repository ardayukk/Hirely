import os
from typing import Any
from contextlib import asynccontextmanager
from pathlib import Path

import psycopg
from dotenv import load_dotenv

# Load .env from backend directory regardless of where script runs
env_path = Path(__file__).parent / '.env'
load_dotenv(dotenv_path=env_path)

DATABASE_URL = os.getenv("DATABASE_URL")
if not DATABASE_URL:
    print(f"[DEBUG] .env path: {env_path}")
    print(f"[DEBUG] .env exists: {env_path.exists()}")
    print(f"[DEBUG] DATABASE_URL from env: {DATABASE_URL}")

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

@asynccontextmanager
async def get_connection() -> Any:
    if not DATABASE_URL:
        raise RuntimeError("DATABASE_URL is not set")
    async with await psycopg.AsyncConnection.connect(DATABASE_URL) as conn:
        yield conn
