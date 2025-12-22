from decimal import Decimal
from typing import Optional, List

from fastapi import APIRouter, HTTPException, Query

from db import get_connection
from schemas.service import (
    ServiceCreate,
    ServicePublic,
    ServiceDetail,
    FreelancerSummary,
    ReviewSummary,
    SampleWorkUpdate,
    AddOnCreate,
    ServiceUpdate,
)

router = APIRouter(prefix="/services", tags=["services"])


@router.post("", response_model=ServicePublic, status_code=201)
async def create_service(service: ServiceCreate, freelancer_id: int = Query(...)):
    """
    Create a new service for a freelancer.
    Steps:
    1. INSERT into Service
    2. Link to freelancer via create_service
    3. Optionally add SampleWork
    4. Optionally link add-ons
    """
    async with get_connection() as conn:
        async with conn.cursor() as cur:
            # Verify freelancer exists
            await cur.execute('SELECT user_id FROM "Freelancer" WHERE user_id = %s', (freelancer_id,))
            if not await cur.fetchone():
                raise HTTPException(status_code=404, detail="Freelancer not found")

            try:
                # 1. Insert into Service
                await cur.execute(
                    """
                    INSERT INTO "Service" (title, category, description, delivery_time, hourly_price, package_tier, status, average_rating)
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
                    RETURNING service_id
                    """,
                    (
                        service.title,
                        service.category,
                        service.description,
                        service.delivery_time,
                        service.hourly_price,
                        service.package_tier,
                        "ACTIVE",
                        0.0,
                    ),
                )
                service_id = (await cur.fetchone())[0]

                # 2. Link to freelancer
                await cur.execute(
                    'INSERT INTO create_service (freelancer_id, service_id, date_of_creation) VALUES (%s, %s, NOW())',
                    (freelancer_id, service_id),
                )

                # 3. Optional sample work
                if service.sample_work:
                    await cur.execute(
                        'INSERT INTO "SampleWork" (service_id, sample_work) VALUES (%s, %s)',
                        (service_id, service.sample_work),
                    )

                # 4. Optional add-ons
                if service.addon_service_ids:
                    for addon_id in service.addon_service_ids:
                        # Ensure addon exists and belongs to same freelancer
                        await cur.execute(
                            'SELECT service_id FROM create_service WHERE service_id = %s AND freelancer_id = %s',
                            (addon_id, freelancer_id),
                        )
                        if await cur.fetchone():
                            # Insert with service_id1 < service_id2 per CHECK constraint
                            s1, s2 = (service_id, addon_id) if service_id < addon_id else (addon_id, service_id)
                            await cur.execute(
                                'INSERT INTO add_on (service_id1, service_id2) VALUES (%s, %s) ON CONFLICT DO NOTHING',
                                (s1, s2),
                            )

                await conn.commit()

                # Return created service
                await cur.execute(
                    'SELECT service_id, title, category, description, delivery_time, hourly_price, package_tier, status, average_rating FROM "Service" WHERE service_id = %s',
                    (service_id,),
                )
                row = await cur.fetchone()
                return ServicePublic(
                    service_id=row[0],
                    title=row[1],
                    category=row[2],
                    description=row[3],
                    delivery_time=row[4],
                    hourly_price=float(row[5]) if isinstance(row[5], Decimal) else row[5],
                    package_tier=row[6],
                    status=row[7],
                    average_rating=float(row[8]) if isinstance(row[8], Decimal) else row[8],
                )

            except Exception as e:
                await conn.rollback()
                raise HTTPException(status_code=400, detail=f"Failed to create service: {str(e)}")


