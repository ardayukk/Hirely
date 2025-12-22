from fastapi import APIRouter

from backend.db import get_connection

router = APIRouter(prefix="/db-test", tags=["db"])


@router.get("/")
async def db_test():
    # Simple connectivity check: count rows in auth_user
    async with get_connection() as conn:
        async with conn.cursor() as cur:
            await cur.execute("SELECT COUNT(*) FROM auth_user;")
            row = await cur.fetchone()
    return {"user_count": row[0]}
