from typing import List
from fastapi import APIRouter, HTTPException, Query
from datetime import datetime

from backend.db import get_connection
from backend.schemas.deliverable import DeliverableCreate, DeliverablePublic

router = APIRouter(prefix="/orders", tags=["deliverables"])


@router.post("/{order_id}/deliverables", response_model=DeliverablePublic, status_code=201)
async def create_deliverable(
    order_id: int,
    deliverable: DeliverableCreate,
    freelancer_id: int = Query(...),
):
    """Create a deliverable for a BigOrder (milestone)"""
    async with get_connection() as conn:
        async with conn.cursor() as cur:
            try:
                # Verify order is a BigOrder and belongs to freelancer
                await cur.execute(
                    '''
                    SELECT bo.order_id FROM "BigOrder" bo
                    JOIN finish_order fo ON bo.order_id = fo.order_id
                    WHERE bo.order_id = %s AND fo.freelancer_id = %s
                    ''',
                    (order_id, freelancer_id),
                )
                if not await cur.fetchone():
                    raise HTTPException(status_code=403, detail="BigOrder not found or access denied")

                await cur.execute(
                    '''
                    INSERT INTO "Deliverable" (order_id, description, due_date, payment_amount, status)
                    VALUES (%s, %s, %s, %s, %s)
                    RETURNING deliverable_id
                    ''',
                    (order_id, deliverable.description, deliverable.due_date, deliverable.payment_amount, 'pending'),
                )
                deliverable_id = (await cur.fetchone())[0]
                await conn.commit()

                return DeliverablePublic(
                    deliverable_id=deliverable_id,
                    order_id=order_id,
                    description=deliverable.description,
                    due_date=deliverable.due_date,
                    payment_amount=deliverable.payment_amount,
                    status='pending',
                )
            except HTTPException:
                await conn.rollback()
                raise
            except Exception as e:
                await conn.rollback()
                raise HTTPException(status_code=400, detail=f"Failed to create deliverable: {str(e)}")


@router.get("/{order_id}/deliverables", response_model=List[DeliverablePublic])
async def list_deliverables(order_id: int):
    """Get all deliverables for a BigOrder"""
    async with get_connection() as conn:
        async with conn.cursor() as cur:
            await cur.execute(
                '''
                SELECT deliverable_id, order_id, description, due_date, payment_amount, status
                FROM "Deliverable"
                WHERE order_id = %s
                ORDER BY deliverable_id
                ''',
                (order_id,),
            )
            rows = await cur.fetchall()
            return [
                DeliverablePublic(
                    deliverable_id=row[0],
                    order_id=row[1],
                    description=row[2],
                    due_date=row[3],
                    payment_amount=float(row[4]) if row[4] else None,
                    status=row[5],
                )
                for row in rows
            ]


@router.patch("/{order_id}/deliverables/{deliverable_id}", response_model=DeliverablePublic)
async def update_deliverable(
    order_id: int,
    deliverable_id: int,
    status: str = Query(...),
):
    """Update deliverable status (pending, in_progress, completed)"""
    async with get_connection() as conn:
        async with conn.cursor() as cur:
            try:
                await cur.execute(
                    'SELECT deliverable_id FROM "Deliverable" WHERE deliverable_id = %s AND order_id = %s',
                    (deliverable_id, order_id),
                )
                if not await cur.fetchone():
                    raise HTTPException(status_code=404, detail="Deliverable not found")

                await cur.execute(
                    '''
                    UPDATE "Deliverable" SET status = %s WHERE deliverable_id = %s
                    RETURNING deliverable_id, order_id, description, due_date, payment_amount, status
                    ''',
                    (status, deliverable_id),
                )
                row = await cur.fetchone()
                await conn.commit()

                return DeliverablePublic(
                    deliverable_id=row[0],
                    order_id=row[1],
                    description=row[2],
                    due_date=row[3],
                    payment_amount=float(row[4]) if row[4] else None,
                    status=row[5],
                )
            except HTTPException:
                await conn.rollback()
                raise
            except Exception as e:
                await conn.rollback()
                raise HTTPException(status_code=400, detail=f"Failed to update deliverable: {str(e)}")