@router.get("", response_model=List[ServicePublic])
async def browse_services(
    category: Optional[str] = None,
    min_price: Optional[float] = None,
    max_price: Optional[float] = None,
    delivery_time: Optional[int] = None,
    rating: Optional[float] = None,
    sort: Optional[str] = Query(None, regex="^(popularity|recency|reviews)$"),
    limit: int = Query(50, le=100),
    offset: int = 0,
):
    """
    Browse services with filters and sorting.
    Maps to: "Browse Services with Filters and Sorting" query from design doc.
    """
    async with get_connection() as conn:
        async with conn.cursor() as cur:
            query = """
                SELECT service_id, title, category, description, delivery_time, hourly_price, package_tier, status, average_rating
                FROM "Service" s
                WHERE (%s::TEXT IS NULL OR s.category = %s)
                  AND (%s::NUMERIC IS NULL OR s.hourly_price >= %s)
                  AND (%s::NUMERIC IS NULL OR s.hourly_price <= %s)
                  AND (%s::INTEGER IS NULL OR s.delivery_time <= %s)
                  AND (%s::NUMERIC IS NULL OR s.average_rating >= %s)
                  AND s.status = 'ACTIVE'
            """

            # Dynamic ORDER BY
            if sort == "popularity":
                query += " ORDER BY s.average_rating DESC"
            elif sort == "recency":
                query += " ORDER BY s.service_id DESC"
            elif sort == "reviews":
                query += " ORDER BY s.average_rating DESC"
            else:
                query += " ORDER BY s.service_id DESC"

            query += " LIMIT %s OFFSET %s"

            await cur.execute(
                query,
                (
                    category, category,
                    min_price, min_price,
                    max_price, max_price,
                    delivery_time, delivery_time,
                    rating, rating,
                    limit, offset,
                ),
            )

            rows = await cur.fetchall()
            services = []
            for row in rows:
                services.append(
                    ServicePublic(
                        service_id=row[0],
                        title=row[1],
                        category=row[2],
                        description=row[3],
                        delivery_time=row[4],
                        hourly_price=float(row[5]) if isinstance(row[5], Decimal) else row[5],
                        package_tier=row[6],
                        status=row[7],
                        average_rating=float(row[8]) if isinstance(row[8], Decimal) else row[8],
                    )
                )
            return services


@router.get("/{service_id}", response_model=ServiceDetail)
async def get_service_details(service_id: int):
    """
    View full service details with freelancer info, reviews, sample work, and add-ons.
    Maps to: "View Full Service Details" query from design doc.
    """
    async with get_connection() as conn:
        async with conn.cursor() as cur:
            # Main service + freelancer + sample work
            query = """
                SELECT
                  s.service_id, s.title, s.category, s.description, s.delivery_time,
                  s.hourly_price, s.package_tier, s.status, s.average_rating,
                  f.user_id, f.tagline, f.avg_rating, f.total_orders, f.total_reviews,
                  sw.sample_work,
                  na.name
                FROM "Service" s
                JOIN create_service cs ON s.service_id = cs.service_id
                JOIN "Freelancer" f ON cs.freelancer_id = f.user_id
                JOIN "NonAdmin" na ON f.user_id = na.user_id
                LEFT JOIN "SampleWork" sw ON s.service_id = sw.service_id
                WHERE s.service_id = %s
            """
            await cur.execute(query, (service_id,))
            row = await cur.fetchone()
            if not row:
                raise HTTPException(status_code=404, detail="Service not found")

            (
                sid, title, category, description, delivery_time,
                hourly_price, package_tier, status, average_rating,
                freelancer_id, tagline, freelancer_rating, total_orders, total_reviews,
                sample_work, freelancer_name
            ) = row

            freelancer = FreelancerSummary(
                user_id=freelancer_id,
                username=freelancer_name,
                tagline=tagline,
                avg_rating=float(freelancer_rating) if isinstance(freelancer_rating, Decimal) else freelancer_rating,
                total_orders=total_orders,
                total_reviews=total_reviews,
            )

            # Fetch reviews
            reviews_query = """
                SELECT r.review_id, r.rating, r.comment, r.client_id
                FROM give_review gr
                JOIN "Review" r ON gr.review_id = r.review_id
                WHERE gr.service_id = %s
            """
            await cur.execute(reviews_query, (service_id,))
            review_rows = await cur.fetchall()
            reviews = [
                ReviewSummary(review_id=rr[0], rating=rr[1], comment=rr[2], client_id=rr[3])
                for rr in review_rows
            ]

            # Fetch add-ons
            addons_query = """
                SELECT s2.service_id, s2.title, s2.category, s2.description, s2.delivery_time,
                       s2.hourly_price, s2.package_tier, s2.status, s2.average_rating
                FROM add_on a
                JOIN "Service" s2 ON (a.service_id2 = s2.service_id OR a.service_id1 = s2.service_id)
                WHERE (a.service_id1 = %s OR a.service_id2 = %s) AND s2.service_id != %s
            """
            await cur.execute(addons_query, (service_id, service_id, service_id))
            addon_rows = await cur.fetchall()
            addons = [
                ServicePublic(
                    service_id=ar[0],
                    title=ar[1],
                    category=ar[2],
                    description=ar[3],
                    delivery_time=ar[4],
                    hourly_price=float(ar[5]) if isinstance(ar[5], Decimal) else ar[5],
                    package_tier=ar[6],
                    status=ar[7],
                    average_rating=float(ar[8]) if isinstance(ar[8], Decimal) else ar[8],
                )
                for ar in addon_rows
            ]

            return ServiceDetail(
                service_id=sid,
                title=title,
                category=category,
                description=description,
                delivery_time=delivery_time,
                hourly_price=float(hourly_price) if isinstance(hourly_price, Decimal) else hourly_price,
                package_tier=package_tier,
                status=status,
                average_rating=float(average_rating) if isinstance(average_rating, Decimal) else average_rating,
                freelancer=freelancer,
                sample_work=sample_work,
                reviews=reviews,
                addons=addons,
            )


