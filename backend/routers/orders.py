from decimal import Decimal
from typing import List, Optional
from fastapi import APIRouter, HTTPException, Query
from datetime import datetime, timedelta
import json

from db import get_connection


def _safe_json_load(raw):
    try:
        return json.loads(raw) if raw else None
    except Exception:
        return None
from schemas.order import (
    OrderCreate,
    OrderPublic,
    OrderDetail,
    RevisionCreate,
    RevisionPublic,
    ReviewCreate,
    ReviewPublic,
)

router = APIRouter(prefix="/orders", tags=["orders"])


@router.post("", response_model=OrderPublic, status_code=201)
async def place_order(order: OrderCreate, client_id: int = Query(...)):
    """
    Client places an order for a service.
    Steps (in one transaction):
    1. Insert into Order
    2. Link client + service via make_order
    3. Insert into SmallOrder or BigOrder
    4. Create Payment + finish_order (escrow model)
    """
    async with get_connection() as conn:
        async with conn.cursor() as cur:
            try:
                # Verify client exists
                await cur.execute('SELECT user_id FROM "Client" WHERE user_id = %s', (client_id,))
                if not await cur.fetchone():
                    raise HTTPException(status_code=404, detail="Client not found")

                # Get service and freelancer
                await cur.execute(
                    '''
                    SELECT s.service_id, cs.freelancer_id
                    FROM "Service" s
                    JOIN create_service cs ON s.service_id = cs.service_id
                    WHERE s.service_id = %s
                    ''',
                    (order.service_id,),
                )
                service_row = await cur.fetchone()
                if not service_row:
                    raise HTTPException(status_code=404, detail="Service not found")
                service_id, freelancer_id = service_row

                # 1. Create base order
                requirements_json = json.dumps(order.requirements) if order.requirements else None
                req_hours = order.required_hours if getattr(order, 'required_hours', None) is not None else None
                await cur.execute(
                    '''
                    INSERT INTO "Order" (order_date, status, revision_count, total_price, review_given, requirements, required_hours)
                    VALUES (NOW(), 'pending', 0, %s, FALSE, %s, %s)
                    RETURNING order_id
                    ''',
                    (order.total_price, requirements_json, req_hours),
                )
                order_id = (await cur.fetchone())[0]

                # 2. Link client + service via make_order
                await cur.execute(
                    'INSERT INTO make_order (order_id, client_id, service_id) VALUES (%s, %s, %s)',
                    (order_id, client_id, service_id),
                )

                # 3. Insert into SmallOrder or BigOrder
                if order.order_type == "small":
                    delivery_date = order.delivery_date or (datetime.now() + timedelta(days=7))
                    await cur.execute(
                        'INSERT INTO "SmallOrder" (order_id, delivery_date) VALUES (%s, %s)',
                        (order_id, delivery_date),
                    )
                elif order.order_type == "big":
                    await cur.execute(
                        '''
                        INSERT INTO "BigOrder" (order_id, milestone_count, current_phase, milestone_delivery_date)
                        VALUES (%s, %s, 1, %s)
                        ''',
                        (order_id, order.milestone_count or 3, order.milestone_delivery_date),
                    )

                # 4. Create Payment (escrow on order placement)
                await cur.execute(
                    'INSERT INTO "Payment" (amount, payment_date) VALUES (%s, NOW()) RETURNING payment_id',
                    (order.total_price,),
                )
                payment_id = (await cur.fetchone())[0]

                # Link payment + freelancer + order via finish_order
                await cur.execute(
                    'INSERT INTO finish_order (order_id, payment_id, freelancer_id) VALUES (%s, %s, %s)',
                    (order_id, payment_id, freelancer_id),
                )

                # 5. Optional add-ons selected by client
                if getattr(order, 'addon_service_ids', None):
                    for aid in order.addon_service_ids:
                        # ensure addon is a valid add-on for this service
                        await cur.execute(
                            'SELECT 1 FROM add_on WHERE (service_id1 = %s AND service_id2 = %s) OR (service_id1 = %s AND service_id2 = %s) LIMIT 1',
                            (service_id, aid, aid, service_id),
                        )
                        if await cur.fetchone():
                            await cur.execute(
                                'INSERT INTO order_addon (order_id, addon_service_id) VALUES (%s, %s) ON CONFLICT DO NOTHING',
                                (order_id, aid),
                            )

                await conn.commit()

                return OrderPublic(
                    order_id=order_id,
                    order_date=datetime.now(),
                    status="pending",
                    revision_count=0,
                    total_price=order.total_price,
                    review_given=False,
                    service_id=service_id,
                    client_id=client_id,
                    freelancer_id=freelancer_id,
                    required_hours=order.required_hours if getattr(order, 'required_hours', None) is not None else None,
                    addon_service_ids=getattr(order, 'addon_service_ids', None) or [],
                )

            except Exception as e:
                await conn.rollback()
                raise HTTPException(status_code=400, detail=f"Failed to place order: {str(e)}")


