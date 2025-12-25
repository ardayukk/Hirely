from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from decimal import Decimal
from backend.db import get_connection

router = APIRouter(prefix="/warranty", tags=["warranty"])


class WarrantyClaimRequest(BaseModel):
    description: str = ""


@router.get("/{order_id}")
async def get_warranty_for_order(order_id: int):
    """
    Get warranty details and claims for an order.
    """
    async with get_connection() as conn:
        async with conn.cursor() as cur:
            # Verify order exists and get service_id
            await cur.execute('SELECT service_id FROM "Order" WHERE order_id = %s', (order_id,))
            order_row = await cur.fetchone()
            if not order_row:
                raise HTTPException(status_code=404, detail="Order not found")
            
            service_id = order_row[0]

            # Fetch warranty for this service
            await cur.execute(
                """
                SELECT warranty_id, service_id, duration_days, issued_date, expiry_date, terms, created_at
                FROM "ServiceWarranty"
                WHERE service_id = %s
                LIMIT 1
                """,
                (service_id,)
            )
            warranty_row = await cur.fetchone()
            
            if not warranty_row:
                raise HTTPException(status_code=404, detail="No warranty found for this service")
            
            warranty = {
                "warranty_id": warranty_row[0],
                "service_id": warranty_row[1],
                "duration_days": warranty_row[2],
                "issued_date": warranty_row[3].isoformat() if warranty_row[3] else None,
                "expiry_date": warranty_row[4].isoformat() if warranty_row[4] else None,
                "terms": warranty_row[5],
                "created_at": warranty_row[6].isoformat() if warranty_row[6] else None,
            }

            # Fetch warranty claims for this warranty
            await cur.execute(
                """
                SELECT claim_id, warranty_id, claim_date, description, status, resolution
                FROM "WarrantyClaim"
                WHERE warranty_id = %s
                ORDER BY claim_date DESC
                """,
                (warranty_row[0],)
            )
            claim_rows = await cur.fetchall()
            
            claims = []
            for claim_row in claim_rows:
                claims.append({
                    "claim_id": claim_row[0],
                    "warranty_id": claim_row[1],
                    "claim_date": claim_row[2].isoformat() if claim_row[2] else None,
                    "description": claim_row[3],
                    "status": claim_row[4],
                    "resolution": claim_row[5],
                })
            
            return {
                "warranty": warranty,
                "claims": claims,
            }


@router.post("/{order_id}/claim")
async def file_warranty_claim(order_id: int, claim_data: WarrantyClaimRequest):
    """
    File a warranty claim for an order.
    """
    async with get_connection() as conn:
        async with conn.cursor() as cur:
            # Get service_id from order
            await cur.execute('SELECT service_id FROM "Order" WHERE order_id = %s', (order_id,))
            order_row = await cur.fetchone()
            if not order_row:
                raise HTTPException(status_code=404, detail="Order not found")
            
            service_id = order_row[0]

            # Get warranty for this service
            await cur.execute(
                'SELECT warranty_id FROM "ServiceWarranty" WHERE service_id = %s',
                (service_id,)
            )
            warranty_row = await cur.fetchone()
            if not warranty_row:
                raise HTTPException(status_code=404, detail="No warranty found for this service")
            
            warranty_id = warranty_row[0]
            description = claim_data.description

            try:
                # Insert warranty claim
                await cur.execute(
                    """
                    INSERT INTO "WarrantyClaim" (warranty_id, claim_date, description, status)
                    VALUES (%s, NOW(), %s, %s)
                    RETURNING claim_id
                    """,
                    (warranty_id, description, "pending")
                )
                claim_id = (await cur.fetchone())[0]
                await conn.commit()
                
                return {
                    "claim_id": claim_id,
                    "message": "Warranty claim filed successfully"
                }
            except Exception as e:
                await conn.rollback()
                raise HTTPException(status_code=400, detail=str(e))
