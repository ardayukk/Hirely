import asyncio
import os
from datetime import date, timedelta
from dotenv import load_dotenv
import psycopg

load_dotenv()

# Database credentials
db_config = {
    "host": os.getenv("DB_HOST", "localhost"),
    "port": os.getenv("DB_PORT", "5432"),
    "user": os.getenv("DB_USER", "postgres"),
    "password": os.getenv("DB_PASSWORD", "bilkent.31"),
    "dbname": os.getenv("DB_NAME", "hirelydb"),
}

async def aggregate_daily_metrics(target_date: date):
    print(f"Aggregating metrics for {target_date}...")
    
    conn = await psycopg.AsyncConnection.connect(**db_config)
    async with conn:
        async with conn.cursor() as cur:
            # Aggregate views, clicks, orders, impressions
            await cur.execute(
                """
                INSERT INTO "ServiceDailyMetric" (service_id, date, views_count, clicks_count, orders_count, impressions_count, total_earnings)
                SELECT 
                    service_id,
                    %s,
                    COUNT(*) FILTER (WHERE event_type = 'VIEW'),
                    COUNT(*) FILTER (WHERE event_type = 'CLICK'),
                    COUNT(*) FILTER (WHERE event_type = 'ORDER_CONVERSION'),
                    COUNT(*) FILTER (WHERE event_type = 'SEARCH_IMPRESSION'),
                    COALESCE(SUM((metadata->>'amount')::numeric) FILTER (WHERE event_type = 'ORDER_CONVERSION'), 0)
                FROM "ServiceEvent"
                WHERE date(created_at) = %s
                GROUP BY service_id
                ON CONFLICT (service_id, date) 
                DO UPDATE SET
                    views_count = EXCLUDED.views_count,
                    clicks_count = EXCLUDED.clicks_count,
                    orders_count = EXCLUDED.orders_count,
                    impressions_count = EXCLUDED.impressions_count,
                    total_earnings = EXCLUDED.total_earnings;
                """,
                (target_date, target_date)
            )
            
            # Calculate conversion rate and CTR
            await cur.execute(
                """
                UPDATE "ServiceDailyMetric"
                SET 
                    conversion_rate = CASE 
                        WHEN views_count > 0 THEN orders_count::decimal / views_count 
                        ELSE 0 
                    END,
                    ctr = CASE 
                        WHEN impressions_count > 0 THEN clicks_count::decimal / impressions_count 
                        ELSE 0 
                    END
                WHERE date = %s;
                """,
                (target_date,)
            )
            
            print(f"✅ Aggregation for {target_date} completed.")

async def aggregate_category_metrics(target_date: date):
    print(f"Aggregating category metrics for {target_date}...")
    conn = await psycopg.AsyncConnection.connect(**db_config)
    async with conn:
        async with conn.cursor() as cur:
            await cur.execute(
                """
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
                WHERE DATE(o.order_date) = %s AND o.status != 'cancelled'
                GROUP BY 1, 2
                ON CONFLICT (metric_date, category) 
                DO UPDATE SET
                    total_orders = EXCLUDED.total_orders,
                    total_revenue = EXCLUDED.total_revenue,
                    avg_order_value = EXCLUDED.avg_order_value,
                    unique_buyers = EXCLUDED.unique_buyers;
                """,
                (target_date,)
            )
            print(f"✅ Category metrics aggregated for {target_date}")

async def main():
    # Aggregate for today and yesterday to ensure data is up to date
    today = date.today()
    yesterday = today - timedelta(days=1)
    
    await aggregate_daily_metrics(yesterday)
    await aggregate_daily_metrics(today)
    
    await aggregate_category_metrics(yesterday)
    await aggregate_category_metrics(today)

if __name__ == "__main__":
    if os.name == 'nt':
        asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
    asyncio.run(main())
