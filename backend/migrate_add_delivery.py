import asyncio
import sys
import os

# Add parent directory to path to import backend modules
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from backend.db import get_connection

async def migrate():
    async with get_connection() as conn:
        async with conn.cursor() as cur:
            print("Creating Delivery table...")
            await cur.execute('''
                CREATE TABLE IF NOT EXISTS "Delivery" (
                    delivery_id SERIAL PRIMARY KEY,
                    order_id INTEGER NOT NULL,
                    freelancer_id INTEGER NOT NULL,
                    message TEXT,
                    delivered_at TIMESTAMPTZ DEFAULT NOW(),
                    FOREIGN KEY (order_id) REFERENCES "Order"(order_id) ON DELETE CASCADE,
                    FOREIGN KEY (freelancer_id) REFERENCES "Freelancer"(user_id) ON DELETE CASCADE
                );
            ''')

            print("Creating DeliveryFile table...")
            await cur.execute('''
                CREATE TABLE IF NOT EXISTS "DeliveryFile" (
                    file_id SERIAL PRIMARY KEY,
                    delivery_id INTEGER NOT NULL,
                    file_path TEXT NOT NULL,
                    file_name TEXT NOT NULL,
                    FOREIGN KEY (delivery_id) REFERENCES "Delivery"(delivery_id) ON DELETE CASCADE
                );
            ''')
            
            await conn.commit()
            print("Migration complete.")

if __name__ == "__main__":
    if sys.platform == 'win32':
        import asyncio
        asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
    asyncio.run(migrate())
