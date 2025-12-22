from decimal import Decimal
from typing import List, Optional
from datetime import datetime
from fastapi import APIRouter, HTTPException, Query

from backend.db import get_connection
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
async def get_earnings_summary(freelancer_id: int = Query(...)):
    async with get_connection() as conn:
        async with conn.cursor() as cur:
            await cur.execute('SELECT wallet_balance FROM "NonAdmin" WHERE user_id = %s', (freelancer_id,))
            row = await cur.fetchone()
            if not row:
                raise HTTPException(status_code=404, detail="Freelancer not found")
            available_balance = _to_float(row[0])

            await cur.execute(
                '''
                SELECT COALESCE(SUM(p.amount), 0)
                FROM finish_order fo
                JOIN "Payment" p ON fo.payment_id = p.payment_id
                JOIN "Order" o ON o.order_id = fo.order_id
                WHERE fo.freelancer_id = %s
                  AND p.released = FALSE
                                    AND o.status NOT IN ('cancelled', 'completed')
                ''',
                (freelancer_id,),
            )
            pending_balance = _to_float((await cur.fetchone())[0])

            await cur.execute(
                '''
                SELECT COALESCE(SUM(p.amount), 0), COUNT(*), MIN(p.payment_date), MAX(p.payment_date)
                FROM finish_order fo
                JOIN "Payment" p ON fo.payment_id = p.payment_id
                WHERE fo.freelancer_id = %s
                  AND p.released = TRUE
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
    freelancer_id: int = Query(...),
    start_date: Optional[datetime] = Query(None),
    end_date: Optional[datetime] = Query(None),
    status: Optional[str] = Query(None),
    service_id: Optional[int] = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
):
    filters = ["fo.freelancer_id = %s", "p.released = TRUE"]
    params: List = [freelancer_id]

    if start_date:
        filters.append("p.payment_date >= %s")
        params.append(start_date)
    if end_date:
        filters.append("p.payment_date <= %s")
        params.append(end_date)
    if status:
        filters.append("o.status = %s")
        params.append(status)
    if service_id:
        filters.append("s.service_id = %s")
        params.append(service_id)

    where_clause = " AND ".join(filters)
    offset = (page - 1) * page_size

    base_query = f'''
        FROM finish_order fo
        JOIN "Payment" p ON fo.payment_id = p.payment_id
        JOIN "Order" o ON o.order_id = fo.order_id
        JOIN make_order mo ON mo.order_id = o.order_id
        JOIN "Service" s ON s.service_id = mo.service_id
        WHERE {where_clause}
    '''

    async with get_connection() as conn:
        async with conn.cursor() as cur:
            await cur.execute(f"SELECT COUNT(*) {base_query}", params)
            total = (await cur.fetchone())[0] or 0

            await cur.execute(
                f'''
                SELECT p.payment_id, o.order_id, s.service_id, s.title, p.amount, p.payment_date, o.status
                {base_query}
                ORDER BY p.payment_date DESC
                LIMIT %s OFFSET %s
                ''',
                params + [page_size, offset],
            )
            rows = await cur.fetchall()

    items = [
        EarningsHistoryItem(
            payment_id=r[0],
            order_id=r[1],
            service_id=r[2],
            service_title=r[3],
            amount=_to_float(r[4]),
            payment_date=r[5],
            order_status=r[6],
        )
        for r in rows
    ]

    return EarningsHistoryResponse(items=items, total=total, page=page, page_size=page_size)


@router.get("/by-service", response_model=List[ServiceBreakdownItem])
async def get_earnings_by_service(freelancer_id: int = Query(...)):
    async with get_connection() as conn:
        async with conn.cursor() as cur:
            await cur.execute(
                '''
                SELECT s.service_id, s.title, COUNT(*), COALESCE(SUM(p.amount), 0)
                FROM finish_order fo
                JOIN "Payment" p ON fo.payment_id = p.payment_id
                JOIN "Order" o ON o.order_id = fo.order_id
                JOIN make_order mo ON mo.order_id = o.order_id
                JOIN "Service" s ON s.service_id = mo.service_id
                WHERE fo.freelancer_id = %s
                  AND p.released = TRUE
                GROUP BY s.service_id, s.title
                ORDER BY COALESCE(SUM(p.amount), 0) DESC
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
    freelancer_id: int = Query(...),
    granularity: str = Query("month", regex="^(day|week|month)$"),
    start_date: Optional[datetime] = Query(None),
    end_date: Optional[datetime] = Query(None),
):
    # Map granularity to date_trunc
    trunc_unit = granularity

    filters = ["fo.freelancer_id = %s", "p.released = TRUE"]
    params: List = [freelancer_id]

    if start_date:
        filters.append("p.payment_date >= %s")
        params.append(start_date)
    if end_date:
        filters.append("p.payment_date <= %s")
        params.append(end_date)

    where_clause = " AND ".join(filters)

    query = f'''
        SELECT date_trunc(%s, p.payment_date) AS period, COALESCE(SUM(p.amount), 0)
        FROM finish_order fo
        JOIN "Payment" p ON fo.payment_id = p.payment_id
        JOIN "Order" o ON o.order_id = fo.order_id
        WHERE {where_clause}
        GROUP BY period
        ORDER BY period
    '''

    async with get_connection() as conn:
        async with conn.cursor() as cur:
            await cur.execute(query, [trunc_unit] + params)
            rows = await cur.fetchall()

    return [EarningsPoint(period=r[0], total_earned=_to_float(r[1])) for r in rows]
