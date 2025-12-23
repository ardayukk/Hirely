from typing import Any, Dict
from decimal import Decimal
from fastapi import APIRouter, HTTPException, Query
from datetime import datetime, timezone

from backend.db import get_connection

router = APIRouter(prefix="/admin/disputes", tags=["admin-disputes"])


@router.get("")
async def list_admin_disputes(status: str = Query("OPEN")) -> list[dict]:
    """Query A: Open Disputes List (status filter, case-insensitive)."""
    results: list[dict] = []
    async with get_connection() as conn:
        async with conn.cursor() as cur:
            await cur.execute(
                '''
                                SELECT
                                    d.dispute_id,
                                    d.opened_at,
                                    d.status,
                                    d.order_id,
                                    o.status AS order_status,
                                    o.payment_status,
                                    o.amount_released,
                                    o.amount_refunded,
                                    o.total_price,
                                    r.client_id,
                                    fo.freelancer_id,
                                    nac.name AS client_name,
                                    naf.name AS freelancer_name
                FROM "Dispute" d
                JOIN "Order" o ON d.order_id = o.order_id
                JOIN reported r ON r.dispute_id = d.dispute_id AND r.order_id = d.order_id
                LEFT JOIN finish_order fo ON fo.order_id = d.order_id
                LEFT JOIN "NonAdmin" nac ON nac.user_id = r.client_id
                LEFT JOIN "NonAdmin" naf ON naf.user_id = fo.freelancer_id
                WHERE UPPER(d.status) = UPPER(%s)
                ORDER BY d.opened_at DESC
                ''',
                (status,),
            )
            for row in await cur.fetchall():
                results.append({
                    "dispute_id": row[0],
                    "opened_at": row[1],
                    "status": row[2],
                    "order_id": row[3],
                    "order_status": row[4],
                    "payment_status": row[5],
                    "amount_released": row[6],
                    "amount_refunded": row[7],
                    "total_price": row[8],
                    "client_id": row[9],
                    "freelancer_id": row[10],
                    "client_name": row[11],
                    "freelancer_name": row[12],
                })
    return results


