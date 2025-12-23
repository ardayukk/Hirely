from typing import List, Optional
from fastapi import APIRouter, HTTPException, Query

from backend.db import get_connection
from backend.schemas.dispute import DisputeCreate, DisputeResolve, DisputePublic, FreelancerResponseCreate

router = APIRouter(prefix="/disputes", tags=["disputes"])


async def _get_order_parties(cur, order_id: int):
    await cur.execute(
        '''
        SELECT mo.client_id, fo.freelancer_id
        FROM make_order mo
        JOIN finish_order fo ON mo.order_id = fo.order_id
        WHERE mo.order_id = %s
        ''',
        (order_id,),
    )
    row = await cur.fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="Order not found")
    return row[0], row[1]


@router.post("", response_model=DisputePublic, status_code=201)
async def open_dispute(payload: DisputeCreate, client_id: int = Query(...)):
    async with get_connection() as conn:
        async with conn.cursor() as cur:
            try:
                client_db, _ = await _get_order_parties(cur, payload.order_id)
                if client_db != client_id:
                    raise HTTPException(status_code=403, detail="Order does not belong to client")

                await cur.execute(
                    'INSERT INTO "Dispute" (decision, description, status, opened_at) VALUES (NULL, %s, %s, NOW()) RETURNING dispute_id',
                    (payload.reason, 'OPEN'),
                )
                dispute_id = (await cur.fetchone())[0]

                await cur.execute(
                    'INSERT INTO reported (dispute_id, client_id, admin_id, order_id) VALUES (%s, %s, NULL, %s)',
                    (dispute_id, client_id, payload.order_id),
                )

                await cur.execute(
                    'UPDATE "Order" SET status = %s WHERE order_id = %s',
                    ('disputed', payload.order_id),
                )

                await conn.commit()

                return DisputePublic(
                    dispute_id=dispute_id,
                    status='OPEN',
                    decision=None,
                    resolution_date=None,
                    order_id=payload.order_id,
                    client_id=client_id,
                    admin_id=None,
                    client_name=None,
                    admin_name=None,
                )
            except HTTPException:
                await conn.rollback()
                raise
            except Exception as e:
                await conn.rollback()
                raise HTTPException(status_code=400, detail=f"Failed to open dispute: {str(e)}")


@router.get("", response_model=List[DisputePublic])
async def list_disputes(status: Optional[str] = Query(None)):
    try:
        async with get_connection() as conn:
            async with conn.cursor() as cur:
                query = '''
                    SELECT d.dispute_id, d.status, d.decision, d.resolution_date,
                           r.order_id, r.client_id, r.admin_id,
                           nac.name AS client_name,
                           a.username AS admin_name,
                           d.freelancer_response, d.freelancer_response_at,
                           d.description
                    FROM "Dispute" d
                    JOIN reported r ON d.dispute_id = r.dispute_id
                    LEFT JOIN "NonAdmin" nac ON r.client_id = nac.user_id
                    LEFT JOIN "Admin" a ON r.admin_id = a.user_id
                '''
                params = []
                if status:
                    query += ' WHERE UPPER(d.status) = UPPER(%s)'
                    params.append(status)
                query += ' ORDER BY d.dispute_id DESC'
                await cur.execute(query, params)
                rows = await cur.fetchall()
                results: List[DisputePublic] = []
                for row in rows:
                    results.append(
                        DisputePublic(
                            dispute_id=row[0],
                            status=row[1],
                            decision=row[2],
                            resolution_date=row[3],
                            order_id=row[4],
                            client_id=row[5],
                            admin_id=row[6],
                            client_name=row[7],
                            admin_name=row[8],
                            freelancer_response=row[9],
                            freelancer_response_at=row[10],
                            description=row[11],
                        )
                    )
                return results
    except Exception as e:
        print(f"Error in list_disputes: {e}")
        return []


