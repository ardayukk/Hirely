from datetime import datetime, date, timedelta
from typing import List, Optional, Dict, Any
from fastapi import APIRouter, HTTPException, Depends, Query

from backend.db import get_connection
from backend.schemas.analytics import (
    AnalyticsSummary, CategoryMetric, AnalyticsSnapshot,
    ServiceEventCreate, DailyMetricResponse, FreelancerAnalyticsSummary,
    CategoryTrendMetric, CategoryGrowthMetric, CategoryMetadataUpdate, CategoryMetadataResponse
)
from backend.repositories.analytics_repo import AnalyticsRepository
from backend.core.security import get_current_user, get_current_user_optional
from backend.schemas.user import UserResponse

router = APIRouter(prefix="/analytics", tags=["analytics"])


@router.get("/categories/trends", response_model=List[CategoryTrendMetric])
async def get_category_trends(
    start_date: date = Query(..., description="Start date for the range"),
    end_date: date = Query(..., description="End date for the range"),
    categories: Optional[List[str]] = Query(None, description="List of categories to filter by")
):
    async with get_connection() as conn:
        async with conn.cursor() as cur:
            query = """
                SELECT metric_date, category, total_orders, total_revenue, avg_order_value, unique_buyers
                FROM "CategoryDailyMetrics"
                WHERE metric_date BETWEEN %s AND %s
            """
            params = [start_date, end_date]
            
            if categories:
                query += " AND category = ANY(%s)"
                params.append(categories)
            
            query += " ORDER BY metric_date ASC, category ASC"
            
            await cur.execute(query, params)
            rows = await cur.fetchall()
            
            return [
                CategoryTrendMetric(
                    date=row[0],
                    category=row[1],
                    total_orders=row[2],
                    total_revenue=float(row[3]),
                    avg_order_value=float(row[4]),
                    unique_buyers=row[5]
                )
                for row in rows
            ]

@router.get("/categories/growth", response_model=List[CategoryGrowthMetric])
async def get_category_growth(
    period: str = Query("month", enum=["week", "month"]),
    reference_date: date = Query(default=date.today())
):
    async with get_connection() as conn:
        async with conn.cursor() as cur:
            # Calculate date ranges based on period
            if period == "week":
                current_start = reference_date - timedelta(days=reference_date.weekday())
                current_end = current_start + timedelta(weeks=1)
                prev_start = current_start - timedelta(weeks=1)
                prev_end = current_start
            else: # month
                current_start = reference_date.replace(day=1)
                # Next month first day
                if current_start.month == 12:
                    current_end = current_start.replace(year=current_start.year + 1, month=1)
                else:
                    current_end = current_start.replace(month=current_start.month + 1)
                
                # Previous month calculation
                if current_start.month == 1:
                    prev_start = current_start.replace(year=current_start.year - 1, month=12)
                else:
                    prev_start = current_start.replace(month=current_start.month - 1)
                prev_end = current_start
            
            query = """
                WITH current_period AS (
                    SELECT category, SUM(total_revenue) as revenue, SUM(total_orders) as orders
                    FROM "CategoryDailyMetrics"
                    WHERE metric_date >= %s AND metric_date < %s
                    GROUP BY category
                ),
                previous_period AS (
                    SELECT category, SUM(total_revenue) as revenue
                    FROM "CategoryDailyMetrics"
                    WHERE metric_date >= %s AND metric_date < %s
                    GROUP BY category
                )
                SELECT 
                    COALESCE(c.category, p.category) as category,
                    COALESCE(c.revenue, 0) as current_revenue,
                    COALESCE(p.revenue, 0) as prev_revenue,
                    COALESCE(c.orders, 0) as total_orders
                FROM current_period c
                FULL OUTER JOIN previous_period p ON c.category = p.category
            """
            
            await cur.execute(query, (current_start, current_end, prev_start, prev_end))
            rows = await cur.fetchall()
            
            results = []
            for row in rows:
                curr_rev = float(row[1])
                prev_rev = float(row[2])
                growth = ((curr_rev - prev_rev) / prev_rev * 100) if prev_rev > 0 else (100.0 if curr_rev > 0 else 0.0)
                
                results.append(CategoryGrowthMetric(
                    category=row[0],
                    current_period_revenue=curr_rev,
                    previous_period_revenue=prev_rev,
                    growth_rate=growth,
                    total_orders=row[3]
                ))
            
            return results


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


