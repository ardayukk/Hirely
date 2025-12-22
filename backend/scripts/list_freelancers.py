import os
from pathlib import Path
from dotenv import load_dotenv
import psycopg

ROOT = Path(__file__).resolve().parents[2]
ENV = ROOT / ".env"
if ENV.exists():
    load_dotenv(ENV)
else:
    load_dotenv()

db_url = os.getenv("DATABASE_URL")
if not db_url:
    db_url = f"postgresql://{os.getenv('DB_USER')}:{os.getenv('DB_PASSWORD')}@{os.getenv('DB_HOST','localhost')}:{os.getenv('DB_PORT','5432')}/{os.getenv('DB_NAME')}"

conn = psycopg.connect(db_url)
cur = conn.cursor()
cur.execute('SELECT f.user_id, na.name FROM "Freelancer" f JOIN "NonAdmin" na ON f.user_id = na.user_id ORDER BY f.user_id')
rows = cur.fetchall()
print("Freelancers:")
for r in rows:
    print(f"  id={r[0]}, name={r[1]}")
cur.close(); conn.close()
