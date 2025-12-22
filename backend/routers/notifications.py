from typing import List
from fastapi import APIRouter, HTTPException, Query
from datetime import datetime

from backend.db import get_connection
from backend.schemas.notification import NotificationPublic

router = APIRouter(prefix="/notifications", tags=["notifications"])


@router.post("", response_model=NotificationPublic, status_code=201)
async def create_notification(
    user_id: int = Query(...),
    notification_type: str = Query(...),
    message: str = Query(...),
):
    """Create a notification for a user"""
    async with get_connection() as conn:
        async with conn.cursor() as cur:
            try:
                await cur.execute(
                    'INSERT INTO "Notification" (user_id, type, message, date_sent, is_read) VALUES (%s, %s, %s, NOW(), FALSE) RETURNING notification_id, date_sent',
                    (user_id, notification_type, message),
                )
                row = await cur.fetchone()
                await conn.commit()
                return NotificationPublic(
                    notification_id=row[0],
                    user_id=user_id,
                    type=notification_type,
                    message=message,
                    date_sent=row[1],
                    is_read=False,
                )
            except Exception as e:
                await conn.rollback()
                raise HTTPException(status_code=400, detail=f"Failed to create notification: {str(e)}")


@router.get("", response_model=List[NotificationPublic])
async def list_notifications(user_id: int = Query(...)):
    """Get all notifications for a user"""
    async with get_connection() as conn:
        async with conn.cursor() as cur:
            await cur.execute(
                'SELECT notification_id, user_id, type, message, date_sent, is_read FROM "Notification" WHERE user_id = %s ORDER BY date_sent DESC',
                (user_id,),
            )
            rows = await cur.fetchall()
            return [
                NotificationPublic(
                    notification_id=row[0],
                    user_id=row[1],
                    type=row[2],
                    message=row[3],
                    date_sent=row[4],
                    is_read=row[5],
                )
                for row in rows
            ]


@router.patch("/{notification_id}/read")
async def mark_notification_read(notification_id: int):
    """Mark a notification as read"""
    async with get_connection() as conn:
        async with conn.cursor() as cur:
            try:
                await cur.execute(
                    'UPDATE "Notification" SET is_read = TRUE WHERE notification_id = %s',
                    (notification_id,),
                )
                await conn.commit()
                return {"message": "Notification marked as read"}
            except Exception as e:
                await conn.rollback()
                raise HTTPException(status_code=400, detail=f"Failed to update notification: {str(e)}")


@router.delete("/{notification_id}")
async def delete_notification(notification_id: int):
    """Delete a notification"""
    async with get_connection() as conn:
        async with conn.cursor() as cur:
            try:
                await cur.execute(
                    'DELETE FROM "Notification" WHERE notification_id = %s',
                    (notification_id,),
                )
                await conn.commit()
                return {"message": "Notification deleted"}
            except Exception as e:
                await conn.rollback()
                raise HTTPException(status_code=400, detail=f"Failed to delete notification: {str(e)}")