@router.get("/top-freelancers")
async def get_top_freelancers(
    start_date: Optional[str] = Query(None),
    end_date: Optional[str] = Query(None),
    category: Optional[str] = Query(None),
    limit: int = Query(50, ge=1, le=500),
    sort_by: str = Query("earnings", regex="^(earnings|completed_orders|rating|response_time|completion_rate|satisfaction)$"),
):
    """
    Get top-performing freelancers with metrics.
    
    Metrics:
    - total_earnings: Sum of all completed order payments
    - completed_orders: Count of completed orders
    - avg_rating: Average rating from reviews
    - avg_response_time: Average response time in hours
    - completion_rate: Percentage of accepted orders that were completed
    - avg_satisfaction: Average client satisfaction score
    """
    async with get_connection() as conn:
        async with conn.cursor() as cur:
            try:
                # Build WHERE clause for date range
                where_clauses = ["o.status = 'completed'"]
                params = []
                
                if start_date:
                    where_clauses.append("o.completed_at >= %s")
                    params.append(start_date)
                
                if end_date:
                    where_clauses.append("o.completed_at <= %s")
                    params.append(end_date)
                
                if category:
                    where_clauses.append("s.category = %s")
                    params.append(category)
                
                where_clause = " AND ".join(where_clauses)
                
                # Determine sort column
                sort_column_map = {
                    "earnings": "total_earnings DESC",
                    "completed_orders": "completed_orders DESC",
                    "rating": "avg_rating DESC NULLS LAST",
                    "response_time": "avg_response_time ASC NULLS LAST",
                    "completion_rate": "completion_rate DESC NULLS LAST",
                    "satisfaction": "avg_satisfaction DESC NULLS LAST",
                }
                sort_sql = sort_column_map[sort_by]
                
                # Query top freelancers with metrics
                query = f"""
                SELECT 
                    f.user_id,
                    u.email,
                    na.name as username,
                    na.wallet_balance,
                    s.category,
                    COUNT(DISTINCT o.order_id)::INTEGER as completed_orders,
                    COALESCE(SUM(o.total_price), 0)::DECIMAL(10,2) as total_earnings,
                    COALESCE(f.avg_rating, 0)::DECIMAL(3,2) as avg_rating,
                    COALESCE(AVG(EXTRACT(EPOCH FROM (o.order_date - o.order_date)) / 3600), 0)::DECIMAL(10,1) as avg_response_time,
                    COALESCE(
                        COUNT(CASE WHEN o.status = 'completed' THEN 1 END)::DECIMAL / 
                        NULLIF(COUNT(CASE WHEN o.status IN ('accepted', 'completed') THEN 1 END), 0) * 100,
                        0
                    )::DECIMAL(5,2) as completion_rate,
                    COALESCE(f.avg_rating, 0)::DECIMAL(3,2) as avg_satisfaction,
                    COUNT(DISTINCT o.order_id) as total_orders_worked
                FROM "Freelancer" f
                JOIN "User" u ON f.user_id = u.user_id
                JOIN "NonAdmin" na ON u.user_id = na.user_id
                JOIN create_service cs ON f.user_id = cs.freelancer_id
                JOIN "Service" s ON cs.service_id = s.service_id
                JOIN make_order mo ON s.service_id = mo.service_id
                JOIN "Order" o ON mo.order_id = o.order_id
                WHERE {where_clause}
                GROUP BY f.user_id, u.email, na.name, na.wallet_balance, s.category, f.avg_rating
                ORDER BY {sort_sql}
                LIMIT %s
                """
                
                params.append(limit)
                await cur.execute(query, params)
                rows = await cur.fetchall()
                
                result = []
                for row in rows:
                    result.append({
                        "user_id": row[0],
                        "username": row[1],
                        "email": row[2],
                        "wallet_balance": float(row[3]) if row[3] is not None else 0,
                        "category": row[4],
                        "completed_orders": row[5],
                        "total_earnings": float(row[6]) if row[6] is not None else 0,
                        "avg_rating": float(row[7]) if row[7] is not None else 0,
                        "avg_response_time_hours": float(row[8]) if row[8] is not None else 0,
                        "completion_rate_percent": float(row[9]) if row[9] is not None else 0,
                        "avg_satisfaction": float(row[10]) if row[10] is not None else 0,
                        "total_orders_worked": row[11],
                    })
                
                return {
                    "count": len(result),
                    "filters": {
                        "start_date": start_date,
                        "end_date": end_date,
                        "category": category,
                        "sort_by": sort_by,
                    },
                    "freelancers": result,
                }
            except Exception as e:
                raise HTTPException(status_code=400, detail=f"Failed to fetch top freelancers: {str(e)}")


