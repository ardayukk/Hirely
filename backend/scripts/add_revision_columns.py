import os
import psycopg
from dotenv import load_dotenv

load_dotenv()

DB_NAME = os.getenv("DB_NAME", "hirelydb")
DB_USER = os.getenv("DB_USER", "postgres")
DB_PASSWORD = os.getenv("DB_PASSWORD", "your_password")
DB_HOST = os.getenv("DB_HOST", "localhost")
DB_PORT = os.getenv("DB_PORT", "5432")

SQL = (
    """
    DO $$
    BEGIN
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_name = 'Order' AND column_name = 'included_revision_limit'
        ) THEN
            EXECUTE 'ALTER TABLE "Order" ADD COLUMN included_revision_limit INTEGER';
        END IF;

        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_name = 'Order' AND column_name = 'extra_revisions_purchased'
        ) THEN
            EXECUTE 'ALTER TABLE "Order" ADD COLUMN extra_revisions_purchased INTEGER';
        END IF;

        BEGIN
            EXECUTE 'ALTER TABLE "Order" ALTER COLUMN extra_revisions_purchased SET DEFAULT 0';
        EXCEPTION WHEN others THEN NULL; END;

        BEGIN
            EXECUTE 'ALTER TABLE "Order" ALTER COLUMN included_revision_limit SET DEFAULT 1';
        EXCEPTION WHEN others THEN NULL; END;

        EXECUTE 'UPDATE "Order" SET extra_revisions_purchased = COALESCE(extra_revisions_purchased, 0)';
    END $$;
    """
)

def run():
    try:
        print(f"Connecting to {DB_NAME}...")
        with psycopg.connect(
            dbname=DB_NAME,
            user=DB_USER,
            password=DB_PASSWORD,
            host=DB_HOST,
            port=DB_PORT,
        ) as conn:
            with conn.cursor() as cur:
                print("Applying column migration for revision policy...")
                cur.execute(SQL)
            conn.commit()
        print("Migration completed.")
    except Exception as e:
        print(f"Migration failed: {e}")
        raise

if __name__ == "__main__":
    run()
