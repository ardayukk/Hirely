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

migration_sql = """
CREATE TABLE IF NOT EXISTS "ServiceEvent" (
    event_id SERIAL PRIMARY KEY,
    service_id INTEGER NOT NULL,
    user_id INTEGER,
    event_type TEXT NOT NULL,
    metadata JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    FOREIGN KEY (service_id) REFERENCES "Service"(service_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS "ServiceDailyMetric" (
    metric_id SERIAL PRIMARY KEY,
    service_id INTEGER NOT NULL,
    date DATE NOT NULL,
    views_count INTEGER DEFAULT 0,
    clicks_count INTEGER DEFAULT 0,
    orders_count INTEGER DEFAULT 0,
    conversion_rate DOUBLE PRECISION DEFAULT 0,
    avg_response_time DOUBLE PRECISION,
    avg_rating DOUBLE PRECISION,
    total_earnings DOUBLE PRECISION DEFAULT 0,
    impressions_count INTEGER DEFAULT 0,
    ctr DOUBLE PRECISION DEFAULT 0,
    UNIQUE(service_id, date),
    FOREIGN KEY (service_id) REFERENCES "Service"(service_id) ON DELETE CASCADE
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_service_event_service_id ON "ServiceEvent"(service_id);
CREATE INDEX IF NOT EXISTS idx_service_daily_metric_service_date ON "ServiceDailyMetric"(service_id, date);
"""

def run_migration():
    try:
        print("Connecting to database...")
        conn = psycopg.connect(**db_config)
        cur = conn.cursor()
        
        print("Running analytics migration...")
        cur.execute(migration_sql)
        conn.commit()
        
        print("✅ Analytics tables created successfully!")
        
        cur.close()
        conn.close()
    except Exception as e:
        print(f"❌ Migration failed: {e}")

if __name__ == "__main__":
    run_migration()