@router.get("/{dispute_id}")
async def get_dispute_detail(dispute_id: int) -> Dict[str, Any]:
    """Run Queries B-F and G (timeline) and return a composite object."""
    async with get_connection() as conn:
        async with conn.cursor() as cur:
            # Header (Query B)
            await cur.execute(
                '''
                SELECT
                  d.dispute_id,
                  d.status,
                  d.opened_at,
                  d.admin_notes,
                  d.description,
                  d.admin_id,
                                    d.closed_at,
                                    d.resolution_message,
                  o.order_id,
                  o.status AS order_status,
                                    o.payment_status,
                                    o.amount_released,
                                    o.amount_refunded,
                  o.total_price,
                  o.order_date,
                  r.client_id,
                  fo.freelancer_id,
                  nac.name AS client_name,
                  naf.name AS freelancer_name
                FROM "Dispute" d
                JOIN "Order" o ON d.order_id = o.order_id
                JOIN reported r ON r.dispute_id = d.dispute_id AND r.order_id = d.order_id
                LEFT JOIN finish_order fo ON fo.order_id = d.order_id
                LEFT JOIN "NonAdmin" nac ON nac.user_id = r.client_id
                LEFT JOIN "NonAdmin" naf ON naf.user_id = fo.freelancer_id
                WHERE d.dispute_id = %s
                ''',
                (dispute_id,),
            )
            header_row = await cur.fetchone()
            if not header_row:
                raise HTTPException(status_code=404, detail="Dispute not found")
            header = {
                "dispute_id": header_row[0],
                "status": header_row[1],
                "opened_at": header_row[2],
                "admin_notes": header_row[3],
                "description": header_row[4],
                "admin_id": header_row[5],
                "closed_at": header_row[6],
                "resolution_message": header_row[7],
                "order_id": header_row[8],
                "order_status": header_row[9],
                "payment_status": header_row[10],
                "amount_released": header_row[11],
                "amount_refunded": header_row[12],
                "total_price": header_row[13],
                "order_date": header_row[14],
                "client_id": header_row[15],
                "freelancer_id": header_row[16],
                "client_name": header_row[17],
                "freelancer_name": header_row[18],
            }

            order_id = header["order_id"]

            # Messages (Query C)
            await cur.execute(
                'SELECT message_id, sender_id, receiver_id, message_text, timestamp FROM "Messages" WHERE order_id = %s ORDER BY timestamp ASC',
                (order_id,),
            )
            messages = [
                {
                    "message_id": r[0],
                    "sender_id": r[1],
                    "receiver_id": r[2],
                    "message_text": r[3],
                    "timestamp": r[4],
                }
                for r in await cur.fetchall()
            ]

            # Deliverables (using Delivery) (Query D)
            await cur.execute(
                'SELECT delivery_id, freelancer_id, message, created_at FROM "Delivery" WHERE order_id = %s ORDER BY created_at ASC',
                (order_id,),
            )
            deliverables = [
                {
                    "delivery_id": r[0],
                    "freelancer_id": r[1],
                    "message": r[2],
                    "created_at": r[3],
                }
                for r in await cur.fetchall()
            ]

            # Revisions (Query E)
            await cur.execute(
                '''
                SELECT r.revision_id, r.revision_text, r.revision_no, r.created_at
                FROM request_revision rr
                JOIN "Revision" r ON r.revision_id = rr.revision_id
                WHERE rr.order_id = %s
                ORDER BY r.created_at ASC
                ''',
                (order_id,),
            )
            revisions = [
                {
                    "revision_id": r[0],
                    "revision_text": r[1],
                    "revision_no": r[2],
                    "created_at": r[3],
                }
                for r in await cur.fetchall()
            ]

            # Evidence (Query F)
            await cur.execute(
                'SELECT evidence_id, submitted_by_user_id, description, file_url, created_at FROM "DisputeEvidence" WHERE dispute_id = %s ORDER BY created_at ASC',
                (dispute_id,),
            )
            evidence = [
                {
                    "evidence_id": r[0],
                    "submitted_by_user_id": r[1],
                    "description": r[2],
                    "file_url": r[3],
                    "created_at": r[4],
                }
                for r in await cur.fetchall()
            ]

            # Timeline (Query G)
            await cur.execute(
                '''
                (
                  SELECT 'ORDER_CREATED' AS event_type, o.order_date AS event_time, NULL::INT AS actor_id, 'Order created' AS details
                  FROM "Order" o
                  WHERE o.order_id = %s
                )
                UNION ALL
                (
                  SELECT 'MESSAGE', m.timestamp, m.sender_id, COALESCE(m.message_text,'')
                  FROM "Messages" m
                  WHERE m.order_id = %s
                )
                UNION ALL
                (
                  SELECT 'DELIVERY', d.created_at, d.freelancer_id, COALESCE(d.message,'')
                  FROM "Delivery" d
                  WHERE d.order_id = %s
                )
                UNION ALL
                (
                  SELECT 'REVISION', r.created_at, rr.client_id, COALESCE(r.revision_text,'')
                  FROM request_revision rr
                  JOIN "Revision" r ON r.revision_id = rr.revision_id
                  WHERE rr.order_id = %s
                )
                UNION ALL
                (
                  SELECT 'DISPUTE_OPENED', d.opened_at, r.client_id, COALESCE(d.description,'')
                  FROM "Dispute" d
                  JOIN reported r ON r.dispute_id = d.dispute_id AND r.order_id = d.order_id
                  WHERE d.order_id = %s
                )
                ORDER BY event_time ASC
                ''',
                (order_id, order_id, order_id, order_id, order_id),
            )
            timeline = [
                {
                    "event_type": r[0],
                    "event_time": r[1],
                    "actor_id": r[2],
                    "details": r[3],
                }
                for r in await cur.fetchall()
            ]

            return {
                "header": header,
                "messages": messages,
                "deliverables": deliverables,
                "revisions": revisions,
                "evidence": evidence,
                "timeline": timeline,
            }


@router.put("/{dispute_id}/notes")
async def update_admin_notes(dispute_id: int, notes: str = Query(...), admin_id: int | None = Query(None)) -> dict:
    async with get_connection() as conn:
        async with conn.cursor() as cur:
            await cur.execute('SELECT 1 FROM "Dispute" WHERE dispute_id = %s', (dispute_id,))
            if not await cur.fetchone():
                raise HTTPException(status_code=404, detail="Dispute not found")

            if admin_id is not None:
                # optional assignment when notes updated
                await cur.execute('UPDATE "Dispute" SET admin_notes = %s, admin_id = %s WHERE dispute_id = %s RETURNING dispute_id', (notes, admin_id, dispute_id))
            else:
                await cur.execute('UPDATE "Dispute" SET admin_notes = %s WHERE dispute_id = %s RETURNING dispute_id', (notes, dispute_id))
            row = await cur.fetchone()
            await conn.commit()
            return {"dispute_id": row[0], "updated": True}


@router.post("/{dispute_id}/message")
async def admin_send_message(dispute_id: int, admin_id: int = Query(...), text: str = Query(...)) -> dict:
    """Optional: allow admin to send a message to both parties via order chat.
    We post a message on the order's chat from admin to the client (if exists).
    """
    async with get_connection() as conn:
        async with conn.cursor() as cur:
            # resolve order and client
            await cur.execute('SELECT order_id FROM "Dispute" WHERE dispute_id = %s', (dispute_id,))
            orow = await cur.fetchone()
            if not orow:
                raise HTTPException(status_code=404, detail="Dispute not found")
            order_id = orow[0]

            await cur.execute('SELECT client_id FROM reported WHERE dispute_id = %s', (dispute_id,))
            crow = await cur.fetchone()
            client_id = crow[0] if crow else None

            if client_id is None:
                raise HTTPException(status_code=400, detail="Client not linked to dispute")

            # insert message from admin to client in the context of the order
            await cur.execute(
                'INSERT INTO "Messages" (sender_id, receiver_id, message_text, order_id) VALUES (%s, %s, %s, %s) RETURNING message_id',
                (admin_id, client_id, text, order_id),
            )
            mid = (await cur.fetchone())[0]
            await conn.commit()
            return {"message_id": mid}


