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

def run_migration_and_backfill():
    try:
        print("Connecting to database...")
        with psycopg.connect(**db_config) as conn:
            with conn.cursor() as cur:
                # 1. Apply Schema Migration
                print("Applying schema migration...")
                with open("backend/migrate_add_category_analytics.sql", "r") as f:
                    migration_sql = f.read()
                    cur.execute(migration_sql)
                
                # 2. Backfill Data
                print("Backfilling historical data...")
                backfill_sql = """
                INSERT INTO "CategoryDailyMetrics" (metric_date, category, total_orders, total_revenue, avg_order_value, unique_buyers)
                SELECT
                    DATE(o.order_date) as metric_date,
                    s.category,
                    COUNT(o.order_id) as total_orders,
                    SUM(o.total_price) as total_revenue,
                    AVG(o.total_price) as avg_order_value,
                    COUNT(DISTINCT mo.client_id) as unique_buyers
                FROM "Order" o
                JOIN "make_order" mo ON o.order_id = mo.order_id
                JOIN "Service" s ON mo.service_id = s.service_id
                WHERE o.status != 'cancelled'  -- Exclude cancelled orders if needed, or keep them. Let's exclude for revenue.
                GROUP BY 1, 2
                ON CONFLICT (metric_date, category) 
                DO UPDATE SET
                    total_orders = EXCLUDED.total_orders,
                    total_revenue = EXCLUDED.total_revenue,
                    avg_order_value = EXCLUDED.avg_order_value,
                    unique_buyers = EXCLUDED.unique_buyers;
                """
                cur.execute(backfill_sql)
                print(f"Backfill complete. Rows affected: {cur.rowcount}")
            
            conn.commit()
            print("Migration and backfill successful!")

    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    run_migration_and_backfill()
