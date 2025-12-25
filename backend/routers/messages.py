from typing import List, Dict
from fastapi import APIRouter, HTTPException, Query, WebSocket, WebSocketDisconnect, UploadFile, File, Form
from pathlib import Path
import shutil
import uuid
from datetime import datetime, timedelta
import os
from collections import defaultdict
import asyncio

from backend.db import get_connection
from backend.schemas.message import (
    MessageCreate,
    MessagePublic,
    ConversationMessage,
    ConversationThread,
)

router = APIRouter(prefix="/messages", tags=["messages"])

# Rate limiting: In-memory store (user_id -> [timestamps])
from typing import Union
rate_limit_store: Dict[Union[str, int], List[datetime]] = {}
RATE_LIMIT_WINDOW = 60  # seconds
RATE_LIMIT_MAX_REQUESTS = 30  # max requests per window

def check_rate_limit(user_id: int) -> bool:
    """Check if user is within rate limits. Returns True if allowed, False if exceeded."""
    now = datetime.now()
    cutoff = now - timedelta(seconds=RATE_LIMIT_WINDOW)
    
    # Clean old timestamps
    if user_id not in rate_limit_store:
        rate_limit_store[user_id] = []
    
    rate_limit_store[user_id] = [ts for ts in rate_limit_store[user_id] if ts > cutoff]
    
    # Check limit
    if len(rate_limit_store[user_id]) >= RATE_LIMIT_MAX_REQUESTS:
        return False
    
    # Add current timestamp
    rate_limit_store[user_id].append(now)
    return True

async def verify_order_participant(cur, order_id: int, user_id: int) -> tuple:
    """Verify user is participant in order and return (client_id, freelancer_id)."""
    client_id, freelancer_id = await _get_pair_by_order(cur, order_id)
    if user_id not in (client_id, freelancer_id):
        raise HTTPException(status_code=403, detail="Access denied: not a participant in this order")
    return client_id, freelancer_id

# WebSocket Connection Manager
class ConnectionManager:
    def __init__(self):
        # Dict[order_id, Dict[user_id, WebSocket]]
        self.active_connections: Dict[int, Dict[int, WebSocket]] = {}

    async def connect(self, websocket: WebSocket, order_id: int, user_id: int):
        await websocket.accept()
        if order_id not in self.active_connections:
            self.active_connections[order_id] = {}
        self.active_connections[order_id][user_id] = websocket

    def disconnect(self, order_id: int, user_id: int):
        if order_id in self.active_connections:
            self.active_connections[order_id].pop(user_id, None)
            if not self.active_connections[order_id]:
                del self.active_connections[order_id]

    async def broadcast_to_order(self, order_id: int, message: dict, exclude_user: int | None = None):
        if order_id in self.active_connections:
            for user_id, connection in list(self.active_connections[order_id].items()):
                if exclude_user is None or user_id != exclude_user:
                    try:
                        await connection.send_json(message)
                    except:
                        self.disconnect(order_id, user_id)

manager = ConnectionManager()

