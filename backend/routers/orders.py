from decimal import Decimal
from typing import List, Optional
from fastapi import APIRouter, HTTPException, Query, UploadFile, File, Form
from datetime import datetime, timedelta
import json
import shutil
import os

from backend.db import get_connection

UPLOAD_DIR = "backend/uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)


def _safe_json_load(raw):
    try:
        return json.loads(raw) if raw else None
    except Exception:
        return None
from backend.schemas.order import (
    OrderCreate,
    OrderPublic,
    OrderDetail,
    RevisionCreate,
    RevisionPublic,
    ReviewCreate,
    ReviewPublic,
    PurchaseRevisionsRequest,
)

router = APIRouter(prefix="/orders", tags=["orders"])


def _revision_policy_fields(*, revision_count: int, included_revision_limit: Optional[int], extra_revisions_purchased: int):
    if included_revision_limit is None:
        return {
            "revisions_unlimited": True,
            "revisions_allowed": None,
            "revisions_remaining": None,
        }
    allowed = max(0, included_revision_limit + (extra_revisions_purchased or 0))
    remaining = max(0, allowed - (revision_count or 0))
    return {
        "revisions_unlimited": False,
        "revisions_allowed": allowed,
        "revisions_remaining": remaining,
    }


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
                    SELECT s.service_id, cs.freelancer_id, s.package_tier
                    FROM "Service" s
                    JOIN create_service cs ON s.service_id = cs.service_id
                    WHERE s.service_id = %s
                    ''',
                    (order.service_id,),
                )
                service_row = await cur.fetchone()
                if not service_row:
                    raise HTTPException(status_code=404, detail="Service not found")
                service_id, freelancer_id, package_tier = service_row
                
                # Determine included_revision_limit based on package_tier
                if package_tier and package_tier.lower() == 'basic':
                    included_revision_limit = 1
                elif package_tier and package_tier.lower() == 'standard':
                    included_revision_limit = 3
                elif package_tier and package_tier.lower() == 'premium':
                    included_revision_limit = None
                else:
                    included_revision_limit = 1  # Default

                # 1. Create base order
                requirements_json = json.dumps(order.requirements) if getattr(order, 'requirements', None) is not None else None
                await cur.execute(
                    '''
                    INSERT INTO "Order" (order_date, status, revision_count, included_revision_limit, extra_revisions_purchased, total_price, review_given, required_hours, requirements)
                    VALUES (NOW(), 'pending', 0, %s, 0, %s, FALSE, %s, %s)
                    RETURNING order_id
                    ''',
                    (included_revision_limit, order.total_price, getattr(order, 'required_hours', None), requirements_json),
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
                    included_revision_limit=included_revision_limit,
                    extra_revisions_purchased=0,
                    **_revision_policy_fields(
                        revision_count=0,
                        included_revision_limit=included_revision_limit,
                        extra_revisions_purchased=0,
                    ),
                    total_price=order.total_price,
                    review_given=False,
                    service_id=service_id,
                    client_id=client_id,
                    freelancer_id=freelancer_id,
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
                SELECT o.order_id, o.order_date, o.status, o.revision_count, o.included_revision_limit, o.extra_revisions_purchased, o.total_price, o.review_given,
                       mo.service_id, mo.client_id, fo.freelancer_id, o.required_hours, o.requirements,
                       s.title, c.display_name, na.name,
                       so.delivery_date, bo.milestone_delivery_date
                FROM "Order" o
                JOIN make_order mo ON o.order_id = mo.order_id
                JOIN "Service" s ON mo.service_id = s.service_id
                JOIN "Client" c ON mo.client_id = c.user_id
                LEFT JOIN finish_order fo ON o.order_id = fo.order_id
                LEFT JOIN "NonAdmin" na ON fo.freelancer_id = na.user_id
                LEFT JOIN "SmallOrder" so ON o.order_id = so.order_id
                LEFT JOIN "BigOrder" bo ON o.order_id = bo.order_id
                WHERE mo.client_id = %s
                ORDER BY o.order_date DESC
            '''
            await cur.execute(query, (user_id,))
            client_rows = await cur.fetchall()

            # Try as freelancer
            query_fl = '''
                SELECT o.order_id, o.order_date, o.status, o.revision_count, o.included_revision_limit, o.extra_revisions_purchased, o.total_price, o.review_given,
                       mo.service_id, mo.client_id, fo.freelancer_id, o.required_hours, o.requirements,
                       s.title, c.display_name, na.name,
                       so.delivery_date, bo.milestone_delivery_date
                FROM "Order" o
                JOIN make_order mo ON o.order_id = mo.order_id
                JOIN "Service" s ON mo.service_id = s.service_id
                JOIN "Client" c ON mo.client_id = c.user_id
                JOIN finish_order fo ON o.order_id = fo.order_id
                JOIN "NonAdmin" na ON fo.freelancer_id = na.user_id
                LEFT JOIN "SmallOrder" so ON o.order_id = so.order_id
                LEFT JOIN "BigOrder" bo ON o.order_id = bo.order_id
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
                        included_revision_limit=row[4],
                        extra_revisions_purchased=row[5] or 0,
                        **_revision_policy_fields(
                            revision_count=row[3],
                            included_revision_limit=row[4],
                            extra_revisions_purchased=row[5] or 0,
                        ),
                        total_price=float(row[6]) if isinstance(row[6], Decimal) else row[6],
                        review_given=row[7],
                        service_id=row[8],
                        client_id=row[9],
                        freelancer_id=row[10],
                        required_hours=row[11],
                        requirements=_safe_json_load(row[12]),
                        addon_service_ids=addon_ids,
                        service_title=row[13],
                        client_name=row[14],
                        freelancer_name=row[15],
                        delivery_date=row[16] or row[17],
                    )
                )
            return orders


@router.get("/{order_id}", response_model=OrderDetail)
async def get_order_detail(order_id: int):
    """Get full order details"""
    async with get_connection() as conn:
        async with conn.cursor() as cur:
            query = '''
                SELECT o.order_id, o.order_date, o.status, o.revision_count, o.included_revision_limit, o.extra_revisions_purchased, o.total_price, o.review_given,
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
                included_revision_limit=row[4],
                extra_revisions_purchased=row[5] or 0,
                **_revision_policy_fields(
                    revision_count=row[3],
                    included_revision_limit=row[4],
                    extra_revisions_purchased=row[5] or 0,
                ),
                total_price=float(row[6]) if isinstance(row[6], Decimal) else row[6],
                review_given=row[7],
                service_id=row[8],
                client_id=row[9],
                freelancer_id=row[10],
                service_title=row[11],
                service_category=row[12],
                freelancer_name=row[13],
                client_name=row[14],
                is_big_order=row[15] is not None,
                milestone_count=row[15],
                current_phase=row[16],
                required_hours=row[17],
                requirements=_safe_json_load(row[18]),
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
            # Verify order belongs to client + fetch revision policy
            await cur.execute(
                '''
                SELECT mo.client_id, o.revision_count, o.status, o.included_revision_limit, o.extra_revisions_purchased
                FROM make_order mo
                JOIN "Order" o ON mo.order_id = o.order_id
                WHERE mo.order_id = %s
                ''',
                (order_id,),
            )
            row = await cur.fetchone()
            if not row:
                raise HTTPException(status_code=404, detail="Order not found")
            if row[0] != client_id:
                raise HTTPException(status_code=403, detail="Order does not belong to client")

            revision_count, status, included_limit, extra_purchased = row[1], row[2], row[3], row[4] or 0

            # Disallow revisions on completed/cancelled orders
            if status in ("completed", "cancelled"):
                raise HTTPException(status_code=400, detail="Order is closed; revisions are not allowed")

            if included_limit is not None:
                allowed_total = max(0, included_limit + extra_purchased)
                if revision_count >= allowed_total:
                    raise HTTPException(
                        status_code=409,
                        detail=(
                            "Revision limit reached for this order. "
                            f"Included: {included_limit}, extra purchased: {extra_purchased}, used: {revision_count}. "
                            "Purchase additional revisions to continue."
                        ),
                    )

            # Concurrency-safe reservation of a revision number
            await cur.execute(
                '''
                UPDATE "Order" o
                SET status = %s,
                    revision_count = revision_count + 1
                WHERE o.order_id = %s
                                    AND o.status NOT IN ('completed', 'cancelled')
                  AND (o.included_revision_limit IS NULL OR o.revision_count < o.included_revision_limit + o.extra_revisions_purchased)
                RETURNING o.revision_count
                ''',
                ("revision_requested", order_id),
            )
            updated = await cur.fetchone()
            if not updated:
                # Another request might have consumed the last allowed revision.
                raise HTTPException(
                    status_code=409,
                    detail="Revision limit reached for this order. Purchase additional revisions to continue.",
                )
            revision_no = updated[0]

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

            await conn.commit()

            return RevisionPublic(
                revision_id=revision_id,
                revision_text=revision.revision_text,
                revision_no=revision_no,
                order_id=order_id,
                client_id=client_id,
            )


