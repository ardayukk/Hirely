from fastapi import APIRouter, HTTPException
from datetime import datetime, timedelta
from backend.db import get_connection
from backend.schemas.satisfaction import (
    NPSSurvey,
    NPSSurveyCreate,
    SatisfactionMetrics,
    SatisfactionTrend,
    SatisfactionDrilldown
)

router = APIRouter(prefix="/api/satisfaction", tags=["satisfaction"])


@router.get("/metrics", response_model=SatisfactionMetrics)
async def get_satisfaction_metrics(
    start_date: str = None,
    end_date: str = None,
    category: str = None,
    freelancer_tier: str = None
):
    """
    Get overall platform satisfaction metrics.
    Includes: average ratings, NPS, completion rates, revision rates, dispute rates, etc.
    """
    async with get_connection() as conn:
        async with conn.cursor() as cur:
            # Build date filter
            date_filter = ""
            params = []
            if start_date:
                date_filter += " AND o.created_at >= %s"
                params.append(start_date)
            if end_date:
                date_filter += " AND o.created_at <= %s"
                params.append(end_date)

            # Build category filter
            category_filter = ""
            if category:
                category_filter = " AND s.category = %s"
                params.append(category)

            # Average order rating
            query = """
                SELECT AVG(r.rating) as avg_rating
                FROM "Review" r
                JOIN give_review gr ON r.review_id = gr.review_id
                JOIN "Order" o ON gr.service_id = (SELECT service_id FROM make_order WHERE order_id = o.order_id LIMIT 1)
                WHERE o.status = 'completed'
            """
            if start_date or end_date:
                query += date_filter.replace("o.created_at", "o.created_at", 1)
            
            await cur.execute(query, params[:len(date_filter.count('%s'))] if date_filter else [])
            rating_result = await cur.fetchone()
            avg_order_rating = float(rating_result[0]) if rating_result and rating_result[0] else 0.0

            # NPS and satisfaction surveys
            query = """
                SELECT 
                    AVG(CAST(nps_score AS FLOAT)) as avg_nps,
                    AVG(CAST(satisfaction_rating AS FLOAT)) as avg_satisfaction,
                    COUNT(*) as total_surveys,
                    SUM(CASE WHEN would_repeat = true THEN 1 ELSE 0 END) as repeat_count
                FROM "NPSSurvey"
                WHERE 1=1
            """
            survey_params = []
            if start_date:
                query += " AND created_at >= %s"
                survey_params.append(start_date)
            if end_date:
                query += " AND created_at <= %s"
                survey_params.append(end_date)

            await cur.execute(query, survey_params)
            survey_result = await cur.fetchone()
            avg_nps = float(survey_result[0]) if survey_result and survey_result[0] else 0.0
            avg_satisfaction = float(survey_result[1]) if survey_result and survey_result[1] else 0.0
            total_surveys = survey_result[2] if survey_result else 0
            repeat_count = survey_result[3] if survey_result else 0

            # Order completion rate
            query = """
                SELECT 
                    COUNT(CASE WHEN status = 'completed' THEN 1 END)::FLOAT / 
                    NULLIF(COUNT(*), 0) as completion_rate,
                    COUNT(*) as total_orders
                FROM "Order"
                WHERE 1=1
            """
            order_params = []
            if start_date:
                query += " AND created_at >= %s"
                order_params.append(start_date)
            if end_date:
                query += " AND created_at <= %s"
                order_params.append(end_date)

            await cur.execute(query, order_params)
            order_result = await cur.fetchone()
            completion_rate = float(order_result[0]) if order_result and order_result[0] else 0.0
            total_orders = order_result[1] if order_result else 0

            # Revision request rate
            query = """
                SELECT 
                    COUNT(DISTINCT r.revision_id)::FLOAT / 
                    NULLIF(COUNT(DISTINCT o.order_id), 0) as revision_rate
                FROM "Order" o
                LEFT JOIN "Revision" r ON o.order_id = r.order_id
                WHERE 1=1
            """
            revision_params = []
            if start_date:
                query += " AND o.created_at >= %s"
                revision_params.append(start_date)
            if end_date:
                query += " AND o.created_at <= %s"
                revision_params.append(end_date)

            await cur.execute(query, revision_params)
            revision_result = await cur.fetchone()
            revision_rate = float(revision_result[0]) if revision_result and revision_result[0] else 0.0

            # Dispute rate
            query = """
                SELECT 
                    COUNT(*)::FLOAT / 
                    NULLIF((SELECT COUNT(*) FROM "Order"), 0) as dispute_rate
                FROM "Dispute"
                WHERE 1=1
            """
            dispute_params = []
            if start_date:
                query += " AND created_at >= %s"
                dispute_params.append(start_date)
            if end_date:
                query += " AND created_at <= %s"
                dispute_params.append(end_date)

            await cur.execute(query, dispute_params)
            dispute_result = await cur.fetchone()
            dispute_rate = float(dispute_result[0]) if dispute_result and dispute_result[0] else 0.0

            # Response time satisfaction
            query = """
                SELECT AVG(CAST(response_time_rating AS FLOAT))
                FROM "NPSSurvey"
                WHERE 1=1
            """
            response_params = []
            if start_date:
                query += " AND created_at >= %s"
                response_params.append(start_date)
            if end_date:
                query += " AND created_at <= %s"
                response_params.append(end_date)

            await cur.execute(query, response_params)
            response_result = await cur.fetchone()
            avg_response_time = float(response_result[0]) if response_result and response_result[0] else 0.0

            # Repeat client rate
            repeat_client_rate = float(repeat_count) / total_surveys if total_surveys > 0 else 0.0

            # Revised orders count
            query = """
                SELECT COUNT(DISTINCT o.order_id)
                FROM "Order" o
                JOIN "Revision" r ON o.order_id = r.order_id
                WHERE 1=1
            """
            revised_params = []
            if start_date:
                query += " AND o.created_at >= %s"
                revised_params.append(start_date)
            if end_date:
                query += " AND o.created_at <= %s"
                revised_params.append(end_date)

            await cur.execute(query, revised_params)
            revised_result = await cur.fetchone()
            total_revised = revised_result[0] if revised_result else 0

            # Disputed orders count
            query = """
                SELECT COUNT(*)
                FROM "Dispute"
                WHERE 1=1
            """
            disputed_params = []
            if start_date:
                query += " AND created_at >= %s"
                disputed_params.append(start_date)
            if end_date:
                query += " AND created_at <= %s"
                disputed_params.append(end_date)

            await cur.execute(query, disputed_params)
            disputed_result = await cur.fetchone()
            total_disputed = disputed_result[0] if disputed_result else 0

            return SatisfactionMetrics(
                avg_order_rating=avg_order_rating,
                avg_nps_score=avg_nps,
                order_completion_rate=completion_rate,
                revision_request_rate=revision_rate,
                dispute_rate=dispute_rate,
                avg_response_time_satisfaction=avg_response_time,
                repeat_client_rate=repeat_client_rate,
                total_surveys=total_surveys,
                total_completed_orders=int(total_orders),
                total_revised_orders=int(total_revised),
                total_disputed_orders=int(total_disputed)
            )