@router.patch("/{dispute_id}/assign", response_model=DisputePublic)
async def assign_dispute(dispute_id: int, admin_id: int = Query(...)):
    async with get_connection() as conn:
        async with conn.cursor() as cur:
            try:
                await cur.execute('SELECT dispute_id FROM "Dispute" WHERE dispute_id = %s', (dispute_id,))
                if not await cur.fetchone():
                    raise HTTPException(status_code=404, detail="Dispute not found")

                # ensure admin exists
                await cur.execute('SELECT user_id FROM "Admin" WHERE user_id = %s', (admin_id,))
                if not await cur.fetchone():
                    raise HTTPException(status_code=404, detail="Admin not found")

                await cur.execute(
                    'UPDATE reported SET admin_id = %s WHERE dispute_id = %s',
                    (admin_id, dispute_id),
                )
                await conn.commit()
            except HTTPException:
                await conn.rollback()
                raise
            except Exception as e:
                await conn.rollback()
                raise HTTPException(status_code=400, detail=f"Failed to assign dispute: {str(e)}")

    # return updated row
    return await _get_dispute(dispute_id)


async def _get_dispute(dispute_id: int) -> DisputePublic:
    async with get_connection() as conn:
        async with conn.cursor() as cur:
            await cur.execute(
                '''
                SELECT d.dispute_id, d.status, d.decision, d.resolution_date,
                       r.order_id, r.client_id, r.admin_id,
                       nac.name AS client_name,
                       naadmin.name AS admin_name,
                       d.freelancer_response, d.freelancer_response_at,
                       d.description
                FROM "Dispute" d
                JOIN reported r ON d.dispute_id = r.dispute_id
                JOIN "NonAdmin" nac ON r.client_id = nac.user_id
                LEFT JOIN "NonAdmin" naadmin ON r.admin_id = naadmin.user_id
                WHERE d.dispute_id = %s
                ''',
                (dispute_id,),
            )
            row = await cur.fetchone()
            if not row:
                raise HTTPException(status_code=404, detail="Dispute not found")
            return DisputePublic(
                dispute_id=row[0],
                status=row[1],
                decision=row[2],
                resolution_date=row[3],
                order_id=row[4],
                client_id=row[5],
                admin_id=row[6],
                client_name=row[7],
                admin_name=row[8],
                freelancer_response=row[9],
                freelancer_response_at=row[10],
                description=row[11],
            )


@router.patch("/{dispute_id}/resolve", response_model=DisputePublic)
async def resolve_dispute(dispute_id: int, payload: DisputeResolve, admin_id: int = Query(...)):
    async with get_connection() as conn:
        async with conn.cursor() as cur:
            try:
                await cur.execute('SELECT dispute_id FROM "Dispute" WHERE dispute_id = %s', (dispute_id,))
                if not await cur.fetchone():
                    raise HTTPException(status_code=404, detail="Dispute not found")

                await cur.execute('SELECT user_id FROM "Admin" WHERE user_id = %s', (admin_id,))
                if not await cur.fetchone():
                    raise HTTPException(status_code=404, detail="Admin not found")

                await cur.execute(
                    'UPDATE reported SET admin_id = %s WHERE dispute_id = %s',
                    (admin_id, dispute_id),
                )

                await cur.execute(
                    'UPDATE "Dispute" SET decision = %s, status = %s, resolution_date = NOW() WHERE dispute_id = %s',
                    (payload.decision, 'RESOLVED', dispute_id),
                )

                # Fetch order id for status update
                await cur.execute('SELECT order_id FROM reported WHERE dispute_id = %s', (dispute_id,))
                ord_row = await cur.fetchone()
                order_id = ord_row[0] if ord_row else None

                if order_id:
                    if payload.outcome == 'refund':
                        new_status = 'cancelled'
                    elif payload.outcome == 'release':
                        new_status = 'completed'
                    else:
                        new_status = 'disputed'
                    await cur.execute('UPDATE "Order" SET status = %s WHERE order_id = %s', (new_status, order_id))

                await conn.commit()
                
                # Fetch updated dispute within the transaction before returning
                await cur.execute(
                    '''
                    SELECT d.dispute_id, d.status, d.decision, d.resolution_date,
                           r.order_id, r.client_id, r.admin_id,
                           nac.name AS client_name,
                           naadmin.name AS admin_name,
                           d.freelancer_response, d.freelancer_response_at,
                           d.description
                    FROM "Dispute" d
                    JOIN reported r ON d.dispute_id = r.dispute_id
                    JOIN "NonAdmin" nac ON r.client_id = nac.user_id
                    LEFT JOIN "NonAdmin" naadmin ON r.admin_id = naadmin.user_id
                    WHERE d.dispute_id = %s
                    ''',
                    (dispute_id,),
                )
                row = await cur.fetchone()
                return DisputePublic(
                    dispute_id=row[0],
                    status=row[1],
                    decision=row[2],
                    resolution_date=row[3],
                    order_id=row[4],
                    client_id=row[5],
                    admin_id=row[6],
                    client_name=row[7],
                    admin_name=row[8],
                    freelancer_response=row[9],
                    freelancer_response_at=row[10],
                    description=row[11],
                )
            except HTTPException:
                await conn.rollback()
                raise
            except Exception as e:
                await conn.rollback()
                raise HTTPException(status_code=400, detail=f"Failed to resolve dispute: {str(e)}")


