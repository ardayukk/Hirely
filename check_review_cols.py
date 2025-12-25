import os
import psycopg
from pathlib import Path
from dotenv import load_dotenv

# Load env vars
backend_env_path = Path(__file__).parent / 'backend' / '.env'
load_dotenv(dotenv_path=backend_env_path)

DATABASE_URL = os.getenv("DATABASE_URL")
if not DATABASE_URL:
    # Construct from parts if URL not found
    DB_NAME = os.getenv("DB_NAME", "hirelydb")
    DB_USER = os.getenv("DB_USER", "postgres")
    DB_PASSWORD = os.getenv("DB_PASSWORD", "your_password")
    DB_HOST = os.getenv("DB_HOST", "localhost")
    DB_PORT = os.getenv("DB_PORT", "5432")
    DATABASE_URL = f"postgresql://{DB_USER}:{DB_PASSWORD}@{DB_HOST}:{DB_PORT}/{DB_NAME}"

print(f"Connecting to database...")

try:
    with psycopg.connect(DATABASE_URL) as conn:
        with conn.cursor() as cur:
            cur.execute("""
                SELECT column_name, is_nullable
                FROM information_schema.columns 
                WHERE table_name = 'Review';
            """)
            columns = cur.fetchall()
            print("Columns in Review:")
            for col in columns:
                print(f"- {col[0]} (Nullable: {col[1]})")
except Exception as e:
    print(f"Error: {e}")