@router.get("", response_model=List[OrderPublic])
async def get_orders(user_id: int = Query(...)):
    """Get all orders for a user (client or freelancer)"""
    async with get_connection() as conn:
        async with conn.cursor() as cur:
            # Try as client
            query = '''
                SELECT o.order_id, o.order_date, o.status, o.revision_count, o.total_price, o.review_given,
                       mo.service_id, mo.client_id, fo.freelancer_id, o.required_hours, o.requirements
                FROM "Order" o
                JOIN make_order mo ON o.order_id = mo.order_id
                LEFT JOIN finish_order fo ON o.order_id = fo.order_id
                WHERE mo.client_id = %s
                ORDER BY o.order_date DESC
            '''
            await cur.execute(query, (user_id,))
            client_rows = await cur.fetchall()

            # Try as freelancer
            query_fl = '''
                SELECT o.order_id, o.order_date, o.status, o.revision_count, o.total_price, o.review_given,
                       mo.service_id, mo.client_id, fo.freelancer_id, o.required_hours, o.requirements
                FROM "Order" o
                JOIN make_order mo ON o.order_id = mo.order_id
                JOIN finish_order fo ON o.order_id = fo.order_id
                WHERE fo.freelancer_id = %s
                ORDER BY o.order_date DESC
            '''
            await cur.execute(query_fl, (user_id,))
            freelancer_rows = await cur.fetchall()

            # Merge results
            all_rows = client_rows + freelancer_rows
            orders = []
            for row in all_rows:
                # fetch addon ids for this order
                await cur.execute('SELECT addon_service_id FROM order_addon WHERE order_id = %s', (row[0],))
                addon_rows = await cur.fetchall()
                addon_ids = [ar[0] for ar in addon_rows] if addon_rows else []

                orders.append(
                    OrderPublic(
                        order_id=row[0],
                        order_date=row[1],
                        status=row[2],
                        revision_count=row[3],
                        total_price=float(row[4]) if isinstance(row[4], Decimal) else row[4],
                        review_given=row[5],
                        service_id=row[6],
                        client_id=row[7],
                        freelancer_id=row[8],
                        required_hours=row[9],
                        requirements=_safe_json_load(row[10]),
                        addon_service_ids=addon_ids,
                    )
                )
            return orders


@router.get("/{order_id}", response_model=OrderDetail)
async def get_order_detail(order_id: int):
    """Get full order details"""
    async with get_connection() as conn:
        async with conn.cursor() as cur:
            query = '''
                SELECT o.order_id, o.order_date, o.status, o.revision_count, o.total_price, o.review_given,
                       mo.service_id, mo.client_id, fo.freelancer_id,
                       s.title, s.category,
                       na_fl.name AS freelancer_name,
                       na_cl.name AS client_name,
                       bo.milestone_count, bo.current_phase,
                       o.required_hours, o.requirements
                FROM "Order" o
                JOIN make_order mo ON o.order_id = mo.order_id
                LEFT JOIN finish_order fo ON o.order_id = fo.order_id
                LEFT JOIN "Service" s ON mo.service_id = s.service_id
                LEFT JOIN "NonAdmin" na_fl ON fo.freelancer_id = na_fl.user_id
                LEFT JOIN "NonAdmin" na_cl ON mo.client_id = na_cl.user_id
                LEFT JOIN "BigOrder" bo ON o.order_id = bo.order_id
                WHERE o.order_id = %s
            '''
            await cur.execute(query, (order_id,))
            row = await cur.fetchone()
            if not row:
                raise HTTPException(status_code=404, detail="Order not found")
            # fetch addon ids
            await cur.execute('SELECT addon_service_id FROM order_addon WHERE order_id = %s', (order_id,))
            addon_rows = await cur.fetchall()
            addon_ids = [ar[0] for ar in addon_rows] if addon_rows else []

            return OrderDetail(
                order_id=row[0],
                order_date=row[1],
                status=row[2],
                revision_count=row[3],
                total_price=float(row[4]) if isinstance(row[4], Decimal) else row[4],
                review_given=row[5],
                service_id=row[6],
                client_id=row[7],
                freelancer_id=row[8],
                service_title=row[9],
                service_category=row[10],
                freelancer_name=row[11],
                client_name=row[12],
                is_big_order=row[13] is not None,
                milestone_count=row[13],
                current_phase=row[14],
                required_hours=row[15],
                requirements=_safe_json_load(row[16]),
                addon_service_ids=addon_ids,
            )


