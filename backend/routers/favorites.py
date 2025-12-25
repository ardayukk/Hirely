from typing import List
from fastapi import APIRouter, HTTPException, Query

from backend.db import get_connection
from backend.schemas.favorite import FavoriteCreate, FavoritePublic

router = APIRouter(prefix="/favorites", tags=["favorites"])

@router.get("", response_model=List[FavoritePublic])
async def list_favorites(client_id: int = Query(...)):
    async with get_connection() as conn:
        async with conn.cursor() as cur:
            await cur.execute(
                'SELECT favorite_id, client_id, service_id, freelancer_id, created_at FROM "Favorite" WHERE client_id = %s ORDER BY favorite_id DESC',
                (client_id,)
            )
            rows = await cur.fetchall()
            return [
                FavoritePublic(
                    favorite_id=row[0],
                    client_id=row[1],
                    service_id=row[2],
                    freelancer_id=row[3],
                    created_at=row[4].isoformat() if row[4] else None,
                )
                for row in rows
            ]

@router.post("", status_code=201)
async def add_favorite(payload: FavoriteCreate, client_id: int = Query(...)):
    if not payload.service_id and not payload.freelancer_id:
        raise HTTPException(status_code=400, detail="Provide service_id or freelancer_id")
    async with get_connection() as conn:
        async with conn.cursor() as cur:
            # Ensure client exists
            await cur.execute('SELECT user_id FROM "Client" WHERE user_id = %s', (client_id,))
            if not await cur.fetchone():
                raise HTTPException(status_code=404, detail="Client not found")

            # Optional existence checks
            if payload.service_id:
                await cur.execute('SELECT service_id FROM "Service" WHERE service_id = %s', (payload.service_id,))
                if not await cur.fetchone():
                    raise HTTPException(status_code=404, detail="Service not found")
            if payload.freelancer_id:
                await cur.execute('SELECT user_id FROM "Freelancer" WHERE user_id = %s', (payload.freelancer_id,))
                if not await cur.fetchone():
                    raise HTTPException(status_code=404, detail="Freelancer not found")

            await cur.execute(
                'INSERT INTO "Favorite" (client_id, service_id, freelancer_id) VALUES (%s, %s, %s) RETURNING favorite_id',
                (client_id, payload.service_id, payload.freelancer_id),
            )
            fid = (await cur.fetchone())[0]
            await conn.commit()
            return {"favorite_id": fid}

@router.delete("")
async def remove_favorite(client_id: int = Query(...), service_id: int | None = None, freelancer_id: int | None = None):
    if not service_id and not freelancer_id:
        raise HTTPException(status_code=400, detail="Provide service_id or freelancer_id")
    async with get_connection() as conn:
        async with conn.cursor() as cur:
            await cur.execute(
                'DELETE FROM "Favorite" WHERE client_id = %s AND COALESCE(service_id, -1) = COALESCE(%s, -1) AND COALESCE(freelancer_id, -1) = COALESCE(%s, -1)',
                (client_id, service_id, freelancer_id),
            )
            await conn.commit()
            return {"message": "Favorite removed"}
