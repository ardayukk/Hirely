import psycopg2

conn = psycopg2.connect('postgresql://gokdes:12345@localhost:5432/hirelydb')
cur = conn.cursor()
cur.execute('SELECT order_id, client_id, freelancer_id, status FROM "Order" ORDER BY order_id')
rows = cur.fetchall()
print("Orders in database:")
for row in rows:
    print(f'Order {row[0]}: client_id={row[1]}, freelancer_id={row[2]}, status={row[3]}')
cur.close()
conn.close()
