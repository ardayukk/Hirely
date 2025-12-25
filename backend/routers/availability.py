from fastapi import APIRouter, HTTPException
from backend.db import get_connection

router = APIRouter(prefix="/availability", tags=["availability"])


@router.get("/{freelancer_id}")
async def get_freelancer_availability(freelancer_id: int):
    """
    Get all availability slots for a freelancer.
    Returns slots with booking status.
    """
    async with get_connection() as conn:
        async with conn.cursor() as cur:
            # Verify freelancer exists
            await cur.execute('SELECT user_id FROM "Freelancer" WHERE user_id = %s', (freelancer_id,))
            if not await cur.fetchone():
                raise HTTPException(status_code=404, detail="Freelancer not found")

            # Fetch availability slots
            await cur.execute(
                """
                SELECT slot_id, freelancer_id, start_time, end_time, is_booked, booked_by_order_id, created_at
                FROM "AvailabilitySlot"
                WHERE freelancer_id = %s
                ORDER BY start_time
                """,
                (freelancer_id,)
            )
            rows = await cur.fetchall()
            
            slots = []
            for row in rows:
                slots.append({
                    "slot_id": row[0],
                    "freelancer_id": row[1],
                    "start_time": row[2].isoformat() if row[2] else None,
                    "end_time": row[3].isoformat() if row[3] else None,
                    "is_booked": row[4],
                    "booked_by_order_id": row[5],
                    "created_at": row[6].isoformat() if row[6] else None,
                })
            
            return slots