@router.post("/{dispute_id}/resolve")
async def resolve_dispute(
    dispute_id: int,
    admin_id: int = Query(...),
    resolution_type: str = Query(..., description="REFUND | RELEASE | SPLIT"),
    message: str | None = Query(None),
    client_amount: float | None = Query(None),
    freelancer_amount: float | None = Query(None),
) -> dict:
    res_type = resolution_type.upper()
    if res_type not in {"REFUND", "RELEASE", "SPLIT"}:
        raise HTTPException(status_code=400, detail="Invalid resolution type")

    async with get_connection() as conn:
        async with conn.cursor() as cur:
            await cur.execute(
                '''
                SELECT d.status, d.order_id, d.admin_id, o.total_price, fo.payment_id
                FROM "Dispute" d
                JOIN "Order" o ON o.order_id = d.order_id
                LEFT JOIN finish_order fo ON fo.order_id = d.order_id
                WHERE d.dispute_id = %s
                FOR UPDATE OF d, o
                ''',
                (dispute_id,),
            )
            row = await cur.fetchone()
            if not row:
                raise HTTPException(status_code=404, detail="Dispute not found")

            status, order_id, existing_admin_id, total_price, payment_id = row
            if str(status).upper() == "RESOLVED":
                raise HTTPException(status_code=400, detail="Dispute already resolved")
            if payment_id is None:
                raise HTTPException(status_code=400, detail="Payment not linked to order")

            total_dec = Decimal(total_price or 0)
            client_dec: Decimal
            freelancer_dec: Decimal

            if res_type == "REFUND":
                client_dec = total_dec
                freelancer_dec = Decimal(0)
            elif res_type == "RELEASE":
                client_dec = Decimal(0)
                freelancer_dec = total_dec
            else:
                if client_amount is None or freelancer_amount is None:
                    raise HTTPException(status_code=400, detail="Provide client_amount and freelancer_amount for SPLIT")
                client_dec = Decimal(str(client_amount))
                freelancer_dec = Decimal(str(freelancer_amount))
                if client_dec < 0 or freelancer_dec < 0:
                    raise HTTPException(status_code=400, detail="Amounts must be non-negative")
                if client_dec + freelancer_dec > total_dec:
                    raise HTTPException(status_code=400, detail="Split exceeds order total")

            payment_status = "REFUNDED" if client_dec > 0 and freelancer_dec == 0 else "RELEASED" if freelancer_dec == total_dec else "PARTIAL"
            now = datetime.now(timezone.utc)
            admin_assignee = admin_id if admin_id else existing_admin_id

            await cur.execute(
                '''
                UPDATE "Payment"
                SET status = %s,
                    released = %s,
                    released_amount = %s,
                    refunded_amount = %s,
                    released_at = CASE WHEN %s > 0 THEN %s ELSE released_at END,
                    refunded_at = CASE WHEN %s > 0 THEN %s ELSE refunded_at END
                WHERE payment_id = %s
                RETURNING payment_id
                ''',
                (
                    payment_status,
                    freelancer_dec > 0,
                    freelancer_dec,
                    client_dec,
                    freelancer_dec,
                    now,
                    client_dec,
                    now,
                    payment_id,
                ),
            )
            if not await cur.fetchone():
                raise HTTPException(status_code=400, detail="Failed to update payment")

            await cur.execute(
                '''
                UPDATE "Order"
                SET payment_status = %s,
                    amount_released = %s,
                    amount_refunded = %s
                WHERE order_id = %s
                ''',
                (payment_status, freelancer_dec, client_dec, order_id),
            )

            await cur.execute(
                '''
                UPDATE "Dispute"
                SET status = 'RESOLVED',
                    resolution_date = NOW(),
                    closed_at = NOW(),
                    admin_id = COALESCE(%s, admin_id),
                    decision = %s,
                    resolution_message = %s
                WHERE dispute_id = %s
                RETURNING dispute_id
                ''',
                (admin_assignee, res_type, message, dispute_id),
            )
            if not await cur.fetchone():
                raise HTTPException(status_code=400, detail="Failed to update dispute")

            await cur.execute(
                '''
                INSERT INTO "DisputeResolution" (dispute_id, admin_id, resolution_type, client_amount, freelancer_amount, message)
                VALUES (%s, %s, %s, %s, %s, %s)
                RETURNING resolution_id
                ''',
                (dispute_id, admin_assignee, res_type, client_dec, freelancer_dec, message),
            )
            res_row = await cur.fetchone()
            await conn.commit()

            return {
                "dispute_id": dispute_id,
                "resolution_id": res_row[0],
                "status": "RESOLVED",
                "payment_status": payment_status,
                "client_amount": float(client_dec),
                "freelancer_amount": float(freelancer_dec),
            }
