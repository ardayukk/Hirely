import psycopg

dsn = "postgresql://gokdes:12345@localhost:5432/hirelydb"
with psycopg.connect(dsn) as conn:
    with conn.cursor() as cur:
        cur.execute("""
            SELECT conname
            FROM pg_constraint
            WHERE conrelid = '"Order"'::regclass
            ORDER BY conname
        """)
        print("Constraints on Order:")
        for (name,) in cur.fetchall():
            print(" -", name)
