from typing import List, Optional, Dict, Any
from datetime import date, datetime, timedelta
from backend.db import get_connection
from backend.schemas.analytics import ServiceEventCreate, DailyMetricResponse, FreelancerAnalyticsSummary, EventType
import json

class AnalyticsRepository:
    @staticmethod
    async def create_event(event: ServiceEventCreate, user_id: Optional[int] = None) -> int:
        async with get_connection() as conn:
            async with conn.cursor() as cur:
                await cur.execute(
                    """
                    INSERT INTO "ServiceEvent" (service_id, user_id, event_type, metadata)
                    VALUES (%s, %s, %s, %s)
                    RETURNING event_id
                    """,
                    (event.service_id, user_id, event.event_type, json.dumps(event.metadata))
                )
                event_id = (await cur.fetchone())[0]
                await conn.commit()
                return event_id

    @staticmethod
    async def get_daily_metrics(service_id: int, start_date: date, end_date: date) -> List[DailyMetricResponse]:
        async with get_connection() as conn:
            async with conn.cursor() as cur:
                await cur.execute(
                    """
                    SELECT service_id, date, views_count, clicks_count, orders_count, 
                           conversion_rate, avg_response_time, avg_rating, total_earnings,
                           impressions_count, ctr
                    FROM "ServiceDailyMetric"
                    WHERE service_id = %s AND date BETWEEN %s AND %s
                    ORDER BY date ASC
                    """,
                    (service_id, start_date, end_date)
                )
                rows = await cur.fetchall()
                return [
                    DailyMetricResponse(
                        service_id=row[0],
                        date=row[1],
                        views_count=row[2],
                        clicks_count=row[3],
                        orders_count=row[4],
                        conversion_rate=float(row[5]),
                        avg_response_time=float(row[6]) if row[6] is not None else None,
                        avg_rating=float(row[7]) if row[7] is not None else None,
                        total_earnings=float(row[8]),
                        impressions_count=row[9] if len(row) > 9 else 0,
                        ctr=float(row[10]) if len(row) > 10 and row[10] is not None else 0.0
                    )
                    for row in rows
                ]

    @staticmethod
    async def get_summary(service_id: int, start_date: date, end_date: date) -> FreelancerAnalyticsSummary:
        async with get_connection() as conn:
            async with conn.cursor() as cur:
                await cur.execute(
                    """
                    SELECT 
                        COALESCE(SUM(views_count), 0),
                        COALESCE(SUM(clicks_count), 0),
                        COALESCE(SUM(orders_count), 0),
                        COALESCE(AVG(conversion_rate), 0),
                        AVG(avg_response_time),
                        AVG(avg_rating),
                        COALESCE(SUM(total_earnings), 0),
                        COALESCE(SUM(impressions_count), 0),
                        COALESCE(AVG(ctr), 0)
                    FROM "ServiceDailyMetric"
                    WHERE service_id = %s AND date BETWEEN %s AND %s
                    """,
                    (service_id, start_date, end_date)
                )
                row = await cur.fetchone()
                return FreelancerAnalyticsSummary(
                    total_views=row[0],
                    total_clicks=row[1],
                    total_orders=row[2],
                    avg_conversion_rate=float(row[3]),
                    avg_response_time=float(row[4]) if row[4] is not None else None,
                    avg_rating=float(row[5]) if row[5] is not None else None,
                    total_earnings=float(row[6]),
                    total_impressions=row[7] if len(row) > 7 else 0,
                    avg_ctr=float(row[8]) if len(row) > 8 and row[8] is not None else 0.0
                )
