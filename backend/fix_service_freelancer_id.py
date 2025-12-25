import asyncio
import sys
sys.path.insert(0, '.')

from backend.db import get_connection

async def fix_service_table():
    async with get_connection() as conn:
        async with conn.cursor() as cur:
            # Check if column exists
            await cur.execute("""
                SELECT column_name 
                FROM information_schema.columns 
                WHERE table_name = 'Service' AND column_name = 'freelancer_id'
            """)
            exists = await cur.fetchone()
            
            if not exists:
                print("Adding freelancer_id column to Service table...")
                await cur.execute("""
                    ALTER TABLE "Service" ADD COLUMN freelancer_id INTEGER;
                """)
                
                # Update existing services with freelancer_id from create_service table
                await cur.execute("""
                    UPDATE "Service" s
                    SET freelancer_id = cs.freelancer_id
                    FROM create_service cs
                    WHERE s.service_id = cs.service_id
                """)
                
                # Make it NOT NULL after populating
                await cur.execute("""
                    ALTER TABLE "Service" ALTER COLUMN freelancer_id SET NOT NULL;
                """)
                
                await conn.commit()
                print("✓ Successfully added freelancer_id column")
            else:
                print("✓ freelancer_id column already exists")

if __name__ == "__main__":
    asyncio.run(fix_service_table())
