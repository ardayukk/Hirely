from decimal import Decimal
from typing import List, Optional
from datetime import datetime
from fastapi import APIRouter, HTTPException, Query, Depends

from backend.db import get_connection
from backend.core.security import get_current_user
from backend.schemas.user import UserResponse
from backend.schemas.earnings import (
    EarningsSummary,
    EarningsHistoryItem,
    EarningsHistoryResponse,
    ServiceBreakdownItem,
    EarningsPoint,
)

router = APIRouter(prefix="/earnings", tags=["earnings"])


def _to_float(value) -> float:
    if value is None:
        return 0.0
    return float(value) if isinstance(value, Decimal) else float(value)


@router.get("/summary", response_model=EarningsSummary)
async def get_earnings_summary(current_user: UserResponse = Depends(get_current_user)):
    freelancer_id = current_user.user_id
    
    async with get_connection() as conn:
        async with conn.cursor() as cur:
            # Check available balance (from wallet)
            await cur.execute('SELECT wallet_balance FROM "NonAdmin" WHERE user_id = %s', (freelancer_id,))
            row = await cur.fetchone()
            if not row:
                raise HTTPException(status_code=404, detail="Freelancer not found")
            available_balance = _to_float(row[0])

            # Check pending balance (funds in escrow for active orders)
            await cur.execute(
                '''
                SELECT COALESCE(SUM(o.total_price), 0)
                FROM "Order" o
                WHERE o.freelancer_id = %s
                  AND o.status IN ('accepted', 'in_progress', 'delivered', 'revision_requested')
                  AND o.total_price IS NOT NULL
                ''',
                (freelancer_id,),
            )
            pending_balance = _to_float((await cur.fetchone())[0])

            # Calculate lifetime statistics (total earned from completed orders)
            await cur.execute(
                '''
                SELECT 
                    COALESCE(SUM(o.total_price), 0) as total_earned,
                    COUNT(*) as order_count,
                    MIN(o.created_at) as first_order,
                    MAX(o.created_at) as last_order
                FROM "Order" o
                WHERE o.freelancer_id = %s
                  AND o.status = 'completed'
                  AND o.total_price IS NOT NULL
                ''',
                (freelancer_id,),
            )
            total_amount, order_volume, first_dt, last_dt = await cur.fetchone()
            total_earned = _to_float(total_amount)
            order_volume = int(order_volume or 0)
            average_order_value = total_earned / order_volume if order_volume else 0.0

            return EarningsSummary(
                available_balance=available_balance,
                pending_balance=pending_balance,
                total_earned=total_earned,
                average_order_value=average_order_value,
                order_volume=order_volume,
                first_payout_date=first_dt,
                last_payout_date=last_dt,
            )


@router.get("/history", response_model=EarningsHistoryResponse)
async def get_earnings_history(
    start_date: Optional[datetime] = Query(None),
    end_date: Optional[datetime] = Query(None),
    status: Optional[str] = Query(None),
    service_id: Optional[int] = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    current_user: UserResponse = Depends(get_current_user),
):
    freelancer_id = current_user.user_id
    filters = ["o.freelancer_id = %s"]
    params: List = [freelancer_id]

    if start_date:
        filters.append("o.created_at >= %s")
        params.append(start_date)
    if end_date:
        filters.append("o.created_at <= %s")
        params.append(end_date)
    if status:
        filters.append("o.status = %s")
        params.append(status)
    if service_id:
        filters.append("o.service_id = %s")
        params.append(service_id)

    where_clause = " AND ".join(filters)
    offset = (page - 1) * page_size

    base_query = f'''
        FROM "Order" o
        JOIN "Service" s ON s.service_id = o.service_id
        WHERE {where_clause}
    '''

    async with get_connection() as conn:
        async with conn.cursor() as cur:
            await cur.execute(f"SELECT COUNT(*) {base_query}", params)
            total = (await cur.fetchone())[0] or 0

            await cur.execute(
                f'''
                SELECT o.order_id, o.service_id, s.title, o.total_price, o.created_at, o.status
                {base_query}
                ORDER BY o.created_at DESC
                LIMIT %s OFFSET %s
                ''',
                params + [page_size, offset],
            )
            rows = await cur.fetchall()

    items = [
        EarningsHistoryItem(
            payment_id=r[0],  # Using order_id as payment_id for compatibility
            order_id=r[0],
            service_id=r[1],
            service_title=r[2],
            amount=_to_float(r[3]),
            payment_date=r[4],  # Using created_at as payment_date
            order_status=r[5],
        )
        for r in rows
    ]

    return EarningsHistoryResponse(items=items, total=total, page=page, page_size=page_size)


@router.get("/by-service", response_model=List[ServiceBreakdownItem])
async def get_earnings_by_service(current_user: UserResponse = Depends(get_current_user)):
    freelancer_id = current_user.user_id
    
    async with get_connection() as conn:
        async with conn.cursor() as cur:
            await cur.execute(
                '''
                SELECT s.service_id, s.title, 
                       COUNT(CASE WHEN o.status IN ('completed', 'delivered') THEN 1 END), 
                       COALESCE(SUM(CASE WHEN o.status IN ('completed', 'delivered') THEN o.total_price ELSE 0 END), 0)
                FROM "Service" s
                LEFT JOIN "Order" o ON s.service_id = o.service_id
                WHERE s.freelancer_id = %s
                GROUP BY s.service_id, s.title
                ORDER BY COALESCE(SUM(CASE WHEN o.status IN ('completed', 'delivered') THEN o.total_price ELSE 0 END), 0) DESC
                ''',
                (freelancer_id,),
            )
            rows = await cur.fetchall()

    result: List[ServiceBreakdownItem] = []
    for r in rows:
        total = _to_float(r[3])
        count = int(r[2] or 0)
        avg = total / count if count else 0.0
        result.append(
            ServiceBreakdownItem(
                service_id=r[0],
                service_title=r[1],
                total_earned=total,
                order_count=count,
                average_order_value=avg,
            )
        )
    return result


@router.get("/timeseries", response_model=List[EarningsPoint])
async def get_earnings_timeseries(
    granularity: str = Query("month", regex="^(day|week|month)$"),
    start_date: Optional[datetime] = Query(None),
    end_date: Optional[datetime] = Query(None),
    current_user: UserResponse = Depends(get_current_user),
):
    # Map granularity to date_trunc
    trunc_unit = granularity
    freelancer_id = current_user.user_id

    filters = ["s.freelancer_id = %s", "o.status IN ('completed', 'delivered')"]
    params: List = [freelancer_id]

    if start_date:
        filters.append("o.created_at >= %s")
        params.append(start_date)
    if end_date:
        filters.append("o.created_at <= %s")
        params.append(end_date)

    where_clause = " AND ".join(filters)

    query = f'''
        SELECT date_trunc(%s, o.created_at) AS period, COALESCE(SUM(o.total_price), 0)
        FROM "Order" o
        JOIN "Service" s ON o.service_id = s.service_id
        WHERE {where_clause}
        GROUP BY period
        ORDER BY period
    '''

    async with get_connection() as conn:
        async with conn.cursor() as cur:
            await cur.execute(query, [trunc_unit] + params)
            rows = await cur.fetchall()

    return [EarningsPoint(period=r[0], total_earned=_to_float(r[1])) for r in rows]
