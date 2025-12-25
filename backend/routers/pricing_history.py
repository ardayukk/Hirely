from fastapi import APIRouter, HTTPException
from decimal import Decimal
from backend.db import get_connection

router = APIRouter(prefix="/pricing-history", tags=["pricing"])


@router.get("/{service_id}")
async def get_pricing_history(service_id: int):
    """
    Get pricing history for a service showing all price changes over time.
    """
    async with get_connection() as conn:
        async with conn.cursor() as cur:
            # Verify service exists
            await cur.execute('SELECT service_id FROM "Service" WHERE service_id = %s', (service_id,))
            if not await cur.fetchone():
                raise HTTPException(status_code=404, detail="Service not found")

            # Fetch pricing history, ordered by effective_from desc (newest first)
            await cur.execute(
                """
                SELECT history_id, service_id, price, demand_multiplier, active_orders_count, 
                       effective_from, effective_until, reason
                FROM "PricingHistory"
                WHERE service_id = %s
                ORDER BY effective_from DESC
                """,
                (service_id,)
            )
            rows = await cur.fetchall()
            
            history = []
            for row in rows:
                history.append({
                    "history_id": row[0],
                    "service_id": row[1],
                    "price": float(row[2]) if isinstance(row[2], Decimal) else row[2],
                    "demand_multiplier": float(row[3]) if isinstance(row[3], Decimal) else row[3],
                    "active_orders_count": row[4],
                    "effective_from": row[5].isoformat() if row[5] else None,
                    "effective_until": row[6].isoformat() if row[6] else None,
                    "reason": row[7],
                })
            
            return history