@router.get("/trends")
async def get_satisfaction_trends(days: int = 30):
    """
    Get satisfaction trends over time (daily for last N days).
    """
    async with get_connection() as conn:
        async with conn.cursor() as cur:
            start_date = (datetime.now() - timedelta(days=days)).date()

            query = """
                SELECT 
                    DATE(n.created_at) as date,
                    AVG(CAST(n.nps_score AS FLOAT)) as avg_nps,
                    AVG(CAST(n.satisfaction_rating AS FLOAT)) as avg_satisfaction,
                    COUNT(CASE WHEN o.status = 'completed' THEN 1 END)::FLOAT / 
                        NULLIF(COUNT(o.order_id), 0) as completion_rate,
                    COUNT(CASE WHEN n.would_repeat = true THEN 1 END)::FLOAT / 
                        NULLIF(COUNT(n.survey_id), 0) as repeat_rate
                FROM "NPSSurvey" n
                LEFT JOIN "Order" o ON n.order_id = o.order_id
                WHERE DATE(n.created_at) >= %s
                GROUP BY DATE(n.created_at)
                ORDER BY date DESC
            """
            await cur.execute(query, (start_date,))
            rows = await cur.fetchall()

            trends = []
            for row in rows:
                trends.append(SatisfactionTrend(
                    date=str(row[0]),
                    nps_score=float(row[1]) if row[1] else 0.0,
                    satisfaction_rating=float(row[2]) if row[2] else 0.0,
                    completion_rate=float(row[3]) if row[3] else 0.0,
                    repeat_rate=float(row[4]) if row[4] else 0.0
                ))

            return trends


