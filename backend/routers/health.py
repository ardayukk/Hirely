from fastapi import APIRouter
from backend.db import get_connection

router = APIRouter()

@router.get("/health")
def health_check():
    return {"status": "ok"}


@router.get("/health/db")
async def health_db():
    """Check database connectivity by running a trivial query."""
    try:
        async with get_connection() as conn:
            async with conn.cursor() as cur:
                await cur.execute("SELECT 1")
                row = await cur.fetchone()
                return {"db": "ok", "result": row[0]}
    except Exception as e:
        return {"db": "error", "detail": str(e)}
