import os
import asyncio
import requests
import psycopg
from backend.db import get_connection

API_BASE = os.environ.get("API_BASE", "http://127.0.0.1:8000/api")
ORDER_ID = int(os.environ.get("ORDER_ID", "1"))
CLIENT_ID = int(os.environ.get("CLIENT_ID", "1"))

async def fetch_wallet_balance(user_id: int) -> float:
    async with get_connection() as conn:
        async with conn.cursor() as cur:
            await cur.execute('SELECT wallet_balance FROM "NonAdmin" WHERE user_id = %s', (user_id,))
            row = await cur.fetchone()
            return float(row[0]) if row and row[0] is not None else 0.0

async def fetch_payment_status(order_id: int):
    async with get_connection() as conn:
        async with conn.cursor() as cur:
            await cur.execute(
                '''
                SELECT p.payment_id, p.amount, p.released, fo.freelancer_id
                FROM finish_order fo
                JOIN "Payment" p ON fo.payment_id = p.payment_id
                WHERE fo.order_id = %s
                ''',
                (order_id,),
            )
            row = await cur.fetchone()
            if not row:
                return None
            return {
                "payment_id": row[0],
                "amount": float(row[1]) if isinstance(row[1], psycopg.types.numeric.Decimal) else row[1],
                "released": row[2],
                "freelancer_id": row[3],
            }

async def main():
    # pre-state
    payment = await fetch_payment_status(ORDER_ID)
    if not payment:
        print(f"No payment/finish_order found for order {ORDER_ID}")
        return
    freelancer_id = payment["freelancer_id"]
    before_wallet = await fetch_wallet_balance(freelancer_id)
    print(f"Before: released={payment['released']}, freelancer_wallet={before_wallet}")

    # call complete endpoint (approve & release)
    resp = requests.patch(f"{API_BASE}/orders/{ORDER_ID}/complete", params={"client_id": CLIENT_ID})
    print("complete status", resp.status_code, resp.text)

    # post-state
    payment_after = await fetch_payment_status(ORDER_ID)
    after_wallet = await fetch_wallet_balance(freelancer_id)
    detail = requests.get(f"{API_BASE}/orders/{ORDER_ID}").json()

    print(f"After: released={payment_after['released']}, freelancer_wallet={after_wallet}")
    print(f"Order status: {detail.get('status')}")

if __name__ == "__main__":
    asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
    asyncio.run(main())
