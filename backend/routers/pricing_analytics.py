from typing import List, Optional
from fastapi import APIRouter, HTTPException, Query

from backend.db import get_connection
from backend.schemas.pricing_analytics import (
    PricingSummary,
    CategoryTrendPoint,
    PriceDistributionBucket,
    PriceDemandPoint,
    UndercuttingService,
    PremiumAdoptionPoint,
)

router = APIRouter(tags=["pricing-analytics"])


@router.get("/pricing-analytics/summary", response_model=PricingSummary)
async def get_pricing_summary():
    """Get overall pricing metrics for the platform"""
    try:
        async with get_connection() as conn:
            async with conn.cursor() as cur:
                # Get price statistics
                await cur.execute('''
                    SELECT 
                        COALESCE(PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY hourly_price), 0) AS median_price,
                        COALESCE(AVG(hourly_price), 0) AS avg_price,
                        COALESCE(STDDEV(hourly_price), 0) AS std_dev,
                        COUNT(*) AS total_services,
                        COUNT(DISTINCT category) AS categories_count
                    FROM "Service"
                    WHERE hourly_price IS NOT NULL AND hourly_price > 0
                ''')
                stats = await cur.fetchone()

                # Most expensive category
                await cur.execute('''
                    SELECT category, AVG(hourly_price) AS avg_price
                    FROM "Service"
                    WHERE hourly_price IS NOT NULL AND hourly_price > 0
                    GROUP BY category
                    ORDER BY avg_price DESC
                    LIMIT 1
                ''')
                expensive = await cur.fetchone()

                # Most competitive category (most services)
                await cur.execute('''
                    SELECT category, COUNT(*) AS service_count
                    FROM "Service"
                    GROUP BY category
                    ORDER BY service_count DESC
                    LIMIT 1
                ''')
                competitive = await cur.fetchone()

                return PricingSummary(
                    median_price=float(stats[0]) if stats else 0.0,
                    avg_price=float(stats[1]) if stats else 0.0,
                    std_dev_price=float(stats[2]) if stats else 0.0,
                    total_services=int(stats[3]) if stats else 0,
                    categories_count=int(stats[4]) if stats else 0,
                    avg_orders_per_service=0.0,
                    most_expensive_category=expensive[0] if expensive else None,
                    most_expensive_avg=float(expensive[1]) if expensive else None,
                    most_competitive_category=competitive[0] if competitive else None,
                    most_competitive_count=int(competitive[1]) if competitive else None,
                )
    except Exception as e:
        print(f"Error in get_pricing_summary: {e}")
        return PricingSummary(
            median_price=0.0, avg_price=0.0, std_dev_price=0.0,
            total_services=0, categories_count=0, avg_orders_per_service=0.0,
            most_expensive_category=None, most_expensive_avg=None,
            most_competitive_category=None, most_competitive_count=None,
        )


@router.get("/pricing-analytics/category-trends", response_model=List[CategoryTrendPoint])
async def get_category_trends(
    granularity: str = Query("month", pattern="^(day|week|month)$"),
):
    """Get average prices per category over time (based on Order history)"""
    try:
        async with get_connection() as conn:
            async with conn.cursor() as cur:
                # Use Order table to get historical pricing trends
                await cur.execute('''
                    SELECT 
                        s.category,
                        TO_CHAR(date_trunc(%s, o.created_at), 'YYYY-MM-DD') AS period,
                        AVG(o.total_price) AS avg_price,
                        COUNT(*) AS service_count
                    FROM "Order" o
                    JOIN "Service" s ON o.service_id = s.service_id
                    WHERE o.total_price IS NOT NULL AND o.total_price > 0
                    GROUP BY s.category, date_trunc(%s, o.created_at)
                    ORDER BY period, s.category
                ''', (granularity, granularity))
                rows = await cur.fetchall()

                # If no orders, fallback to current service prices (snapshot)
                if not rows:
                    await cur.execute('''
                        SELECT 
                            category,
                            TO_CHAR(date_trunc(%s, COALESCE(updated_at, NOW())), 'YYYY-MM-DD') AS period,
                            AVG(hourly_price) AS avg_price,
                            COUNT(*) AS service_count
                        FROM "Service"
                        WHERE hourly_price IS NOT NULL AND hourly_price > 0
                        GROUP BY category, date_trunc(%s, COALESCE(updated_at, NOW()))
                        ORDER BY period, category
                    ''', (granularity, granularity))
                    rows = await cur.fetchall()

                return [
                    CategoryTrendPoint(
                        category=r[0],
                        period=r[1],
                        avg_price=float(r[2] or 0),
                        service_count=int(r[3]),
                    )
                    for r in rows
                ]
    except Exception as e:
        print(f"Error in get_category_trends: {e}")
        return []