@router.post("/{order_id}/purchase-revisions", response_model=OrderDetail)
async def purchase_additional_revisions(
    order_id: int,
    payload: PurchaseRevisionsRequest,
    client_id: int = Query(...),
):
    """Client purchases additional revisions for an existing order."""
    if payload.quantity <= 0:
        raise HTTPException(status_code=400, detail="Quantity must be greater than 0")
    if payload.quantity > 100:
        raise HTTPException(status_code=400, detail="Quantity too large")

    async with get_connection() as conn:
        async with conn.cursor() as cur:
            await cur.execute(
                'SELECT client_id FROM make_order WHERE order_id = %s',
                (order_id,),
            )
            row = await cur.fetchone()
            if not row:
                raise HTTPException(status_code=404, detail="Order not found")
            if row[0] != client_id:
                raise HTTPException(status_code=403, detail="Order does not belong to client")

            await cur.execute(
                'UPDATE "Order" SET extra_revisions_purchased = extra_revisions_purchased + %s WHERE order_id = %s',
                (payload.quantity, order_id),
            )

            # Record purchase
            await cur.execute(
                '''
                INSERT INTO "RevisionPurchase" (order_id, purchased_revisions, amount, payment_ref)
                VALUES (%s, %s, %s, %s)
                ''',
                (order_id, payload.quantity, payload.amount or 0.0, payload.payment_ref),
            )

            await conn.commit()

    # Return fresh order detail
    return await get_order_detail(order_id)


