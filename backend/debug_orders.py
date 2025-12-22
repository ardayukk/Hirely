import asyncio
import os
import sys
from dotenv import load_dotenv
import psycopg

# Add parent directory to path to import backend modules
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from backend.db import get_connection

async def debug_orders():
    async with get_connection() as conn:
        async with conn.cursor() as cur:
            print("Connected to DB")
            
            # Find a freelancer
            await cur.execute('SELECT user_id FROM "Freelancer" LIMIT 1')
            row = await cur.fetchone()
            if not row:
                print("No freelancer found")
                return
            
            user_id = row[0]
            print(f"Testing with freelancer_id: {user_id}")

            query_fl = '''
                SELECT o.order_id, o.order_date, o.status, o.revision_count, o.included_revision_limit, o.extra_revisions_purchased, o.total_price, o.review_given,
                       mo.service_id, mo.client_id, fo.freelancer_id, o.required_hours, o.requirements,
                       s.title, c.display_name, na.name,
                       so.delivery_date, bo.milestone_delivery_date
                FROM "Order" o
                JOIN make_order mo ON o.order_id = mo.order_id
                JOIN "Service" s ON mo.service_id = s.service_id
                JOIN "Client" c ON mo.client_id = c.user_id
                JOIN finish_order fo ON o.order_id = fo.order_id
                JOIN "NonAdmin" na ON fo.freelancer_id = na.user_id
                LEFT JOIN "SmallOrder" so ON o.order_id = so.order_id
                LEFT JOIN "BigOrder" bo ON o.order_id = bo.order_id
                WHERE fo.freelancer_id = %s
                ORDER BY o.order_date DESC
            '''
            
            try:
                await cur.execute(query_fl, (user_id,))
                rows = await cur.fetchall()
                print(f"Query successful. Found {len(rows)} orders.")
                for r in rows:
                    print(f"Order {r[0]}: {r}")
            except Exception as e:
                print(f"Query failed: {e}")

if __name__ == "__main__":
    if sys.platform == 'win32':
        asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
    asyncio.run(debug_orders())
