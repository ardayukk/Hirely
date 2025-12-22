import asyncio
from datetime import date, timedelta
# from backend.routers.analytics import get_category_trends, get_category_growth
# from backend.schemas.analytics import CategoryTrendMetric, CategoryGrowthMetric

# Mock database connection and cursor would be ideal here, 
# but for this environment we'll create a simple integration test script
# that hits the endpoints if the server was running, or tests the logic if we can import it.

# Since we can't easily mock the async DB connection in this simple script without more setup,
# I will create a script that verifies the data integrity in the database directly.

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

def check_data_integrity():
    print("Checking data integrity for Category Analytics...")
    try:
        with psycopg.connect(**db_config) as conn:
            with conn.cursor() as cur:
                # 1. Check if we have metrics for yesterday
                yesterday = date.today() - timedelta(days=1)
                cur.execute('SELECT COUNT(*) FROM "CategoryDailyMetrics" WHERE metric_date = %s', (yesterday,))
                count = cur.fetchone()[0]
                print(f"Metrics count for {yesterday}: {count}")
                
                if count == 0:
                    print("WARNING: No metrics found for yesterday. ETL might not have run.")
                
                # 2. Check for negative values (should not exist)
                cur.execute('SELECT COUNT(*) FROM "CategoryDailyMetrics" WHERE total_orders < 0 OR total_revenue < 0')
                neg_count = cur.fetchone()[0]
                if neg_count > 0:
                    print(f"ERROR: Found {neg_count} rows with negative values!")
                else:
                    print("✅ No negative values found.")
                
                # 3. Check consistency (revenue should be roughly orders * avg_value)
                # Allow small floating point differences
                cur.execute('''
                    SELECT COUNT(*) FROM "CategoryDailyMetrics" 
                    WHERE ABS(total_revenue - (total_orders * avg_order_value)) > 1.0
                    AND total_orders > 0
                ''')
                inconsistent_count = cur.fetchone()[0]
                if inconsistent_count > 0:
                    print(f"WARNING: Found {inconsistent_count} rows with inconsistent revenue calculations.")
                else:
                    print("✅ Revenue calculations are consistent.")

                # 4. Check Category Metadata
                cur.execute('SELECT COUNT(*) FROM "CategoryMetadata"')
                meta_count = cur.fetchone()[0]
                print(f"Category Metadata entries: {meta_count}")

    except Exception as e:
        print(f"Database connection failed: {e}")

if __name__ == "__main__":
    check_data_integrity()