@router.put("/{service_id}/sample-work")
async def update_sample_work(service_id: int, payload: SampleWorkUpdate):
    """
    Add or update sample work for a service.
    Uses ON CONFLICT to upsert.
    """
    async with get_connection() as conn:
        async with conn.cursor() as cur:
            await cur.execute('SELECT service_id FROM "Service" WHERE service_id = %s', (service_id,))
            if not await cur.fetchone():
                raise HTTPException(status_code=404, detail="Service not found")

            await cur.execute(
                """
                INSERT INTO "SampleWork" (service_id, sample_work)
                VALUES (%s, %s)
                ON CONFLICT (service_id) DO UPDATE SET sample_work = EXCLUDED.sample_work
                """,
                (service_id, payload.sample_work),
            )
            await conn.commit()
            return {"message": "Sample work updated"}


@router.post("/{service_id}/addons", status_code=201)
async def add_addon(service_id: int, payload: AddOnCreate, freelancer_id: int = Query(...)):
    """
    Link an add-on service to the base service.
    Both must belong to the same freelancer.
    """
    async with get_connection() as conn:
        async with conn.cursor() as cur:
            # Verify both services belong to freelancer
            await cur.execute(
                'SELECT service_id FROM create_service WHERE service_id = %s AND freelancer_id = %s',
                (service_id, freelancer_id),
            )
            if not await cur.fetchone():
                raise HTTPException(status_code=404, detail="Base service not found or does not belong to freelancer")

            await cur.execute(
                'SELECT service_id FROM create_service WHERE service_id = %s AND freelancer_id = %s',
                (payload.addon_service_id, freelancer_id),
            )
            if not await cur.fetchone():
                raise HTTPException(status_code=404, detail="Add-on service not found or does not belong to freelancer")

            # Insert with CHECK constraint: service_id1 < service_id2
            s1, s2 = (service_id, payload.addon_service_id) if service_id < payload.addon_service_id else (payload.addon_service_id, service_id)
            await cur.execute(
                'INSERT INTO add_on (service_id1, service_id2) VALUES (%s, %s) ON CONFLICT DO NOTHING',
                (s1, s2),
            )
            await conn.commit()
            return {"message": "Add-on linked"}


@router.get("/{service_id}/addons", response_model=List[ServicePublic])
async def get_addons(service_id: int):
    """
    List all add-ons for a given service.
    """
    async with get_connection() as conn:
        async with conn.cursor() as cur:
            query = """
                SELECT s2.service_id, s2.title, s2.category, s2.description, s2.delivery_time,
                       s2.hourly_price, s2.package_tier, s2.status, s2.average_rating
                FROM add_on a
                JOIN "Service" s2 ON (a.service_id2 = s2.service_id OR a.service_id1 = s2.service_id)
                WHERE (a.service_id1 = %s OR a.service_id2 = %s) AND s2.service_id != %s
            """
            await cur.execute(query, (service_id, service_id, service_id))
            rows = await cur.fetchall()
            addons = [
                ServicePublic(
                    service_id=r[0],
                    title=r[1],
                    category=r[2],
                    description=r[3],
                    delivery_time=r[4],
                    hourly_price=float(r[5]) if isinstance(r[5], Decimal) else r[5],
                    package_tier=r[6],
                    status=r[7],
                    average_rating=float(r[8]) if isinstance(r[8], Decimal) else r[8],
                )
                for r in rows
            ]
            return addons


