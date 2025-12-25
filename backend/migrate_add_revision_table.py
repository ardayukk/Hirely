#!/usr/bin/env python3
"""
Add Revision table to store revision request details and context.
This allows freelancers to see what needs to be revised.
"""

import asyncio
from backend.db import get_connection

async def add_revision_table():
    async with get_connection() as conn:
        async with conn.cursor() as cur:
            # Create Revision table
            await cur.execute('''
                CREATE TABLE IF NOT EXISTS "Revision" (
                    revision_id SERIAL PRIMARY KEY,
                    order_id INTEGER NOT NULL,
                    client_id INTEGER NOT NULL,
                    freelancer_id INTEGER NOT NULL,
                    revision_no INTEGER NOT NULL,
                    revision_text TEXT NOT NULL,
                    status TEXT DEFAULT 'requested',
                    created_at TIMESTAMPTZ DEFAULT NOW(),
                    resolved_at TIMESTAMPTZ,
                    FOREIGN KEY (order_id) REFERENCES "Order" (order_id) ON DELETE CASCADE,
                    FOREIGN KEY (client_id) REFERENCES "Client" (user_id) ON DELETE CASCADE,
                    FOREIGN KEY (freelancer_id) REFERENCES "Freelancer" (user_id) ON DELETE CASCADE
                );
            ''')
            
            # Add status constraint
            await cur.execute('''
                DO $$ BEGIN 
                    ALTER TABLE "Revision" ADD CONSTRAINT revision_status_check 
                    CHECK (status IN ('requested', 'in_progress', 'resolved')); 
                EXCEPTION WHEN duplicate_object THEN NULL; END $$;
            ''')
            
            # Create index for faster lookups
            await cur.execute('''
                CREATE INDEX IF NOT EXISTS idx_revision_order_id ON "Revision" (order_id);
            ''')
            
            # Add column to Order table to track last revision ID
            await cur.execute('''
                ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS last_revision_id INTEGER;
            ''')
            
            await conn.commit()
            print("✅ Revision table created successfully")

if __name__ == "__main__":
    asyncio.run(add_revision_table())