@router.patch("/{order_id}/accept")
async def accept_order(order_id: int, freelancer_id: int = Query(...)):
    """Freelancer accepts the order and starts working"""
    async with get_connection() as conn:
        async with conn.cursor() as cur:
            # Verify freelancer owns the order
            await cur.execute(
                '''
                SELECT fo.freelancer_id, o.status
                FROM finish_order fo
                JOIN "Order" o ON fo.order_id = o.order_id
                WHERE fo.order_id = %s
                ''',
                (order_id,),
            )
            row = await cur.fetchone()
            if not row or row[0] != freelancer_id:
                raise HTTPException(status_code=403, detail="Order does not belong to freelancer")
            
            if row[1] != 'pending':
                 raise HTTPException(status_code=400, detail="Order is not pending")

            await cur.execute('UPDATE "Order" SET status = %s WHERE order_id = %s', ("in_progress", order_id))
            await conn.commit()
            return {"message": "Order accepted"}


@router.patch("/{order_id}/deliver")
async def deliver_order(order_id: int, freelancer_id: int = Query(...)):
    """Freelancer marks order as delivered"""
    async with get_connection() as conn:
        async with conn.cursor() as cur:
            # Verify freelancer owns the order
            await cur.execute(
                '''
                SELECT fo.freelancer_id, o.status
                FROM finish_order fo
                JOIN "Order" o ON fo.order_id = o.order_id
                WHERE fo.order_id = %s
                ''',
                (order_id,),
            )
            row = await cur.fetchone()
            if not row or row[0] != freelancer_id:
                raise HTTPException(status_code=403, detail="Order does not belong to freelancer")
            
            if row[1] not in ('in_progress', 'revision_requested'):
                 raise HTTPException(status_code=400, detail="Order is not in progress")

            await cur.execute('UPDATE "Order" SET status = %s WHERE order_id = %s', ("delivered", order_id))
            await conn.commit()
            return {"message": "Order delivered"}


@router.post("/{order_id}/deliveries")
async def submit_delivery(
    order_id: int,
    freelancer_id: int = Form(...),
    message: str = Form(None),
    files: List[UploadFile] = File(None),
):
    """Freelancer submits a delivery with optional files"""
    async with get_connection() as conn:
        async with conn.cursor() as cur:
            # Verify freelancer owns the order
            await cur.execute(
                '''
                SELECT fo.freelancer_id, o.status
                FROM finish_order fo
                JOIN "Order" o ON fo.order_id = o.order_id
                WHERE fo.order_id = %s
                ''',
                (order_id,),
            )
            row = await cur.fetchone()
            if not row or row[0] != freelancer_id:
                raise HTTPException(status_code=403, detail="Order does not belong to freelancer")
            
            if row[1] not in ('in_progress', 'revision_requested'):
                 raise HTTPException(status_code=400, detail="Order is not in progress")

            # Insert delivery
            await cur.execute(
                'INSERT INTO "Delivery" (order_id, freelancer_id, message) VALUES (%s, %s, %s) RETURNING delivery_id',
                (order_id, freelancer_id, message),
            )
            delivery_id = (await cur.fetchone())[0]

            # Save files
            if files:
                for file in files:
                    file_path = os.path.join(UPLOAD_DIR, f"{delivery_id}_{file.filename}")
                    with open(file_path, "wb") as buffer:
                        shutil.copyfileobj(file.file, buffer)
                    
                    await cur.execute(
                        'INSERT INTO "DeliveryFile" (delivery_id, file_path, file_name) VALUES (%s, %s, %s)',
                        (delivery_id, file_path, file.filename),
                    )

            # Update order status to delivered
            await cur.execute('UPDATE "Order" SET status = %s WHERE order_id = %s', ("delivered", order_id))
            await conn.commit()
            
            return {"message": "Delivery submitted successfully", "delivery_id": delivery_id}


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
                'INSERT INTO "Review" (rating, comment, highlights, client_id) VALUES (%s, %s, %s, %s) RETURNING review_id',
                (review.rating, review.comment, review.highlights, client_id),
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

            # Update service average rating
            await cur.execute(
                '''
                UPDATE "Service" s
                SET average_rating = (
                    SELECT AVG(r.rating)
                    FROM give_review gr
                    JOIN "Review" r ON gr.review_id = r.review_id
                    WHERE gr.service_id = s.service_id
                )
                WHERE s.service_id = %s
                ''',
                (service_id,),
            )

            await conn.commit()

            return ReviewPublic(
                review_id=review_id,
                rating=review.rating,
                comment=review.comment,
                highlights=review.highlights,
                client_id=client_id,
                service_id=service_id,
            )