@router.get("/freelancer/{freelancer_id}", response_model=List[ServicePublic])
async def get_freelancer_services(freelancer_id: int):
    """
    Get all services created by a specific freelancer.
    """
    async with get_connection() as conn:
        async with conn.cursor() as cur:
            query = """
                SELECT s.service_id, s.title, s.category, s.description, s.delivery_time,
                       s.hourly_price, s.package_tier, s.status, s.average_rating
                FROM "Service" s
                JOIN create_service cs ON s.service_id = cs.service_id
                WHERE cs.freelancer_id = %s
                ORDER BY s.service_id DESC
            """
            await cur.execute(query, (freelancer_id,))
            rows = await cur.fetchall()
            services = [
                ServicePublic(
                    service_id=r[0],
                    title=r[1],
                    category=r[2],
                    description=r[3],
                    delivery_time=r[4],
                    hourly_price=float(r[5]) if isinstance(r[5], Decimal) else r[5],
                    package_tier=r[6],
                    status=r[7],
                    average_rating=float(r[8]) if isinstance(r[8], Decimal) else r[8],
                )
                for r in rows
            ]
            return services


# ============================================
# SERVICE MANAGEMENT (Pause/Reactivate/Edit/Delete)
# ============================================

@router.patch("/{service_id}", response_model=ServicePublic)
async def edit_service(service_id: int, update: ServiceUpdate, freelancer_id: int = Query(...)):
    """
    Edit service details (title, description, price, delivery time).
    Only the freelancer who owns the service can edit it.
    """
    async with get_connection() as conn:
        async with conn.cursor() as cur:
            # Verify ownership
            await cur.execute(
                'SELECT service_id FROM create_service WHERE service_id = %s AND freelancer_id = %s',
                (service_id, freelancer_id),
            )
            if not await cur.fetchone():
                raise HTTPException(status_code=403, detail="Not authorized to edit this service")

            # Build dynamic UPDATE
            updates = []
            values = []
            if update.title is not None:
                updates.append("title = %s")
                values.append(update.title)
            if update.description is not None:
                updates.append("description = %s")
                values.append(update.description)
            if update.delivery_time is not None:
                updates.append("delivery_time = %s")
                values.append(update.delivery_time)
            if update.hourly_price is not None:
                updates.append("hourly_price = %s")
                values.append(update.hourly_price)
            if update.package_tier is not None:
                updates.append("package_tier = %s")
                values.append(update.package_tier)

            if not updates:
                # No updates provided, just return current service
                await cur.execute(
                    'SELECT service_id, title, category, description, delivery_time, hourly_price, package_tier, status, average_rating FROM "Service" WHERE service_id = %s',
                    (service_id,),
                )
            else:
                updates.append("updated_at = NOW()")
                query = f"UPDATE \"Service\" SET {', '.join(updates)} WHERE service_id = %s RETURNING service_id, title, category, description, delivery_time, hourly_price, package_tier, status, average_rating"
                values.append(service_id)
                await cur.execute(query, values)

            row = await cur.fetchone()
            if not row:
                raise HTTPException(status_code=404, detail="Service not found")

            await conn.commit()
            return ServicePublic(
                service_id=row[0],
                title=row[1],
                category=row[2],
                description=row[3],
                delivery_time=row[4],
                hourly_price=float(row[5]) if isinstance(row[5], Decimal) else row[5],
                package_tier=row[6],
                status=row[7],
                average_rating=float(row[8]) if isinstance(row[8], Decimal) else row[8],
            )