@router.patch("/{order_id}/accept")
async def accept_order(order_id: int, freelancer_id: int = Query(...)):
    """Freelancer accepts a pending order"""
    async with get_connection() as conn:
        async with conn.cursor() as cur:
            # Verify order belongs to freelancer
            await cur.execute(
                'SELECT order_id FROM finish_order WHERE order_id = %s AND freelancer_id = %s',
                (order_id, freelancer_id),
            )
            if not await cur.fetchone():
                raise HTTPException(status_code=403, detail="Order does not belong to freelancer")

            await cur.execute(
                'UPDATE "Order" SET status = %s WHERE order_id = %s',
                ("in_progress", order_id),
            )
            await conn.commit()
            return {"message": "Order accepted"}


@router.patch("/{order_id}/deliver")
async def deliver_order(order_id: int, freelancer_id: int = Query(...)):
    """Freelancer marks order as delivered"""
    async with get_connection() as conn:
        async with conn.cursor() as cur:
            await cur.execute(
                'SELECT order_id FROM finish_order WHERE order_id = %s AND freelancer_id = %s',
                (order_id, freelancer_id),
            )
            if not await cur.fetchone():
                raise HTTPException(status_code=403, detail="Order does not belong to freelancer")

            await cur.execute(
                'UPDATE "Order" SET status = %s WHERE order_id = %s',
                ("delivered", order_id),
            )
            await conn.commit()
            return {"message": "Order delivered"}


@router.patch("/{order_id}/cancel")
async def cancel_order(order_id: int, client_id: int = Query(...)):
    """Client cancels an order"""
    async with get_connection() as conn:
        async with conn.cursor() as cur:
            # Get order details
            await cur.execute(
                '''
                SELECT mo.client_id, fo.freelancer_id
                FROM make_order mo
                LEFT JOIN finish_order fo ON mo.order_id = fo.order_id
                WHERE mo.order_id = %s
                ''',
                (order_id,),
            )
            row = await cur.fetchone()
            if not row or row[0] != client_id:
                raise HTTPException(status_code=403, detail="Order does not belong to client")

            # Insert into cancel table
            await cur.execute(
                'INSERT INTO cancel (client_id, freelancer_id, order_id, admin_id) VALUES (%s, %s, %s, NULL)',
                (client_id, row[1], order_id),
            )

            # Update status
            await cur.execute(
                'UPDATE "Order" SET status = %s WHERE order_id = %s',
                ("cancelled", order_id),
            )
            await conn.commit()
            return {"message": "Order cancelled"}


@router.post("/{order_id}/revisions", response_model=RevisionPublic, status_code=201)
async def request_revision(order_id: int, revision: RevisionCreate, client_id: int = Query(...)):
    """Client requests a revision"""
    async with get_connection() as conn:
        async with conn.cursor() as cur:
            # Verify order belongs to client
            await cur.execute(
                'SELECT client_id, revision_count, o.status FROM make_order mo JOIN "Order" o ON mo.order_id = o.order_id WHERE mo.order_id = %s',
                (order_id,),
            )
            row = await cur.fetchone()
            if not row or row[0] != client_id:
                raise HTTPException(status_code=403, detail="Order does not belong to client")

            # Disallow revisions on completed/cancelled orders
            status = row[2]
            if status in ("completed", "cancelled"):
                raise HTTPException(status_code=400, detail="Order is closed; revisions are not allowed")

            revision_no = row[1] + 1

            # Insert revision
            await cur.execute(
                'INSERT INTO "Revision" (revision_text, revision_no) VALUES (%s, %s) RETURNING revision_id',
                (revision.revision_text, revision_no),
            )
            revision_id = (await cur.fetchone())[0]

            # Link to client + order
            await cur.execute(
                'INSERT INTO request_revision (revision_id, client_id, order_id) VALUES (%s, %s, %s)',
                (revision_id, client_id, order_id),
            )

            # Update order status + count
            await cur.execute(
                'UPDATE "Order" SET status = %s, revision_count = revision_count + 1 WHERE order_id = %s',
                ("revision_requested", order_id),
            )
            await conn.commit()

            return RevisionPublic(
                revision_id=revision_id,
                revision_text=revision.revision_text,
                revision_no=revision_no,
                order_id=order_id,
                client_id=client_id,
            )


