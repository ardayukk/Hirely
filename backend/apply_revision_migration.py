import os
import psycopg
from dotenv import load_dotenv

load_dotenv()

DB_NAME = os.getenv("DB_NAME", "hirelydb")
DB_USER = os.getenv("DB_USER", "postgres")
DB_PASSWORD = os.getenv("DB_PASSWORD", "bilkent.31") # Fallback to what was in migrate_db.py if env not set
DB_HOST = os.getenv("DB_HOST", "localhost")
DB_PORT = os.getenv("DB_PORT", "5432")

def run_migration():
    try:
        print("Connecting to database...")
        conn = psycopg.connect(
            dbname=DB_NAME,
            user=DB_USER,
            password=DB_PASSWORD,
            host=DB_HOST,
            port=DB_PORT
        )
        cur = conn.cursor()
        
        print("Reading migration SQL...")
        with open("migrate_add_revision_limit.sql", "r") as f:
            migration_sql = f.read()

        print("Running migration...")
        cur.execute(migration_sql)
        conn.commit()
        
        print("✅ Migration completed successfully!")
        
        cur.close()
        conn.close()
    except Exception as e:
        print(f"❌ Error running migration: {e}")

if __name__ == "__main__":
    run_migration()