@router.patch("/{service_id}/pause", response_model=ServicePublic)
async def pause_service(service_id: int, freelancer_id: int = Query(...)):
    """
    Pause a service (hide it from client browse).
    Only ACTIVE services can be paused.
    Only the freelancer who owns the service can pause it.
    """
    async with get_connection() as conn:
        async with conn.cursor() as cur:
            # Verify ownership and status
            await cur.execute(
                'SELECT service_id FROM create_service WHERE service_id = %s AND freelancer_id = %s',
                (service_id, freelancer_id),
            )
            if not await cur.fetchone():
                raise HTTPException(status_code=403, detail="Not authorized to pause this service")

            # Pause only if ACTIVE
            await cur.execute(
                """
                UPDATE "Service"
                SET status = 'PAUSED', updated_at = NOW()
                WHERE service_id = %s AND status = 'ACTIVE'
                RETURNING service_id, title, category, description, delivery_time, hourly_price, package_tier, status, average_rating
                """,
                (service_id,),
            )
            row = await cur.fetchone()
            if not row:
                raise HTTPException(status_code=400, detail="Service is not active or not found")

            await conn.commit()
            return ServicePublic(
                service_id=row[0],
                title=row[1],
                category=row[2],
                description=row[3],
                delivery_time=row[4],
                hourly_price=float(row[5]) if isinstance(row[5], Decimal) else row[5],
                package_tier=row[6],
                status=row[7],
                average_rating=float(row[8]) if isinstance(row[8], Decimal) else row[8],
            )


@router.patch("/{service_id}/reactivate", response_model=ServicePublic)
async def reactivate_service(service_id: int, freelancer_id: int = Query(...)):
    """
    Reactivate a paused service.
    Only PAUSED services can be reactivated.
    Only the freelancer who owns the service can reactivate it.
    """
    async with get_connection() as conn:
        async with conn.cursor() as cur:
            # Verify ownership and status
            await cur.execute(
                'SELECT service_id FROM create_service WHERE service_id = %s AND freelancer_id = %s',
                (service_id, freelancer_id),
            )
            if not await cur.fetchone():
                raise HTTPException(status_code=403, detail="Not authorized to reactivate this service")

            # Reactivate only if PAUSED
            await cur.execute(
                """
                UPDATE "Service"
                SET status = 'ACTIVE', updated_at = NOW()
                WHERE service_id = %s AND status = 'PAUSED'
                RETURNING service_id, title, category, description, delivery_time, hourly_price, package_tier, status, average_rating
                """,
                (service_id,),
            )
            row = await cur.fetchone()
            if not row:
                raise HTTPException(status_code=400, detail="Service is not paused or not found")

            await conn.commit()
            return ServicePublic(
                service_id=row[0],
                title=row[1],
                category=row[2],
                description=row[3],
                delivery_time=row[4],
                hourly_price=float(row[5]) if isinstance(row[5], Decimal) else row[5],
                package_tier=row[6],
                status=row[7],
                average_rating=float(row[8]) if isinstance(row[8], Decimal) else row[8],
            )


@router.delete("/{service_id}", status_code=204)
async def delete_service(service_id: int, freelancer_id: int = Query(...)):
    """Delete a service. Only the owner freelancer can delete their own service."""
    async with get_connection() as conn:
        async with conn.cursor() as cur:
            # Verify the service belongs to the freelancer
            await cur.execute(
                'SELECT service_id FROM create_service WHERE service_id = %s AND freelancer_id = %s',
                (service_id, freelancer_id),
            )
            if not await cur.fetchone():
                raise HTTPException(status_code=404, detail="Service not found or you don't own this service")
            
            # Check if service has active orders
            await cur.execute(
                '''
                SELECT COUNT(*) FROM make_order mo
                JOIN "Order" o ON mo.order_id = o.order_id
                WHERE mo.service_id = %s AND o.status IN ('pending', 'in_progress')
                ''',
                (service_id,),
            )
            active_orders = (await cur.fetchone())[0]
            if active_orders > 0:
                raise HTTPException(status_code=400, detail="Cannot delete service with active orders")
            
            try:
                # Delete the service (cascade will handle related tables)
                await cur.execute('DELETE FROM "Service" WHERE service_id = %s', (service_id,))
                await conn.commit()
            except Exception as e:
                await conn.rollback()
                raise HTTPException(status_code=400, detail=f"Failed to delete service: {str(e)}")
