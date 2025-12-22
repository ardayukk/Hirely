import psycopg
import os
from dotenv import load_dotenv

load_dotenv()

# Database credentials
db_config = {
    "host": os.getenv("DB_HOST", "localhost"),
    "port": os.getenv("DB_PORT", "5432"),
    "user": os.getenv("DB_USER", "postgres"),
    "password": os.getenv("DB_PASSWORD", "bilkent.31"),
    "dbname": os.getenv("DB_NAME", "hirelydb"),
}

def run_migration():
    migration_file = os.path.join(os.path.dirname(__file__), 'migrate_add_impressions.sql')
    
    with open(migration_file, 'r') as f:
        migration_sql = f.read()

    try:
        print("Connecting to database...")
        conn = psycopg.connect(**db_config)
        cur = conn.cursor()
        
        print("Running impressions migration...")
        cur.execute(migration_sql)
        conn.commit()
        
        print("✅ Impressions migration completed successfully!")
        
        cur.close()
        conn.close()
    except Exception as e:
        print(f"❌ Migration failed: {e}")

if __name__ == "__main__":
    run_migration()
