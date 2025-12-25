import psycopg

conn = psycopg.connect('postgresql://gokdes:12345@localhost:5432/hirelydb')
cur = conn.cursor()
cur.execute("SELECT column_name FROM information_schema.columns WHERE table_name = 'Service'")
cols = cur.fetchall()
print('\n'.join([c[0] for c in cols]))
conn.close()