@router.post("/survey", response_model=NPSSurvey)
async def submit_satisfaction_survey(survey: NPSSurveyCreate):
    """
    Submit a satisfaction survey for an order.
    """
    async with get_connection() as conn:
        async with conn.cursor() as cur:
            # Get order details to extract client and freelancer IDs
            await cur.execute("""
                SELECT mo.client_id, cs.freelancer_id
                FROM "Order" o
                JOIN make_order mo ON o.order_id = mo.order_id
                JOIN create_service cs ON mo.service_id = cs.service_id
                WHERE o.order_id = %s
            """, (survey.order_id,))
            
            result = await cur.fetchone()
            if not result:
                raise HTTPException(status_code=404, detail="Order not found")

            client_id, freelancer_id = result

            # Insert survey
            await cur.execute("""
                INSERT INTO "NPSSurvey" 
                (order_id, client_id, freelancer_id, nps_score, satisfaction_rating, 
                 response_time_rating, quality_rating, communication_rating, would_repeat, comments)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                RETURNING survey_id, created_at
            """, (
                survey.order_id, client_id, freelancer_id,
                survey.nps_score, survey.satisfaction_rating,
                survey.response_time_rating, survey.quality_rating,
                survey.communication_rating, survey.would_repeat,
                survey.comments
            ))

            row = await cur.fetchone()
            await conn.commit()

            return NPSSurvey(
                survey_id=row[0],
                order_id=survey.order_id,
                client_id=client_id,
                freelancer_id=freelancer_id,
                nps_score=survey.nps_score,
                satisfaction_rating=survey.satisfaction_rating,
                response_time_rating=survey.response_time_rating,
                quality_rating=survey.quality_rating,
                communication_rating=survey.communication_rating,
                would_repeat=survey.would_repeat,
                comments=survey.comments,
                created_at=row[1]
            )


@router.get("/drilldown")
async def get_satisfaction_drilldown(
    category: str = None,
    freelancer_tier: str = None,
    days: int = 30
):
    """
    Get satisfaction metrics with drill-down by category or freelancer tier.
    """
    async with get_connection() as conn:
        async with conn.cursor() as cur:
            start_date = (datetime.now() - timedelta(days=days)).date()

            # Build filters
            where_clause = "WHERE o.created_at >= %s"
            params = [start_date]

            if category:
                where_clause += " AND s.category = %s"
                params.append(category)

            if freelancer_tier:
                # Map tier to rating range
                if freelancer_tier == "top":
                    where_clause += " AND f.avg_rating >= 4.5"
                elif freelancer_tier == "experienced":
                    where_clause += " AND f.avg_rating BETWEEN 3.5 AND 4.5"
                elif freelancer_tier == "rising":
                    where_clause += " AND f.avg_rating < 3.5"

            # Query metrics
            query = f"""
                SELECT 
                    AVG(r.rating) as avg_rating,
                    AVG(CAST(n.nps_score AS FLOAT)) as avg_nps,
                    COUNT(CASE WHEN o.status = 'completed' THEN 1 END)::FLOAT / 
                        NULLIF(COUNT(o.order_id), 0) as completion_rate,
                    COUNT(CASE WHEN n.would_repeat = true THEN 1 END)::FLOAT / 
                        NULLIF(COUNT(n.survey_id), 0) as repeat_rate,
                    COUNT(DISTINCT n.survey_id) as total_surveys,
                    COUNT(DISTINCT o.order_id) as total_orders
                FROM "Order" o
                LEFT JOIN make_order mo ON o.order_id = mo.order_id
                LEFT JOIN "Service" s ON mo.service_id = s.service_id
                LEFT JOIN create_service cs ON s.service_id = cs.service_id
                LEFT JOIN "Freelancer" f ON cs.freelancer_id = f.user_id
                LEFT JOIN "Review" r ON r.client_id = mo.client_id
                LEFT JOIN "NPSSurvey" n ON o.order_id = n.order_id
                {where_clause}
                GROUP BY {("s.category" if category else "1")}
            """

            await cur.execute(query, params)
            rows = await cur.fetchall()

            results = []
            for row in rows:
                metrics = SatisfactionMetrics(
                    avg_order_rating=float(row[0]) if row[0] else 0.0,
                    avg_nps_score=float(row[1]) if row[1] else 0.0,
                    order_completion_rate=float(row[2]) if row[2] else 0.0,
                    revision_request_rate=0.0,  # Can be calculated separately if needed
                    dispute_rate=0.0,  # Can be calculated separately if needed
                    avg_response_time_satisfaction=0.0,
                    repeat_client_rate=float(row[3]) if row[3] else 0.0,
                    total_surveys=int(row[4]) if row[4] else 0,
                    total_completed_orders=int(row[5]) if row[5] else 0,
                    total_revised_orders=0,
                    total_disputed_orders=0
                )

                results.append({
                    "category": category or "All",
                    "freelancer_tier": freelancer_tier or "All",
                    "period": f"Last {days} days",
                    "metrics": metrics
                })

            return results
