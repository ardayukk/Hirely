import asyncio
from backend.db import get_connection

asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())

async def main():
    async with get_connection() as conn:
        async with conn.cursor() as cur:
            await cur.execute('ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS required_hours INTEGER')
            await conn.commit()
    print('required_hours ensured')

asyncio.run(main())