# File upload directory
UPLOAD_DIR = Path("backend/uploads")
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)


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
    # Rate limiting check
    if not check_rate_limit(sender_id):
        raise HTTPException(
            status_code=429, 
            detail=f"Rate limit exceeded: max {RATE_LIMIT_MAX_REQUESTS} messages per {RATE_LIMIT_WINDOW} seconds"
        )
    
    # Validate message text length
    if not payload.message_text or len(payload.message_text.strip()) == 0:
        raise HTTPException(status_code=400, detail="Message text cannot be empty")
    
    if len(payload.message_text) > 5000:
        raise HTTPException(status_code=400, detail="Message text too long (max 5000 characters)")
    
    async with get_connection() as conn:
        async with conn.cursor() as cur:
            try:
                # Verify permissions
                client_id, freelancer_id = await verify_order_participant(cur, payload.order_id, sender_id)

                receiver_id = freelancer_id if sender_id == client_id else client_id

                await cur.execute(
                    '''
                    INSERT INTO "Messages" (sender_id, receiver_id, order_id, reply_to_id, message_text, timestamp, is_read)
                    VALUES (%s, %s, %s, %s, %s, NOW(), FALSE)
                    RETURNING message_id, timestamp
                    ''',
                    (sender_id, receiver_id, payload.order_id, payload.reply_to_id, payload.message_text),
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

                # Insert notification for receiver
                await cur.execute(
                    '''
                    INSERT INTO "Notification" (user_id, type, message, date_sent, is_read)
                    VALUES (%s, %s, %s, NOW(), FALSE)
                    ''',
                    (receiver_id, 'new_message', f'New message in order #{payload.order_id}'),
                )
                
                await conn.commit()
                
                # Broadcast to WebSocket connections
                await manager.broadcast_to_order(payload.order_id, {
                    "type": "new_message",
                    "message": {
                        "message_id": message_id,
                        "sender_id": sender_id,
                        "receiver_id": receiver_id,
                        "message_text": payload.message_text,
                        "timestamp": ts.isoformat(),
                        "is_read": False,
                        "reply_to_id": payload.reply_to_id,
                        "file_id": file_id,
                        "file_name": file_name,
                        "file_path": file_path,
                        "file_type": file_type,
                    }
                })

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


@router.websocket("/ws/{order_id}")
async def websocket_endpoint(websocket: WebSocket, order_id: int, user_id: int = Query(...)):
    """WebSocket endpoint for real-time messaging within an order conversation."""
    async with get_connection() as conn:
        async with conn.cursor() as cur:
            try:
                # Verify user is part of the order
                client_id, freelancer_id = await verify_order_participant(cur, order_id, user_id)

                await manager.connect(websocket, order_id, user_id)
                
                try:
                    while True:
                        # Keep connection alive and listen for messages
                        data = await websocket.receive_json()
                        
                        # Handle incoming message - save to DB and broadcast
                        if data.get("type") == "message":
                            # Rate limiting for WebSocket messages
                            if not check_rate_limit(user_id):
                                await websocket.send_json({
                                    "type": "error",
                                    "message": f"Rate limit exceeded: max {RATE_LIMIT_MAX_REQUESTS} messages per {RATE_LIMIT_WINDOW} seconds"
                                })
                                continue
                            
                            message_text = data.get("message_text", "").strip()
                            if not message_text:
                                await websocket.send_json({"type": "error", "message": "Message text cannot be empty"})
                                continue
                            
                            if len(message_text) > 5000:
                                await websocket.send_json({"type": "error", "message": "Message text too long (max 5000 characters)"})
                                continue
                            
                            receiver_id = freelancer_id if user_id == client_id else client_id
                            
                            await cur.execute(
                                '''
                                INSERT INTO "Messages" (sender_id, receiver_id, order_id, reply_to_id, message_text, timestamp, is_read)
                                VALUES (%s, %s, %s, %s, %s, NOW(), FALSE)
                                RETURNING message_id, timestamp
                                ''',
                                (user_id, receiver_id, order_id, data.get("reply_to_id"), data.get("message_text")),
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
                            
                            # Insert notification for receiver
                            await cur.execute(
                                '''
                                INSERT INTO "Notification" (user_id, type, message, date_sent, is_read)
                                VALUES (%s, %s, %s, NOW(), FALSE)
                                ''',
                                (receiver_id, 'new_message', f'New message in order #{order_id}'),
                            )
                            
                            await conn.commit()
                            
                            # Broadcast to all connected users in this order
                            await manager.broadcast_to_order(order_id, {
                                "type": "new_message",
                                "message": {
                                    "message_id": message_id,
                                    "sender_id": user_id,
                                    "receiver_id": receiver_id,
                                    "message_text": data.get("message_text"),
                                    "timestamp": ts.isoformat(),
                                    "is_read": False,
                                    "reply_to_id": data.get("reply_to_id"),
                                }
                            })
                            
                except WebSocketDisconnect:
                    manager.disconnect(order_id, user_id)
            except Exception as e:
                await websocket.close(code=1011, reason=str(e))


@router.post("/upload", status_code=201)
async def upload_file(
    file: UploadFile = File(...),
    order_id: int = Form(...),
    message_text: str | None = Form(None),
    reply_to_id: int | None = Form(None),
    sender_id: int = Query(...),
):
    """Upload a file attachment and create a message in the order conversation."""
    # Rate limiting for file uploads (stricter limit)
    rate_limit_store_key = f"upload_{sender_id}"
    now = datetime.now()
    cutoff = now - timedelta(seconds=300)  # 5 minute window for uploads
    
    if rate_limit_store_key not in rate_limit_store:
        rate_limit_store[rate_limit_store_key] = []
    
    upload_timestamps = [ts for ts in rate_limit_store[rate_limit_store_key] if ts > cutoff]
    
    if len(upload_timestamps) >= 10:  # Max 10 uploads per 5 minutes
        raise HTTPException(status_code=429, detail="Upload rate limit exceeded: max 10 files per 5 minutes")
    
    rate_limit_store[rate_limit_store_key] = upload_timestamps + [now]
    
    async with get_connection() as conn:
        async with conn.cursor() as cur:
            # Verify user is part of the order
            try:
                client_id, freelancer_id = await verify_order_participant(cur, order_id, sender_id)
            except HTTPException:
                raise
            except Exception as e:
                raise HTTPException(status_code=400, detail=str(e))
    
    # Validate file
    if not file.filename:
        raise HTTPException(status_code=400, detail="No filename provided")
    
    # Size limit: 10MB
    MAX_FILE_SIZE = 10 * 1024 * 1024
    file.file.seek(0, 2)  # Seek to end
    file_size = file.file.tell()
    file.file.seek(0)  # Reset to beginning
    
    if file_size > MAX_FILE_SIZE:
        raise HTTPException(status_code=400, detail="File too large (max 10MB)")
    
    # Allowed MIME types
    ALLOWED_TYPES = [
        "image/jpeg", "image/png", "image/gif", "image/webp",
        "application/pdf", "text/plain",
        "application/msword", "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "application/vnd.ms-excel", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "application/zip", "application/x-zip-compressed"
    ]
    
    if file.content_type not in ALLOWED_TYPES:
        raise HTTPException(status_code=400, detail=f"File type {file.content_type} not allowed")
    
    # Create order-specific directory
    order_dir = UPLOAD_DIR / f"order_{order_id}"
    order_dir.mkdir(parents=True, exist_ok=True)
    
    # Generate unique filename
    file_ext = Path(file.filename).suffix
    unique_filename = f"{uuid.uuid4()}{file_ext}"
    file_path = order_dir / unique_filename
    
    # Save file
    try:
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to save file: {str(e)}")
    
    # Return file metadata (relative path from backend/)
    relative_path = f"uploads/order_{order_id}/{unique_filename}"
    
    # Insert a message referencing this file
    async with get_connection() as conn:
        async with conn.cursor() as cur:
            try:
                receiver_id = freelancer_id if sender_id == client_id else client_id
                text = (message_text or "").strip() or "Attachment"

                await cur.execute(
                    '''
                    INSERT INTO "Messages" (sender_id, receiver_id, order_id, reply_to_id, message_text, timestamp, is_read)
                    VALUES (%s, %s, %s, %s, %s, NOW(), FALSE)
                    RETURNING message_id, timestamp
                    ''',
                    (sender_id, receiver_id, order_id, reply_to_id, text),
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

                await cur.execute(
                    'INSERT INTO "File" (message_id, file_name, file_path, upload_date, file_type) VALUES (%s, %s, %s, NOW(), %s) RETURNING file_id',
                    (message_id, file.filename, relative_path, file.content_type),
                )
                file_id = (await cur.fetchone())[0]

                await cur.execute(
                    '''
                    INSERT INTO "Notification" (user_id, type, message, date_sent, is_read)
                    VALUES (%s, %s, %s, NOW(), FALSE)
                    ''',
                    (receiver_id, 'new_message', f'New message in order #{order_id}'),
                )

                await conn.commit()

                await manager.broadcast_to_order(order_id, {
                    "type": "new_message",
                    "message": {
                        "message_id": message_id,
                        "sender_id": sender_id,
                        "receiver_id": receiver_id,
                        "message_text": text,
                        "timestamp": ts.isoformat(),
                        "is_read": False,
                        "reply_to_id": reply_to_id,
                        "file_id": file_id,
                        "file_name": file.filename,
                        "file_path": relative_path,
                        "file_type": file.content_type,
                    }
                })

                return {
                    "message_id": message_id,
                    "file_id": file_id,
                    "file_name": file.filename,
                    "file_path": relative_path,
                    "file_type": file.content_type,
                    "file_size": file_size,
                    "uploaded_at": datetime.now().isoformat()
                }
            except Exception as e:
                await conn.rollback()
                raise HTTPException(status_code=400, detail=f"Failed to create message with attachment: {str(e)}")


@router.get("", response_model=List[ConversationMessage])
async def get_conversation(order_id: int = Query(...), user_id: int = Query(...)):
    async with get_connection() as conn:
        async with conn.cursor() as cur:
            try:
                # Verify permissions
                client_id, freelancer_id = await verify_order_participant(cur, order_id, user_id)

                await cur.execute(
                    '''
                    SELECT m.message_id, m.sender_id, ns.name, m.receiver_id, nr.name,
                           m.message_text, m.created_at, m.is_read, NULL::INTEGER,
                           f.file_id, f.file_name, f.file_path, f.file_type
                    FROM "Messages" m
                    LEFT JOIN "NonAdmin" ns ON ns.user_id = m.sender_id
                    LEFT JOIN "NonAdmin" nr ON nr.user_id = m.receiver_id
                    LEFT JOIN "File" f ON f.message_id = m.message_id
                    WHERE m.order_id = %s
                    ORDER BY m.created_at ASC
                    ''',
                    (order_id,),
                )
                rows = await cur.fetchall()

                # Mark messages as read for the current user
                await cur.execute(
                    '''
                    UPDATE "Messages" SET is_read = TRUE
                    WHERE receiver_id = %s AND order_id = %s AND is_read = FALSE
                    ''',
                    (user_id, order_id),
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
            except HTTPException:
                # Permission-related errors
                raise
            except Exception as e:
                # Surface error details for debugging
                raise HTTPException(status_code=500, detail=f"Failed to fetch conversation: {str(e)}")


@router.get("/threads", response_model=List[ConversationThread])
async def get_threads(user_id: int = Query(...)):
    async with get_connection() as conn:
        async with conn.cursor() as cur:
            await cur.execute(
                '''
                WITH conv AS (
                    SELECT sm.client_id, sm.freelancer_id, m.order_id, m.message_id, m.sender_id, m.receiver_id, m.message_text, m.timestamp, m.is_read
                    FROM "Messages" m
                    JOIN "Send_Message" sm ON sm.message_id = m.message_id
                    WHERE %s IN (m.sender_id, m.receiver_id)
                ),
                last_msg AS (
                    SELECT DISTINCT ON (order_id) client_id, freelancer_id, order_id, message_text, timestamp, sender_id, receiver_id
                    FROM conv
                    WHERE order_id IS NOT NULL
                    ORDER BY order_id, timestamp DESC
                ),
                unread AS (
                    SELECT order_id, COUNT(*) AS unread_count
                    FROM conv
                    WHERE receiver_id = %s AND is_read = FALSE AND order_id IS NOT NULL
                    GROUP BY order_id
                )
                SELECT lm.client_id, lm.freelancer_id,
                       CASE WHEN %s = lm.sender_id THEN lm.receiver_id ELSE lm.sender_id END AS other_user_id,
                       na.name AS other_user_name,
                       lm.message_text AS last_message,
                       lm.timestamp AS last_message_at,
                       COALESCE(u.unread_count, 0) AS unread_count,
                       lm.order_id
                FROM last_msg lm
                LEFT JOIN unread u ON u.order_id = lm.order_id
                LEFT JOIN "NonAdmin" na ON na.user_id = CASE WHEN %s = lm.sender_id THEN lm.receiver_id ELSE lm.sender_id END
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