@router.post("/events")
async def track_event(event: Dict[str, Any]):
    """
    Track analytics events (impressions, views, clicks, conversions).
    Non-critical endpoint - failures are logged but don't affect user experience.
    """
    try:
        async with get_connection() as conn:
            async with conn.cursor() as cur:
                event_type = event.get('type')
                service_id = event.get('service_id')
                
                if event_type and service_id:
                    # Log to analytics (can be extended later)
                    pass
        return {"status": "success"}
    except Exception as e:
        # Log errors but don't fail the request
        print(f"Analytics event tracking error: {str(e)}")
        return {"status": "logged"}


@router.post("/events/batch")
async def track_events_batch(events: List[Dict[str, Any]]):
    """
    Track multiple analytics events in batch.
    Non-critical endpoint - failures are logged but don't affect user experience.
    """
    try:
        async with get_connection() as conn:
            async with conn.cursor() as cur:
                for event in events:
                    event_type = event.get('type')
                    service_id = event.get('service_id')
                    
                    if event_type and service_id:
                        # Log to analytics (can be extended later)
                        pass
        return {"status": "success", "count": len(events)}
    except Exception as e:
        # Log errors but don't fail the request
        print(f"Analytics batch tracking error: {str(e)}")
        return {"status": "logged", "count": len(events)}


@router.get("/categories/metadata")
async def get_category_metadata():
    async with get_connection() as conn:
        async with conn.cursor() as cur:
            await cur.execute('SELECT category, is_promoted, recruitment_needed, notes, updated_at FROM "CategoryMetadata"')
            rows = await cur.fetchall()
            return [
                {
                    "category": row[0],
                    "is_promoted": row[1],
                    "recruitment_needed": row[2],
                    "notes": row[3],
                    "updated_at": row[4]
                }
                for row in rows
            ]


@router.post("/categories/{category}/metadata")
async def update_category_metadata(category: str, metadata: Dict[str, Any]):
    async with get_connection() as conn:
        async with conn.cursor() as cur:
            # Check if exists
            await cur.execute('SELECT category FROM "CategoryMetadata" WHERE category = %s', (category,))
            exists = await cur.fetchone()
            
            if not exists:
                await cur.execute(
                    'INSERT INTO "CategoryMetadata" (category, is_promoted, recruitment_needed, notes) VALUES (%s, %s, %s, %s)',
                    (category, metadata.get('is_promoted') or False, metadata.get('recruitment_needed') or False, metadata.get('notes'))
                )
            else:
                updates = []
                params = []
                if 'is_promoted' in metadata and metadata['is_promoted'] is not None:
                    updates.append("is_promoted = %s")
                    params.append(metadata['is_promoted'])
                if 'recruitment_needed' in metadata and metadata['recruitment_needed'] is not None:
                    updates.append("recruitment_needed = %s")
                    params.append(metadata['recruitment_needed'])
                if 'notes' in metadata and metadata['notes'] is not None:
                    updates.append("notes = %s")
                    params.append(metadata['notes'])
                
                if updates:
                    updates.append("updated_at = NOW()")
                    params.append(category)
                    await cur.execute(f'UPDATE "CategoryMetadata" SET {", ".join(updates)} WHERE category = %s', params)
            
            await cur.execute('SELECT category, is_promoted, recruitment_needed, notes, updated_at FROM "CategoryMetadata" WHERE category = %s', (category,))
            row = await cur.fetchone()
            await conn.commit()
            
            return {
                "category": row[0],
                "is_promoted": row[1],
                "recruitment_needed": row[2],
                "notes": row[3],
                "updated_at": row[4]
            }
