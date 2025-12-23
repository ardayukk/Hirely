import psycopg

DDL = [
    'ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS included_revision_limit INTEGER',
    'ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS extra_revisions_purchased INTEGER NOT NULL DEFAULT 0',
    'ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS required_hours INTEGER',
    'ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS requirements TEXT',
]

if __name__ == '__main__':
    dsn = 'postgresql://gokdes:12345@localhost:5432/hirelydb'
    print('Connecting to', dsn)
    with psycopg.connect(dsn) as conn:
        with conn.cursor() as cur:
            for stmt in DDL:
                print('Running:', stmt)
                cur.execute(stmt)
            conn.commit()
            print('✅ Order columns ensured')
            cur.execute("SELECT column_name FROM information_schema.columns WHERE table_name = 'Order' ORDER BY column_name")
            cols = [r[0] for r in cur.fetchall()]
            print('Columns now:', ', '.join(cols))
