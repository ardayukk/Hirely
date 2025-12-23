import psycopg

DDL = [
    'ALTER TABLE "Messages" ADD COLUMN IF NOT EXISTS order_id INTEGER',
]

FK_STMT = 'ALTER TABLE "Messages" ADD CONSTRAINT IF NOT EXISTS messages_order_fk FOREIGN KEY (order_id) REFERENCES "Order"(order_id) ON DELETE CASCADE'

CHECK_COL_SQL = """
SELECT 1 FROM information_schema.columns
WHERE table_name = 'messages' AND column_name = 'order_id'
"""

CHECK_FK_SQL = """
SELECT 1 FROM information_schema.table_constraints
WHERE table_name = 'messages' AND constraint_name = 'messages_order_fk'
"""

if __name__ == '__main__':
    dsn = 'postgresql://gokdes:12345@localhost:5432/hirelydb'
    print('Connecting to', dsn)
    with psycopg.connect(dsn) as conn:
        with conn.cursor() as cur:
            print('Ensuring Messages.order_id column...')
            for stmt in DDL:
                print('Running:', stmt)
                cur.execute(stmt)
            conn.commit()

            print('Ensuring foreign key messages_order_fk...')
            try:
                cur.execute(CHECK_FK_SQL)
                fk_exists = cur.fetchone() is not None
            except Exception:
                fk_exists = False
            if not fk_exists:
                try:
                    cur.execute(FK_STMT)
                    print('Foreign key added')
                except Exception as e:
                    print('Foreign key not added:', str(e))
            conn.commit()

            cur.execute("SELECT column_name FROM information_schema.columns WHERE table_name = 'messages' ORDER BY column_name")
            cols = [r[0] for r in cur.fetchall()]
            print('Messages columns now:', ', '.join(cols))
            print('✅ Messages.order_id ensured')