@router.get("/pricing-analytics/price-distribution", response_model=List[PriceDistributionBucket])
async def get_price_distribution(
    bucket_size: float = Query(10.0, ge=1.0),
):
    """Get histogram of service prices"""
    try:
        async with get_connection() as conn:
            async with conn.cursor() as cur:
                await cur.execute('''
                    SELECT 
                        FLOOR(hourly_price / %s) * %s AS range_start,
                        COUNT(*) AS count
                    FROM "Service"
                    WHERE hourly_price IS NOT NULL AND hourly_price > 0
                    GROUP BY range_start
                    ORDER BY range_start
                ''', (bucket_size, bucket_size))
                rows = await cur.fetchall()

                return [
                    PriceDistributionBucket(
                        bucket_label=f"${int(r[0])}-${int(r[0] + bucket_size)}",
                        range_start=float(r[0]),
                        range_end=float(r[0]) + bucket_size,
                        count=int(r[1]),
                    )
                    for r in rows
                ]
    except Exception as e:
        print(f"Error in get_price_distribution: {e}")
        return []


@router.get("/pricing-analytics/price-demand-correlation", response_model=List[PriceDemandPoint])
async def get_price_demand_correlation():
    """Get price vs demand data for correlation analysis"""
    try:
        async with get_connection() as conn:
            async with conn.cursor() as cur:
                await cur.execute('''
                    SELECT 
                        s.service_id,
                        s.title,
                        s.hourly_price,
                        s.category,
                        COUNT(o.order_id) AS order_count,
                        COALESCE(SUM(o.total_price), 0) AS revenue
                    FROM "Service" s
                    LEFT JOIN "Order" o ON s.service_id = o.service_id
                    WHERE s.hourly_price IS NOT NULL AND s.hourly_price > 0
                    GROUP BY s.service_id, s.title, s.hourly_price, s.category
                    ORDER BY s.hourly_price DESC
                    LIMIT 100
                ''')
                rows = await cur.fetchall()

                return [
                    PriceDemandPoint(
                        service_id=r[0],
                        title=r[1],
                        avg_price=float(r[2] or 0),
                        category=r[3],
                        total_orders=int(r[4]),
                        revenue=float(r[5] or 0),
                    )
                    for r in rows
                ]
    except Exception as e:
        print(f"Error in get_price_demand_correlation: {e}")
        return []


@router.get("/pricing-analytics/undercutting-patterns", response_model=List[UndercuttingService])
async def get_undercutting_patterns(
    threshold_percentage: float = Query(20.0, ge=0.0, le=100.0),
):
    """Identify services priced significantly below category average"""
    try:
        async with get_connection() as conn:
            async with conn.cursor() as cur:
                await cur.execute('''
                    WITH category_avg AS (
                        SELECT category, AVG(hourly_price) AS avg_price
                        FROM "Service"
                        WHERE hourly_price IS NOT NULL AND hourly_price > 0
                        GROUP BY category
                    )
                    SELECT 
                        s.service_id,
                        s.title,
                        s.hourly_price,
                        s.category,
                        ca.avg_price AS category_avg,
                        ((ca.avg_price - s.hourly_price) / NULLIF(ca.avg_price, 0) * 100) AS percentage_below
                    FROM "Service" s
                    JOIN category_avg ca ON s.category = ca.category
                    WHERE s.hourly_price < ca.avg_price * (1 - %s / 100.0)
                    ORDER BY percentage_below DESC
                    LIMIT 50
                ''', (threshold_percentage,))
                rows = await cur.fetchall()

                return [
                    UndercuttingService(
                        service_id=r[0],
                        service_title=r[1],
                        service_price=float(r[2] or 0),
                        category=r[3],
                        category_avg=float(r[4] or 0),
                        price_diff_pct=float(r[5] or 0),
                    )
                    for r in rows
                ]
    except Exception as e:
        print(f"Error in get_undercutting_patterns: {e}")
        return []


@router.get("/pricing-analytics/premium-adoption", response_model=List[PremiumAdoptionPoint])
async def get_premium_adoption(
    granularity: str = Query("month", pattern="^(day|week|month)$"),
):
    """Get premium tier adoption rates over time"""
    try:
        async with get_connection() as conn:
            async with conn.cursor() as cur:
                await cur.execute('''
                    SELECT 
                        TO_CHAR(date_trunc(%s, COALESCE(updated_at, NOW())), 'YYYY-MM-DD') AS period,
                        COUNT(*) FILTER (WHERE LOWER(COALESCE(package_tier, 'basic')) = 'basic') AS basic_count,
                        COUNT(*) FILTER (WHERE LOWER(COALESCE(package_tier, '')) = 'standard') AS standard_count,
                        COUNT(*) FILTER (WHERE LOWER(COALESCE(package_tier, '')) = 'premium') AS premium_count,
                        COUNT(*) AS total_count
                    FROM "Service"
                    GROUP BY date_trunc(%s, COALESCE(updated_at, NOW()))
                    ORDER BY period
                ''', (granularity, granularity))
                rows = await cur.fetchall()

                result = []
                for r in rows:
                    total = int(r[4]) or 1
                    basic = int(r[1])
                    standard = int(r[2])
                    premium = int(r[3])

                    result.append(PremiumAdoptionPoint(
                        period=r[0],
                        basic_count=basic,
                        standard_count=standard,
                        premium_count=premium,
                        basic_pct=round((basic / total) * 100, 1),
                        standard_pct=round((standard / total) * 100, 1),
                        premium_pct=round((premium / total) * 100, 1),
                    ))

                return result
    except Exception as e:
        print(f"Error in get_premium_adoption: {e}")
        return []
