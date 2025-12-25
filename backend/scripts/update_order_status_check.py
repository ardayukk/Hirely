import psycopg

dsn = "postgresql://gokdes:12345@localhost:5432/hirelydb"
sql = """
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'order_status_check') THEN
        ALTER TABLE "Order" DROP CONSTRAINT order_status_check;
    END IF;
END $$;

ALTER TABLE "Order"
ADD CONSTRAINT order_status_check
CHECK (status IN ('pending','accepted','in_progress','delivered','revision_requested','completed','cancelled','disputed'));
"""

with psycopg.connect(dsn) as conn:
    with conn.cursor() as cur:
        cur.execute(sql)
    conn.commit()

print("Updated order_status_check to include 'disputed'")