@router.patch("/{order_id}/complete")
async def complete_order(order_id: int, client_id: int = Query(...)):
    """Client accepts delivery and marks order as completed"""
    async with get_connection() as conn:
        async with conn.cursor() as cur:
            await cur.execute(
                '''
                SELECT mo.client_id, fo.freelancer_id, p.payment_id, p.amount, p.released
                FROM make_order mo
                JOIN finish_order fo ON mo.order_id = fo.order_id
                JOIN "Payment" p ON fo.payment_id = p.payment_id
                WHERE mo.order_id = %s
                ''',
                (order_id,),
            )
            row = await cur.fetchone()
            if not row or row[0] != client_id:
                raise HTTPException(status_code=403, detail="Order does not belong to client")

            _, freelancer_id, payment_id, amount, released = row

            # Mark order completed
            await cur.execute('UPDATE "Order" SET status = %s WHERE order_id = %s', ("completed", order_id))

            # Release payment only once
            if not released:
                await cur.execute('UPDATE "Payment" SET released = TRUE, payment_date = NOW() WHERE payment_id = %s', (payment_id,))
                await cur.execute(
                    'UPDATE "NonAdmin" SET wallet_balance = COALESCE(wallet_balance, 0) + %s WHERE user_id = %s',
                    (amount, freelancer_id),
                )

            await conn.commit()
            return {"message": "Order completed and payment released"}


@router.post("/{order_id}/review", response_model=ReviewPublic, status_code=201)
async def create_review(order_id: int, review: ReviewCreate, client_id: int = Query(...)):
    """Client leaves a review after order completion"""
    async with get_connection() as conn:
        async with conn.cursor() as cur:
            # Verify order belongs to client and is completed
            await cur.execute(
                '''
                SELECT mo.client_id, mo.service_id, o.status, fo.freelancer_id
                FROM make_order mo
                JOIN "Order" o ON mo.order_id = o.order_id
                LEFT JOIN finish_order fo ON o.order_id = fo.order_id
                WHERE mo.order_id = %s
                ''',
                (order_id,),
            )
            row = await cur.fetchone()
            if not row or row[0] != client_id:
                raise HTTPException(status_code=403, detail="Order does not belong to client")
            if row[2] != "completed":
                raise HTTPException(status_code=400, detail="Order must be completed before review")

            service_id = row[1]
            freelancer_id = row[3]

            # Insert review
            await cur.execute(
                'INSERT INTO "Review" (rating, comment, client_id) VALUES (%s, %s, %s) RETURNING review_id',
                (review.rating, review.comment, client_id),
            )
            review_id = (await cur.fetchone())[0]

            # Link review to service via give_review
            await cur.execute(
                'INSERT INTO give_review (user_id, review_id, service_id) VALUES (%s, %s, %s)',
                (client_id, review_id, service_id),
            )

            # Mark order as reviewed
            await cur.execute(
                'UPDATE "Order" SET review_given = TRUE WHERE order_id = %s',
                (order_id,),
            )

            # Update freelancer rating via Update_Rating
            if freelancer_id:
                await cur.execute(
                    'INSERT INTO "Update_Rating" (review_id, freelancer_id) VALUES (%s, %s)',
                    (review_id, freelancer_id),
                )

                # Recompute freelancer stats
                await cur.execute(
                    '''
                    UPDATE "Freelancer" f
                    SET avg_rating = (
                            SELECT AVG(r.rating)
                            FROM "Update_Rating" ur
                            JOIN "Review" r ON ur.review_id = r.review_id
                            WHERE ur.freelancer_id = f.user_id
                        ),
                        total_reviews = (
                            SELECT COUNT(*)
                            FROM "Update_Rating" ur
                            WHERE ur.freelancer_id = f.user_id
                        ),
                        total_orders = (
                            SELECT COUNT(*)
                            FROM finish_order fo
                            WHERE fo.freelancer_id = f.user_id
                        )
                    WHERE f.user_id = %s
                    ''',
                    (freelancer_id,),
                )

            await conn.commit()

            return ReviewPublic(
                review_id=review_id,
                rating=review.rating,
                comment=review.comment,
                client_id=client_id,
                service_id=service_id,
            )
