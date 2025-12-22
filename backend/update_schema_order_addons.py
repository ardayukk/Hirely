import asyncio
import os
from dotenv import load_dotenv
import psycopg

load_dotenv()

DB_NAME = os.getenv("DB_NAME", "hirelydb")
DB_USER = os.getenv("DB_USER", "postgres")
DB_PASSWORD = os.getenv("DB_PASSWORD", "your_password")
DB_HOST = os.getenv("DB_HOST", "localhost")
DB_PORT = os.getenv("DB_PORT", "5432")


async def add_order_addons_table():
    conn = await psycopg.AsyncConnection.connect(
        dbname=DB_NAME,
        user=DB_USER,
        password=DB_PASSWORD,
        host=DB_HOST,
        port=DB_PORT,
        autocommit=True
    )
    async with conn:
        async with conn.cursor() as cur:
            try:
                await cur.execute(
                    'CREATE TABLE IF NOT EXISTS order_addon (order_id INTEGER NOT NULL, addon_service_id INTEGER NOT NULL, PRIMARY KEY (order_id, addon_service_id), FOREIGN KEY (order_id) REFERENCES "Order"(order_id) ON DELETE CASCADE, FOREIGN KEY (addon_service_id) REFERENCES "Service"(service_id) ON DELETE CASCADE)'
                )
                print("Successfully ensured 'order_addon' table exists.")
            except Exception as e:
                print(f"Error: {e}")


if __name__ == "__main__":
    if os.name == 'nt':
        asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
    asyncio.run(add_order_addons_table())
