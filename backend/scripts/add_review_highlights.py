import asyncio
from backend.db import get_connection

asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())

async def main():
    async with get_connection() as conn:
        async with conn.cursor() as cur:
            await cur.execute('ALTER TABLE "Review" ADD COLUMN IF NOT EXISTS highlights TEXT')
            await conn.commit()
    print('Review.highlights ensured')

if __name__ == '__main__':
    asyncio.run(main())
