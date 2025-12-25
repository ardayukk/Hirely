import psycopg

dsn = "postgresql://gokdes:12345@localhost:5432/hirelydb"
with psycopg.connect(dsn) as conn:
    with conn.cursor() as cur:
        cur.execute('SELECT dispute_id, order_id, client_id, status FROM "Dispute" ORDER BY dispute_id DESC LIMIT 10')
        print('Dispute rows:')
        for row in cur.fetchall():
            print(row)
        cur.execute('SELECT dispute_id, order_id, client_id, admin_id FROM reported ORDER BY dispute_id DESC LIMIT 10')
        print('Reported rows:')
        for row in cur.fetchall():
            print(row)
