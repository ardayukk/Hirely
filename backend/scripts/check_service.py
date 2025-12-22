import asyncio
from pathlib import Path
from dotenv import load_dotenv
import os
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

service_id = int(os.environ.get("SERVICE_ID", "10"))

async def main():
    print(f"Connecting to {db_url}")
    conn = psycopg.connect(db_url)
    cur = conn.cursor()
    print(f"\nChecking Service {service_id} in Service table...")
    cur.execute('SELECT service_id, title, status FROM "Service" WHERE service_id = %s', (service_id,))
    row = cur.fetchone()
    if row:
        print(f"✓ Found Service {row[0]}: '{row[1]}' status={row[2]}")
    else:
        print("✗ Not found in Service")

    print("\nChecking create_service link...")
    cur.execute('SELECT freelancer_id, date_of_creation FROM create_service WHERE service_id = %s', (service_id,))
    row = cur.fetchone()
    if row:
        print(f"✓ Link exists: freelancer {row[0]}, created {row[1]}")
    else:
        print("✗ No create_service link")

    print("\nRecent services:")
    cur.execute('SELECT service_id, title, status FROM "Service" ORDER BY service_id DESC LIMIT 5')
    for r in cur.fetchall():
        print(f"  {r[0]} - {r[1]} ({r[2]})")

    print("\nRecent create_service links:")
    cur.execute('SELECT freelancer_id, service_id, date_of_creation FROM create_service ORDER BY service_id DESC LIMIT 5')
    for r in cur.fetchall():
        print(f"  f{r[0]} -> s{r[1]} at {r[2]}")

    cur.close()
    conn.close()

if __name__ == "__main__":
    asyncio.run(main())
