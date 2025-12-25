import os
import sys
import psycopg
from dotenv import load_dotenv

# Usage: python run_sql_migration.py migrate_add_disputed_status.sql

def main():
    if len(sys.argv) < 2:
        print("Usage: python run_sql_migration.py <sql_file>")
        sys.exit(1)
    sql_file = sys.argv[1]
    if not os.path.isabs(sql_file):
        sql_file = os.path.join(os.path.dirname(__file__), sql_file)
    if not os.path.exists(sql_file):
        print(f"SQL file not found: {sql_file}")
        sys.exit(1)

    # Load env from backend/.env
    load_dotenv(os.path.join(os.path.dirname(__file__), '.env'))
    dsn = os.getenv('DATABASE_URL')
    if not dsn:
        dbname = os.getenv('DB_NAME')
        user = os.getenv('DB_USER')
        password = os.getenv('DB_PASSWORD')
        host = os.getenv('DB_HOST', 'localhost')
        port = os.getenv('DB_PORT', '5432')
        if not all([dbname, user, password]):
            print("DATABASE_URL not set and discrete DB_* env vars incomplete.")
            sys.exit(1)
        dsn = f"postgresql://{user}:{password}@{host}:{port}/{dbname}"

    print(f"Connecting to database...")
    try:
        with psycopg.connect(dsn) as conn:
            with conn.cursor() as cur:
                sql = open(sql_file, 'r', encoding='utf-8').read()
                cur.execute(sql)
                conn.commit()
        print("✅ Migration applied successfully.")
    except Exception as e:
        print(f"❌ Migration failed: {e}")
        sys.exit(1)

if __name__ == '__main__':
    main()
