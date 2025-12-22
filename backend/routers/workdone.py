from typing import List
from fastapi import APIRouter, HTTPException, Query

from backend.db import get_connection
from backend.schemas.workdone import WorkDoneCreate, WorkDonePublic

router = APIRouter(prefix="/freelancers", tags=["workdone"])


@router.post("/{freelancer_id}/workdone", response_model=WorkDonePublic, status_code=201)
async def add_work_done(freelancer_id: int, workdone: WorkDoneCreate):
    """Add a work sample/portfolio item for a freelancer"""
    async with get_connection() as conn:
        async with conn.cursor() as cur:
            try:
                # Verify freelancer exists
                await cur.execute('SELECT user_id FROM "Freelancer" WHERE user_id = %s', (freelancer_id,))
                if not await cur.fetchone():
                    raise HTTPException(status_code=404, detail="Freelancer not found")

                # WorkDone table doesn't have an auto-ID, so we use a trigger-like approach
                # Insert and track via freelancer_id + work_done content hash
                await cur.execute(
                    'INSERT INTO "WorkDone" (freelancer_id, work_done) VALUES (%s, %s)',
                    (freelancer_id, workdone.work_done),
                )
                await conn.commit()

                return WorkDonePublic(
                    freelancer_id=freelancer_id,
                    work_done=workdone.work_done,
                )
            except HTTPException:
                await conn.rollback()
                raise
            except Exception as e:
                await conn.rollback()
                raise HTTPException(status_code=400, detail=f"Failed to add work: {str(e)}")


@router.get("/{freelancer_id}/workdone", response_model=List[WorkDonePublic])
async def list_work_done(freelancer_id: int):
    """Get all work samples for a freelancer"""
    async with get_connection() as conn:
        async with conn.cursor() as cur:
            await cur.execute(
                'SELECT freelancer_id, work_done FROM "WorkDone" WHERE freelancer_id = %s',
                (freelancer_id,),
            )
            rows = await cur.fetchall()
            return [
                WorkDonePublic(freelancer_id=row[0], work_done=row[1])
                for row in rows
            ]


@router.delete("/{freelancer_id}/workdone")
async def delete_work_done(freelancer_id: int, work_done: str = Query(...)):
    """Delete a specific work sample"""
    async with get_connection() as conn:
        async with conn.cursor() as cur:
            try:
                await cur.execute(
                    'DELETE FROM "WorkDone" WHERE freelancer_id = %s AND work_done = %s',
                    (freelancer_id, work_done),
                )
                await conn.commit()
                return {"message": "Work deleted"}
            except Exception as e:
                await conn.rollback()
                raise HTTPException(status_code=400, detail=f"Failed to delete work: {str(e)}")
