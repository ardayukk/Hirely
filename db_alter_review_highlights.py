import psycopg2

DSN = 'postgresql://gokdes:12345@localhost:5432/hirelydb'

def main():
    conn = psycopg2.connect(DSN)
    cur = conn.cursor()
    cur.execute('ALTER TABLE "Review" ADD COLUMN IF NOT EXISTS highlights TEXT')
    conn.commit()
    cur.execute("SELECT column_name FROM information_schema.columns WHERE table_name='Review' ORDER BY column_name")
    cols = [r[0] for r in cur.fetchall()]
    print('Columns in Review:', cols)
    cur.close()
    conn.close()

if __name__ == '__main__':
    main()
