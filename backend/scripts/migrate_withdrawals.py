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
CREATE TABLE IF NOT EXISTS "WithdrawalMethod" (
    method_id SERIAL PRIMARY KEY,
    freelancer_id INTEGER NOT NULL,
    method_type TEXT NOT NULL,
    account_holder_name TEXT NOT NULL,
    account_number TEXT,
    bank_name TEXT,
    swift_code TEXT,
    paypal_email TEXT,
    is_default BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    FOREIGN KEY (freelancer_id) REFERENCES "Freelancer"(user_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS "Withdrawal" (
    withdrawal_id SERIAL PRIMARY KEY,
    freelancer_id INTEGER NOT NULL,
    withdrawal_method_id INTEGER NOT NULL,
    amount NUMERIC(12,2) NOT NULL,
    fee NUMERIC(12,2) NOT NULL,
    net_amount NUMERIC(12,2) NOT NULL,
    status TEXT NOT NULL,
    requested_at TIMESTAMPTZ DEFAULT NOW(),
    processing_started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    notes TEXT,
    transaction_reference TEXT,
    FOREIGN KEY (freelancer_id) REFERENCES "Freelancer"(user_id) ON DELETE CASCADE,
    FOREIGN KEY (withdrawal_method_id) REFERENCES "WithdrawalMethod"(method_id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_withdrawal_freelancer ON "Withdrawal"(freelancer_id);
CREATE INDEX IF NOT EXISTS idx_withdrawalmethod_freelancer ON "WithdrawalMethod"(freelancer_id);
"""


def run_migration():
    try:
        print("Connecting to database...")
        conn = psycopg.connect(**db_config)
        cur = conn.cursor()
        
        print("Running withdrawals migration...")
        cur.execute(migration_sql)
        conn.commit()
        
        print("✅ Withdrawals tables created successfully!")
        
        cur.close()
        conn.close()
    except Exception as e:
        print(f"❌ Migration failed: {e}")

if __name__ == "__main__":
    run_migration()