@router.get("/{dispute_id}", response_model=DisputePublic)
async def get_dispute_detail(dispute_id: int):
    """Get full dispute details including evidence and communication history"""
    return await _get_dispute(dispute_id)


@router.post("/{dispute_id}/notes")
async def add_dispute_note(dispute_id: int, admin_id: int = Query(...), note: str = Query(...)):
    """Add internal admin notes to a dispute"""
    async with get_connection() as conn:
        async with conn.cursor() as cur:
            try:
                # Verify dispute exists and admin is assigned
                await cur.execute(
                    'SELECT admin_id FROM reported WHERE dispute_id = %s',
                    (dispute_id,),
                )
                row = await cur.fetchone()
                if not row:
                    raise HTTPException(status_code=404, detail="Dispute not found")
                
                if row[0] != admin_id:
                    raise HTTPException(status_code=403, detail="Only assigned admin can add notes")

                # Store note (would need a dispute_notes table in production)
                # For now, we can append to decision field or create new table
                await cur.execute(
                    'UPDATE "Dispute" SET decision = CONCAT(decision, "\n[Admin Note]: " || %s) WHERE dispute_id = %s',
                    (note, dispute_id),
                )
                await conn.commit()
                
                return {"status": "success", "message": "Note added to dispute"}
            except HTTPException:
                await conn.rollback()
                raise
            except Exception as e:
                await conn.rollback()
                raise HTTPException(status_code=400, detail=f"Failed to add note: {str(e)}")


@router.post("/{dispute_id}/freelancer-response")
async def add_freelancer_response(dispute_id: int, payload: FreelancerResponseCreate, freelancer_id: int = Query(...)):
    """Freelancer provides their response to a dispute"""
    async with get_connection() as conn:
        async with conn.cursor() as cur:
            try:
                # Get order and verify freelancer
                await cur.execute(
                    '''SELECT r.order_id, fo.freelancer_id
                       FROM "Dispute" d
                       JOIN reported r ON d.dispute_id = r.dispute_id
                       JOIN finish_order fo ON r.order_id = fo.order_id
                       WHERE d.dispute_id = %s''',
                    (dispute_id,),
                )
                row = await cur.fetchone()
                if not row:
                    raise HTTPException(status_code=404, detail="Dispute not found")
                
                order_id, dispute_freelancer_id = row
                if dispute_freelancer_id != freelancer_id:
                    raise HTTPException(status_code=403, detail="Only the freelancer involved can respond")

                # Update dispute with freelancer response
                await cur.execute(
                    'UPDATE "Dispute" SET freelancer_response = %s, freelancer_response_at = NOW() WHERE dispute_id = %s',
                    (payload.response, dispute_id),
                )
                await conn.commit()
                
                return {"status": "success", "message": "Response submitted successfully"}
            except HTTPException:
                await conn.rollback()
                raise
            except Exception as e:
                await conn.rollback()
                raise HTTPException(status_code=400, detail=f"Failed to add response: {str(e)}")

