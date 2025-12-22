import asyncio
import os
import psycopg

from backend.db import get_connection

asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())

async def main():
    async with get_connection() as conn:
        async with conn.cursor() as cur:
            await cur.execute('ALTER TABLE "Payment" ADD COLUMN IF NOT EXISTS released BOOLEAN DEFAULT FALSE')
            await conn.commit()
    print("Payment.released ensured")

if __name__ == "__main__":
    asyncio.run(main())
