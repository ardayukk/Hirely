import psycopg2

conn = psycopg2.connect('postgresql://gokdes:12345@localhost:5432/hirelydb')
cur = conn.cursor()
cur.execute("SELECT column_name FROM information_schema.columns WHERE table_name='Order' ORDER BY column_name")
print("Columns in Order table:")
for col in cur.fetchall():
    print(f"  - {col[0]}")
cur.close()
conn.close()
