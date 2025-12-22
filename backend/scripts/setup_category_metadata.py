import psycopg
import os
from dotenv import load_dotenv

load_dotenv()

db_config = {
    "host": os.getenv("DB_HOST", "localhost"),
    "port": os.getenv("DB_PORT", "5432"),
    "user": os.getenv("DB_USER", "postgres"),
    "password": os.getenv("DB_PASSWORD", "bilkent.31"),
    "dbname": os.getenv("DB_NAME", "hirelydb"),
}

def run_migration():
    try:
        print("Connecting to database...")
        with psycopg.connect(**db_config) as conn:
            with conn.cursor() as cur:
                print("Applying schema migration for CategoryMetadata...")
                with open("backend/migrate_add_category_metadata.sql", "r") as f:
                    migration_sql = f.read()
                    cur.execute(migration_sql)
            
            conn.commit()
            print("Migration successful!")

    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    run_migration()
