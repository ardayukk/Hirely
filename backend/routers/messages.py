from typing import List
from fastapi import APIRouter, HTTPException, Query

from db import get_connection
from schemas.message import (
    MessageCreate,
    MessagePublic,
    ConversationMessage,
    ConversationThread,
)

router = APIRouter(prefix="/messages", tags=["messages"])


async def _get_pair_by_order(cur, order_id: int):
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


@router.post("", response_model=MessagePublic, status_code=201)
async def send_message(payload: MessageCreate, sender_id: int = Query(...)):
    async with get_connection() as conn:
        async with conn.cursor() as cur:
            try:
                client_id, freelancer_id = await _get_pair_by_order(cur, payload.order_id)

                if sender_id not in (client_id, freelancer_id):
                    raise HTTPException(status_code=403, detail="User not part of this order")

                receiver_id = freelancer_id if sender_id == client_id else client_id

                await cur.execute(
                    '''
                    INSERT INTO "Messages" (sender_id, receiver_id, reply_to_id, message_text, timestamp, is_read)
                    VALUES (%s, %s, %s, %s, NOW(), FALSE)
                    RETURNING message_id, timestamp
                    ''',
                    (sender_id, receiver_id, payload.reply_to_id, payload.message_text),
                )
                message_row = await cur.fetchone()
                message_id, ts = message_row[0], message_row[1]

                await cur.execute(
                    'INSERT INTO "Send_Message" (client_id, freelancer_id, message_id) VALUES (%s, %s, %s)',
                    (client_id, freelancer_id, message_id),
                )
                await cur.execute(
                    'INSERT INTO "Receive_Message" (client_id, freelancer_id, message_id) VALUES (%s, %s, %s)',
                    (client_id, freelancer_id, message_id),
                )

                file_id = None
                file_name = payload.file_name
                file_path = payload.file_path
                file_type = payload.file_type
                if file_name and file_path:
                    await cur.execute(
                        'INSERT INTO "File" (message_id, file_name, file_path, upload_date, file_type) VALUES (%s, %s, %s, NOW(), %s) RETURNING file_id',
                        (message_id, file_name, file_path, file_type),
                    )
                    file_id = (await cur.fetchone())[0]

                await conn.commit()

                return MessagePublic(
                    message_id=message_id,
                    sender_id=sender_id,
                    receiver_id=receiver_id,
                    message_text=payload.message_text,
                    timestamp=ts,
                    is_read=False,
                    reply_to_id=payload.reply_to_id,
                    file_id=file_id,
                    file_name=file_name,
                    file_path=file_path,
                    file_type=file_type,
                )
            except HTTPException:
                await conn.rollback()
                raise
            except Exception as e:
                await conn.rollback()
                raise HTTPException(status_code=400, detail=f"Failed to send message: {str(e)}")


@router.get("", response_model=List[ConversationMessage])
async def get_conversation(order_id: int = Query(...), user_id: int = Query(...)):
    async with get_connection() as conn:
        async with conn.cursor() as cur:
            client_id, freelancer_id = await _get_pair_by_order(cur, order_id)
            if user_id not in (client_id, freelancer_id):
                raise HTTPException(status_code=403, detail="User not part of this order")

            await cur.execute(
                '''
                SELECT m.message_id, m.sender_id, ns.name, m.receiver_id, nr.name,
                       m.message_text, m.timestamp, m.is_read, m.reply_to_id,
                       f.file_id, f.file_name, f.file_path, f.file_type
                FROM "Messages" m
                JOIN "Send_Message" sm ON sm.message_id = m.message_id
                JOIN "NonAdmin" ns ON ns.user_id = m.sender_id
                JOIN "NonAdmin" nr ON nr.user_id = m.receiver_id
                LEFT JOIN "File" f ON f.message_id = m.message_id
                WHERE sm.client_id = %s AND sm.freelancer_id = %s
                ORDER BY m.timestamp ASC
                ''',
                (client_id, freelancer_id),
            )
            rows = await cur.fetchall()

            await cur.execute(
                '''
                UPDATE "Messages" SET is_read = TRUE
                WHERE receiver_id = %s AND message_id IN (
                    SELECT message_id FROM "Receive_Message"
                    WHERE client_id = %s AND freelancer_id = %s
                )
                ''',
                (user_id, client_id, freelancer_id),
            )
            await conn.commit()

            messages: List[ConversationMessage] = []
            for row in rows:
                messages.append(
                    ConversationMessage(
                        message_id=row[0],
                        sender_id=row[1],
                        sender_name=row[2],
                        receiver_id=row[3],
                        receiver_name=row[4],
                        message_text=row[5],
                        timestamp=row[6],
                        is_read=row[7],
                        reply_to_id=row[8],
                        file_id=row[9],
                        file_name=row[10],
                        file_path=row[11],
                        file_type=row[12],
                    )
                )
            return messages


@router.get("/threads", response_model=List[ConversationThread])
async def get_threads(user_id: int = Query(...)):
    async with get_connection() as conn:
        async with conn.cursor() as cur:
            await cur.execute(
                '''
                WITH conv AS (
                    SELECT sm.client_id, sm.freelancer_id, m.message_id, m.sender_id, m.receiver_id, m.message_text, m.timestamp, m.is_read
                    FROM "Messages" m
                    JOIN "Send_Message" sm ON sm.message_id = m.message_id
                    WHERE %s IN (m.sender_id, m.receiver_id)
                ),
                last_msg AS (
                    SELECT DISTINCT ON (client_id, freelancer_id) client_id, freelancer_id, message_text, timestamp, sender_id, receiver_id
                    FROM conv
                    ORDER BY client_id, freelancer_id, timestamp DESC
                ),
                unread AS (
                    SELECT client_id, freelancer_id, COUNT(*) AS unread_count
                    FROM conv
                    WHERE receiver_id = %s AND is_read = FALSE
                    GROUP BY client_id, freelancer_id
                )
                SELECT lm.client_id, lm.freelancer_id,
                       CASE WHEN %s = lm.sender_id THEN lm.receiver_id ELSE lm.sender_id END AS other_user_id,
                       na.name AS other_user_name,
                       lm.message_text AS last_message,
                       lm.timestamp AS last_message_at,
                       COALESCE(u.unread_count, 0) AS unread_count,
                       ord.order_id
                FROM last_msg lm
                LEFT JOIN unread u ON u.client_id = lm.client_id AND u.freelancer_id = lm.freelancer_id
                LEFT JOIN "NonAdmin" na ON na.user_id = CASE WHEN %s = lm.sender_id THEN lm.receiver_id ELSE lm.sender_id END
                LEFT JOIN LATERAL (
                    SELECT o.order_id
                    FROM make_order mo
                    JOIN finish_order fo ON mo.order_id = fo.order_id
                    JOIN "Order" o ON o.order_id = mo.order_id
                    WHERE mo.client_id = lm.client_id AND fo.freelancer_id = lm.freelancer_id
                    ORDER BY o.order_date DESC
                    LIMIT 1
                ) ord ON TRUE
                ORDER BY last_message_at DESC NULLS LAST
                ''',
                (user_id, user_id, user_id, user_id),
            )
            rows = await cur.fetchall()

            threads: List[ConversationThread] = []
            for row in rows:
                threads.append(
                    ConversationThread(
                        client_id=row[0],
                        freelancer_id=row[1],
                        other_user_id=row[2],
                        other_user_name=row[3],
                        last_message=row[4],
                        last_message_at=row[5],
                        unread_count=row[6],
                        order_id=row[7],
                    )
                )
            return threads
