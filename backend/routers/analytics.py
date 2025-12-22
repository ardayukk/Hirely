from datetime import datetime, date, timedelta
from typing import List, Optional, Dict, Any
from fastapi import APIRouter, HTTPException, Depends, Query

from backend.db import get_connection
from backend.schemas.analytics import (
    AnalyticsSummary, CategoryMetric, AnalyticsSnapshot,
    ServiceEventCreate, DailyMetricResponse, FreelancerAnalyticsSummary
)
from backend.repositories.analytics_repo import AnalyticsRepository
from backend.core.security import get_current_user, get_current_user_optional
from backend.schemas.user import UserResponse

router = APIRouter(prefix="/analytics", tags=["analytics"])


@router.get("/summary", response_model=AnalyticsSummary)
async def analytics_summary():
    async with get_connection() as conn:
        async with conn.cursor() as cur:
            # Overall metrics
            await cur.execute('SELECT AVG(total_price) FROM "Order"')
            avg_price = (await cur.fetchone())[0]

            await cur.execute(
                '''
                SELECT COUNT(DISTINCT d.dispute_id)::DECIMAL / NULLIF(COUNT(DISTINCT o.order_id), 0)
                FROM "Order" o
                LEFT JOIN reported r ON o.order_id = r.order_id
                LEFT JOIN "Dispute" d ON r.dispute_id = d.dispute_id
                '''
            )
            dispute_rate = (await cur.fetchone())[0]

            await cur.execute('SELECT AVG(rating) FROM "Review"')
            satisfaction = (await cur.fetchone())[0]

            # Per category metrics
            await cur.execute(
                '''
                SELECT s.category,
                       AVG(o.total_price) AS avg_order_price,
                       COUNT(DISTINCT d.dispute_id)::DECIMAL / NULLIF(COUNT(DISTINCT o.order_id), 0) AS dispute_rate,
                       AVG(rv.rating) AS avg_rating
                FROM "Order" o
                JOIN make_order mo ON o.order_id = mo.order_id
                JOIN "Service" s ON mo.service_id = s.service_id
                LEFT JOIN reported r ON o.order_id = r.order_id
                LEFT JOIN "Dispute" d ON r.dispute_id = d.dispute_id
                LEFT JOIN give_review gr ON s.service_id = gr.service_id
                LEFT JOIN "Review" rv ON gr.review_id = rv.review_id
                GROUP BY s.category
                ORDER BY s.category
                '''
            )
            cat_rows = await cur.fetchall()
            per_category: List[CategoryMetric] = []
            for row in cat_rows:
                per_category.append(
                    CategoryMetric(
                        category=row[0],
                        avg_order_price=float(row[1]) if row[1] is not None else None,
                        dispute_rate=float(row[2]) if row[2] is not None else None,
                        avg_rating=float(row[3]) if row[3] is not None else None,
                    )
                )

            return AnalyticsSummary(
                generated_at=datetime.utcnow(),
                overall_avg_price=float(avg_price) if avg_price is not None else None,
                overall_dispute_rate=float(dispute_rate) if dispute_rate is not None else None,
                overall_satisfaction=float(satisfaction) if satisfaction is not None else None,
                per_category=per_category,
            )


@router.post("/snapshot", response_model=AnalyticsSnapshot, status_code=201)
async def analytics_snapshot():
    async with get_connection() as conn:
        async with conn.cursor() as cur:
            try:
                await cur.execute('SELECT AVG(total_price) FROM "Order"')
                avg_price = (await cur.fetchone())[0]

                await cur.execute(
                    '''
                    SELECT COUNT(DISTINCT d.dispute_id)::DECIMAL / NULLIF(COUNT(DISTINCT o.order_id), 0)
                    FROM "Order" o
                    LEFT JOIN reported r ON o.order_id = r.order_id
                    LEFT JOIN "Dispute" d ON r.dispute_id = d.dispute_id
                    '''
                )
                dispute_rate = (await cur.fetchone())[0]

                await cur.execute('SELECT AVG(rating) FROM "Review"')
                satisfaction = (await cur.fetchone())[0]

                await cur.execute(
                    'INSERT INTO "AnalyticsReport" (report_date, avg_pricing, avg_dispute_rate, avg_satisfaction) VALUES (NOW(), %s, %s, %s) RETURNING report_id, report_date',
                    (avg_price, dispute_rate, satisfaction),
                )
                row = await cur.fetchone()
                await conn.commit()

                return AnalyticsSnapshot(
                    report_id=row[0],
                    report_date=row[1],
                    avg_pricing=float(avg_price) if avg_price is not None else None,
                    avg_dispute_rate=float(dispute_rate) if dispute_rate is not None else None,
                    avg_satisfaction=float(satisfaction) if satisfaction is not None else None,
                )
            except Exception as e:
                await conn.rollback()
                raise HTTPException(status_code=400, detail=f"Failed to create analytics snapshot: {str(e)}")


@router.post("/events", status_code=201)
async def track_event(
    event: ServiceEventCreate,
    current_user: Optional[UserResponse] = Depends(get_current_user_optional)
):
    """
    Track a service event (view, click, etc.)
    """
    user_id = current_user.user_id if current_user else None
    event_id = await AnalyticsRepository.create_event(event, user_id)
    return {"event_id": event_id, "status": "recorded"}

@router.post("/events/batch", status_code=201)
async def track_events_batch(
    events: List[ServiceEventCreate],
    current_user: Optional[UserResponse] = Depends(get_current_user_optional)
):
    """
    Track multiple service events (e.g. search impressions)
    """
    user_id = current_user.user_id if current_user else None
    # This is not efficient if we do one by one insert, but for now it's okay.
    # Ideally repo should support batch insert.
    for event in events:
        await AnalyticsRepository.create_event(event, user_id)
    return {"status": "recorded", "count": len(events)}

@router.get("/metrics/{service_id}", response_model=List[DailyMetricResponse])
async def get_service_metrics(
    service_id: int,
    start_date: date = Query(..., description="Start date for metrics"),
    end_date: date = Query(..., description="End date for metrics"),
    current_user: UserResponse = Depends(get_current_user)
):
    """
    Get daily metrics for a specific service.
    Only the owner of the service should be able to see this (TODO: Add ownership check)
    """
    # TODO: Verify that current_user owns the service_id
    metrics = await AnalyticsRepository.get_daily_metrics(service_id, start_date, end_date)
    return metrics

@router.get("/summary/{service_id}", response_model=FreelancerAnalyticsSummary)
async def get_service_summary(
    service_id: int,
    start_date: date = Query(..., description="Start date for summary"),
    end_date: date = Query(..., description="End date for summary"),
    current_user: UserResponse = Depends(get_current_user)
):
    """
    Get summary metrics for a specific service.
    """
    # TODO: Verify that current_user owns the service_id
    summary = await AnalyticsRepository.get_summary(service_id, start_date, end_date)
    return summary

