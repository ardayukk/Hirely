import os
import psycopg
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")
DB_NAME = os.getenv("DB_NAME")
DB_USER = os.getenv("DB_USER")
DB_PASSWORD = os.getenv("DB_PASSWORD")
DB_HOST = os.getenv("DB_HOST", "localhost")
DB_PORT = os.getenv("DB_PORT", "5432")

SQL = (
    """
    DO $$
    BEGIN
        -- Ensure columns exist
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

        -- Defaults (ignore errors if already set)
        BEGIN
            EXECUTE 'ALTER TABLE "Order" ALTER COLUMN extra_revisions_purchased SET DEFAULT 0';
        EXCEPTION WHEN others THEN NULL; END;

        BEGIN
            EXECUTE 'ALTER TABLE "Order" ALTER COLUMN included_revision_limit SET DEFAULT 1';
        EXCEPTION WHEN others THEN NULL; END;

        -- Normalize existing rows
        EXECUTE 'UPDATE "Order" SET extra_revisions_purchased = COALESCE(extra_revisions_purchased, 0)';

        -- Backfill included_revision_limit by service package tier when possible
        EXECUTE '
            UPDATE "Order" o
            SET included_revision_limit = CASE LOWER(COALESCE(s.package_tier, ''''))
                WHEN ''premium'' THEN NULL    -- unlimited
                WHEN ''standard'' THEN 3
                WHEN ''basic'' THEN 1
                ELSE 1
            END
            FROM make_order mo
            JOIN "Service" s ON mo.service_id = s.service_id
            WHERE mo.order_id = o.order_id
              AND o.included_revision_limit IS NULL
        ';

        -- Default any remaining NULLs to 1 unless associated service is premium
        EXECUTE '
            UPDATE "Order" o
            SET included_revision_limit = 1
            WHERE o.included_revision_limit IS NULL
              AND NOT EXISTS (
                SELECT 1 FROM make_order mo
                JOIN "Service" s ON mo.service_id = s.service_id
                WHERE mo.order_id = o.order_id AND LOWER(COALESCE(s.package_tier, '''')) = ''premium''
              )
        ';

        -- Non-negative check constraint (skip if exists)
        IF NOT EXISTS (
            SELECT 1 FROM pg_constraint WHERE conname = 'order_extra_revisions_purchased_nonneg'
        ) THEN
            BEGIN
                EXECUTE 'ALTER TABLE "Order" ADD CONSTRAINT order_extra_revisions_purchased_nonneg CHECK (extra_revisions_purchased >= 0)';
            EXCEPTION WHEN others THEN NULL; END;
        END IF;
    END $$;
    """
)

def connect():
    if DATABASE_URL:
        print("Connecting via DATABASE_URL…")
        return psycopg.connect(DATABASE_URL)
    if DB_NAME and DB_USER and DB_PASSWORD:
        print(f"Connecting to {DB_NAME} at {DB_HOST}:{DB_PORT}…")
        return psycopg.connect(dbname=DB_NAME, user=DB_USER, password=DB_PASSWORD, host=DB_HOST, port=DB_PORT)
    raise RuntimeError("Missing DB credentials. Set DATABASE_URL or DB_NAME/DB_USER/DB_PASSWORD.")


def run():
    try:
        with connect() as conn:
            with conn.cursor() as cur:
                print("Applying revision policy migration…")
                cur.execute(SQL)
            conn.commit()
        print("Migration completed.")
    except Exception as e:
        print(f"Migration failed: {e}")
        raise

if __name__ == "__main__":
    run()
