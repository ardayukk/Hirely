from typing import Any, Dict
from fastapi import APIRouter, HTTPException, Query

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
                    "total_price": row[5],
                    "client_id": row[6],
                    "freelancer_id": row[7],
                    "client_name": row[8],
                    "freelancer_name": row[9],
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
                  o.order_id,
                  o.status AS order_status,
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
                "order_id": header_row[6],
                "order_status": header_row[7],
                "total_price": header_row[8],
                "order_date": header_row[9],
                "client_id": header_row[10],
                "freelancer_id": header_row[11],
                "client_name": header_row[12],
                "freelancer_name": header_row[13],
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
