from decimal import Decimal
from typing import List, Optional
from fastapi import APIRouter, HTTPException, Query, UploadFile, File, Form
from datetime import datetime, timedelta
import json
from pathlib import Path
import shutil
import uuid

from backend.db import get_connection


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
                    INSERT INTO "Order" (client_id, freelancer_id, service_id, status, revision_count, included_revision_limit, total_price, requirements)
                    VALUES (%s, %s, %s, 'pending', 0, %s, %s, %s)
                    RETURNING order_id
                    ''',
                    (client_id, freelancer_id, service_id, included_revision_limit, order.total_price, requirements_json),
                )
                order_id = (await cur.fetchone())[0]

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
                    'INSERT INTO "Payment" (amount) VALUES (%s) RETURNING payment_id',
                    (order.total_price,),
                )
                payment_id = (await cur.fetchone())[0]

                # Update Order with payment_id
                await cur.execute(
                    'UPDATE "Order" SET payment_id = %s WHERE order_id = %s',
                    (payment_id, order_id),
                )

                # 5. Optional add-ons selected by client
                if getattr(order, 'addon_service_ids', None):
                    for aid in order.addon_service_ids:
                        # ensure addon is a valid add-on for this service
                        await cur.execute(
                            'SELECT 1 FROM "ServiceAddon" WHERE addon_id = %s AND service_id = %s',
                            (aid, service_id),
                        )
                        if await cur.fetchone():
                            await cur.execute(
                                'INSERT INTO "OrderAddon" (order_id, addon_id) VALUES (%s, %s)',
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
            # Query orders where user is either client or freelancer
            query = '''
                SELECT o.order_id, o.created_at, o.status, 
                       COALESCE(o.revision_count, 0) AS revision_count,
                       o.included_revision_limit,
                       0 AS extra_revisions_purchased,
                       o.total_price, 
                       FALSE AS review_given,
                       o.service_id, o.client_id, o.freelancer_id,
                       NULL::INTEGER AS required_hours,
                       o.requirements
                FROM "Order" o
                WHERE o.client_id = %s OR o.freelancer_id = %s
                ORDER BY o.created_at DESC
            '''
            await cur.execute(query, (user_id, user_id))
            all_rows = await cur.fetchall()

            orders = []
            for row in all_rows:
                # fetch addon ids for this order
                addon_ids = []
                try:
                    await cur.execute('SELECT addon_service_id FROM order_addon WHERE order_id = %s', (row[0],))
                    addon_rows = await cur.fetchall()
                    addon_ids = [ar[0] for ar in addon_rows] if addon_rows else []
                except Exception:
                    addon_ids = []

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
                    )
                )
            return orders


@router.get("/{order_id}", response_model=OrderDetail)
async def get_order_detail(order_id: int):
    """Get full order details"""
    async with get_connection() as conn:
        async with conn.cursor() as cur:
            query = '''
                SELECT o.order_id, o.created_at, o.status, o.revision_count,
                       o.included_revision_limit,
                       0 AS extra_revisions_purchased,
                       o.total_price, 
                       FALSE AS review_given,
                       o.service_id, o.client_id, o.freelancer_id,
                       s.title, s.category,
                       na_fl.name AS freelancer_name,
                       na_cl.name AS client_name,
                       bo.milestone_count, bo.current_phase,
                       NULL::INTEGER AS required_hours,
                       o.requirements
                FROM "Order" o
                LEFT JOIN "Service" s ON o.service_id = s.service_id
                LEFT JOIN "NonAdmin" na_fl ON o.freelancer_id = na_fl.user_id
                LEFT JOIN "NonAdmin" na_cl ON o.client_id = na_cl.user_id
                LEFT JOIN "BigOrder" bo ON o.order_id = bo.order_id
                WHERE o.order_id = %s
            '''
            await cur.execute(query, (order_id,))
            row = await cur.fetchone()
            
            if not row:
                raise HTTPException(status_code=404, detail="Order not found")
            
            # fetch addon ids
            addon_ids = []
            try:
                await cur.execute('SELECT addon_service_id FROM order_addon WHERE order_id = %s', (order_id,))
                addon_rows = await cur.fetchall()
                addon_ids = [ar[0] for ar in addon_rows] if addon_rows else []
            except Exception:
                addon_ids = []

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
                'SELECT order_id FROM "Order" WHERE order_id = %s AND freelancer_id = %s',
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
    """Freelancer uploads work. For big orders, phase does NOT auto-advance - client must accept"""
    async with get_connection() as conn:
        async with conn.cursor() as cur:
            # Verify order belongs to freelancer and check current status
            await cur.execute(
                '''
                SELECT order_id, status, revision_count, included_revision_limit
                FROM "Order" 
                WHERE order_id = %s AND freelancer_id = %s
                ''',
                (order_id, freelancer_id),
            )
            row = await cur.fetchone()
            if not row:
                raise HTTPException(status_code=403, detail="Order does not belong to freelancer")

            # Check if this is a big order
            await cur.execute(
                'SELECT milestone_count, current_phase FROM "BigOrder" WHERE order_id = %s',
                (order_id,),
            )
            big_order = await cur.fetchone()

            if big_order:
                # Big order: just report that work was submitted, client must accept to advance
                milestone_count, current_phase = big_order
                message = f"Milestone {current_phase} submitted. Waiting for client acceptance to advance to phase {current_phase + 1}."
            else:
                # Small order: mark as delivered immediately
                await cur.execute(
                    'UPDATE "Order" SET status = %s WHERE order_id = %s',
                    ("delivered", order_id),
                )
                message = "Order delivered"
            await conn.commit()
            return {"message": message}


@router.post("/{order_id}/work/upload", status_code=201)
async def upload_work(
    order_id: int,
    file: UploadFile = File(...),
    freelancer_id: int = Query(...),
    description: Optional[str] = Form(None),
):
    """Upload work/deliverable for an order. If status is revision_requested, this replaces the previous work."""
    
    # First, verify order and get status
    async with get_connection() as conn:
        async with conn.cursor() as cur:
            # Verify order belongs to freelancer and get status
            await cur.execute(
                'SELECT order_id, status, revision_count, included_revision_limit FROM "Order" WHERE order_id = %s AND freelancer_id = %s',
                (order_id, freelancer_id),
            )
            order_row = await cur.fetchone()
            if not order_row:
                raise HTTPException(status_code=403, detail="Order does not belong to freelancer")
            
            order_id_db, status, revision_count, included_limit = order_row
            
            # Only allow work upload for orders that are in_progress or revision_requested
            if status not in ("in_progress", "revision_requested"):
                raise HTTPException(status_code=400, detail="Order status does not allow work upload")

    # Validate file
    if not file.filename:
        raise HTTPException(status_code=400, detail="No filename provided")
    
    # Size limit: 50MB
    MAX_FILE_SIZE = 50 * 1024 * 1024
    file.file.seek(0, 2)  # Seek to end
    file_size = file.file.tell()
    file.file.seek(0)  # Reset to beginning
    
    if file_size > MAX_FILE_SIZE:
        raise HTTPException(status_code=400, detail="File too large (max 50MB)")
    
    # Create order-specific directory
    UPLOAD_DIR = Path("backend/uploads/work")
    UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
    order_dir = UPLOAD_DIR / f"order_{order_id}"
    order_dir.mkdir(parents=True, exist_ok=True)
    
    # For revisions, delete old work files and keep only the latest
    if status == "revision_requested":
        for old_file in order_dir.glob("*"):
            if old_file.is_file():
                old_file.unlink()
    
    # Generate unique filename
    file_ext = Path(file.filename).suffix
    unique_filename = f"{uuid.uuid4()}{file_ext}"
    file_path = order_dir / unique_filename
    
    # Save file
    try:
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to save file: {str(e)}")
    
    # Store deliverable record with file path and phase info
    relative_path = f"uploads/work/order_{order_id}/{unique_filename}"
    
    return {
        "order_id": order_id,
        "phase_number": phase_number,
        "file_name": file.filename,
        "file_path": relative_path,
        "file_size": file_size,
        "description": description or "",
        "uploaded_at": datetime.now().isoformat(),
        "status_updated": status == "revision_requested"
    }


@router.get("/{order_id}/work")
async def get_work_files(order_id: int, user_id: int = Query(...)):
    """Get work files for an order (accessible to both client and freelancer)"""
    async with get_connection() as conn:
        async with conn.cursor() as cur:
            # Verify user is part of the order
            await cur.execute(
                'SELECT client_id, freelancer_id FROM "Order" WHERE order_id = %s',
                (order_id,),
            )
            order_row = await cur.fetchone()
            if not order_row:
                raise HTTPException(status_code=404, detail="Order not found")
            
            client_id, freelancer_id = order_row
            if user_id not in (client_id, freelancer_id):
                raise HTTPException(status_code=403, detail="Access denied")
    
    # Get work files from the directory
    UPLOAD_DIR = Path("backend/uploads/work")
    order_dir = UPLOAD_DIR / f"order_{order_id}"
    
    work_files = []
    if order_dir.exists():
        for file_path in sorted(order_dir.glob("*"), key=lambda p: p.stat().st_mtime, reverse=True):
            if file_path.is_file():
                work_files.append({
                    "file_name": file_path.name,
                    "file_path": f"uploads/work/order_{order_id}/{file_path.name}",
                    "file_size": file_path.stat().st_size,
                    "uploaded_at": datetime.fromtimestamp(file_path.stat().st_mtime).isoformat()
                })
    
    return {"order_id": order_id, "work_files": work_files}


@router.patch("/{order_id}/cancel")
async def cancel_order(order_id: int, client_id: int = Query(...)):
    """Client cancels an order"""
    async with get_connection() as conn:
        async with conn.cursor() as cur:
            # Get order details
            await cur.execute(
                '''
                SELECT o.client_id, o.freelancer_id
                FROM "Order" o
                WHERE o.order_id = %s
                ''',
                (order_id,),
            )
            row = await cur.fetchone()
            if not row or row[0] != client_id:
                raise HTTPException(status_code=403, detail="Order does not belong to client")

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
            # Verify order belongs to client + fetch revision policy and freelancer_id
            await cur.execute(
                '''
                SELECT o.client_id, o.revision_count, o.status, o.included_revision_limit, o.freelancer_id
                FROM "Order" o
                WHERE o.order_id = %s
                ''',
                (order_id,),
            )
            row = await cur.fetchone()
            if not row:
                raise HTTPException(status_code=404, detail="Order not found")
            if row[0] != client_id:
                raise HTTPException(status_code=403, detail="Order does not belong to client")

            revision_count, status, included_limit, freelancer_id = row[1], row[2], row[3], row[4]

            # Disallow revisions on completed/cancelled orders
            if status in ("completed", "cancelled"):
                raise HTTPException(status_code=400, detail="Order is closed; revisions are not allowed")

            # Check revision limits
            if included_limit is not None:
                if revision_count >= included_limit:
                    raise HTTPException(
                        status_code=409,
                        detail=(
                            "Revision limit reached for this order. "
                            f"Allowed: {included_limit}, used: {revision_count}. "
                            "Purchase additional revisions to continue."
                        ),
                    )

            # Store revision request in order requirements and update status
            await cur.execute(
                '''
                UPDATE "Order" 
                SET status = 'revision_requested',
                    revision_count = revision_count + 1,
                    requirements = CASE WHEN requirements IS NULL THEN 'REVISION REQUEST #' || (revision_count + 1)::TEXT || ': ' || %s::TEXT 
                                       ELSE requirements || E'\n\nREVISION REQUEST #' || (revision_count + 1)::TEXT || ': ' || %s 
                                  END
                WHERE order_id = %s
                  AND status NOT IN ('completed', 'cancelled')
                  AND (included_revision_limit IS NULL OR revision_count < included_revision_limit)
                RETURNING revision_count
                ''',
                (revision.revision_text, revision.revision_text, order_id),
            )
            updated = await cur.fetchone()
            if not updated:
                raise HTTPException(status_code=409, detail="Failed to request revision")
            revision_no = updated[0]

            await conn.commit()

            return RevisionPublic(
                revision_id=order_id,  # Use order_id as revision identifier
                revision_text=revision.revision_text,
                revision_no=revision_no,
                order_id=order_id,
                client_id=client_id,
            )


@router.get("/{order_id}/revisions")
async def get_order_revisions(order_id: int, user_id: int = Query(...)):
    """Get all revision requests for an order (for freelancer to see revision context)"""
    async with get_connection() as conn:
        async with conn.cursor() as cur:
            # Verify user is part of this order (either client or freelancer)
            await cur.execute(
                '''
                SELECT o.client_id, o.freelancer_id, o.requirements, o.revision_count
                FROM "Order" o
                WHERE o.order_id = %s
                ''',
                (order_id,),
            )
            row = await cur.fetchone()
            if not row:
                raise HTTPException(status_code=404, detail="Order not found")
            
            client_id, freelancer_id, requirements, revision_count = row
            if user_id not in (client_id, freelancer_id):
                raise HTTPException(status_code=403, detail="Access denied")
            
            # Extract revision requests from requirements field
            revisions = []
            if requirements:
                # Split by revision markers and parse
                parts = requirements.split('REVISION REQUEST #')
                for i, part in enumerate(parts[1:], 1):  # Skip first part (original requirements)
                    if ':' in part:
                        revision_text = part.split(':', 1)[1].strip()
                        revisions.append({
                            "revision_no": i,
                            "revision_text": revision_text,
                            "order_id": order_id
                        })
            
            return {
                "order_id": order_id,
                "revision_count": revision_count,
                "revisions": revisions,
                "original_requirements": requirements.split('REVISION REQUEST #')[0].strip() if requirements else ""
            }


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


@router.patch("/{order_id}/complete")
async def complete_order(order_id: int, client_id: int = Query(...)):
    """Client accepts delivery and marks order as completed"""
    async with get_connection() as conn:
        async with conn.cursor() as cur:
            # Get order details
            await cur.execute(
                '''
                SELECT client_id, freelancer_id, payment_id
                FROM "Order"
                WHERE order_id = %s
                ''',
                (order_id,),
            )
            row = await cur.fetchone()
            if not row or row[0] != client_id:
                raise HTTPException(status_code=403, detail="Order does not belong to client")

            _, freelancer_id, payment_id = row

            # Mark order completed
            await cur.execute('UPDATE "Order" SET status = %s WHERE order_id = %s', ("completed", order_id))

            # Release payment only once if it exists
            if payment_id:
                await cur.execute('SELECT released_amount, amount FROM "Payment" WHERE payment_id = %s', (payment_id,))
                payment_row = await cur.fetchone()
                if payment_row:
                    released_amount, amount = payment_row
                    # Only release if not already released
                    if released_amount == 0:
                        await cur.execute('UPDATE "Payment" SET released_amount = %s, status = %s WHERE payment_id = %s', (amount, "RELEASED", payment_id,))
                        await cur.execute(
                            'UPDATE "NonAdmin" SET wallet_balance = COALESCE(wallet_balance, 0) + %s WHERE user_id = %s',
                            (amount, freelancer_id),
                        )

            await conn.commit()
            return {"message": "Order completed and payment released"}


@router.patch("/{order_id}/phase-review/accept")
async def accept_phase_submission(order_id: int, client_id: int = Query(...)):
    """Client accepts a phase submission and advances to next phase"""
    async with get_connection() as conn:
        async with conn.cursor() as cur:
            # Verify order belongs to client
            await cur.execute(
                'SELECT client_id, status FROM "Order" WHERE order_id = %s',
                (order_id,),
            )
            order_row = await cur.fetchone()
            if not order_row or order_row[0] != client_id:
                raise HTTPException(status_code=403, detail="Order does not belong to client")
            
            # Check if this is a big order
            await cur.execute(
                'SELECT milestone_count, current_phase FROM "BigOrder" WHERE order_id = %s',
                (order_id,),
            )
            big_order = await cur.fetchone()
            if not big_order:
                raise HTTPException(status_code=400, detail="Not a big order")
            
            milestone_count, current_phase = big_order
            
            # Get the most recent submitted deliverable for current phase
            await cur.execute(
                '''
                SELECT deliverable_id FROM "Deliverable"
                WHERE order_id = %s AND phase_number = %s AND status = 'submitted'
                ORDER BY submitted_at DESC LIMIT 1
                ''',
                (order_id, current_phase),
            )
            deliverable = await cur.fetchone()
            if not deliverable:
                raise HTTPException(status_code=400, detail="No submitted work found for this phase")
            
            # Mark deliverable as approved
            await cur.execute(
                'UPDATE "Deliverable" SET status = %s WHERE deliverable_id = %s',
                ('approved', deliverable[0]),
            )
            
            # Advance to next phase
            if current_phase < milestone_count:
                await cur.execute(
                    'UPDATE "BigOrder" SET current_phase = %s WHERE order_id = %s',
                    (current_phase + 1, order_id),
                )
                message = f"Phase {current_phase} approved. Freelancer can now submit phase {current_phase + 1}."
            else:
                # All milestones complete, mark order as delivered
                await cur.execute(
                    'UPDATE "Order" SET status = %s WHERE order_id = %s',
                    ('delivered', order_id),
                )
                message = "All phases approved. Order marked as delivered."
            
            await conn.commit()
            return {"message": message}


@router.patch("/{order_id}/phase-review/decline")
async def decline_phase_submission(order_id: int, client_id: int = Query(...)):
    """Client declines a phase submission, freelancer must re-upload"""
    async with get_connection() as conn:
        async with conn.cursor() as cur:
            # Verify order belongs to client
            await cur.execute(
                'SELECT client_id FROM "Order" WHERE order_id = %s',
                (order_id,),
            )
            order_row = await cur.fetchone()
            if not order_row or order_row[0] != client_id:
                raise HTTPException(status_code=403, detail="Order does not belong to client")
            
            # Check if this is a big order
            await cur.execute(
                'SELECT milestone_count, current_phase FROM "BigOrder" WHERE order_id = %s',
                (order_id,),
            )
            big_order = await cur.fetchone()
            if not big_order:
                raise HTTPException(status_code=400, detail="Not a big order")
            
            milestone_count, current_phase = big_order
            
            # Get the most recent submitted deliverable for current phase
            await cur.execute(
                '''
                SELECT deliverable_id FROM "Deliverable"
                WHERE order_id = %s AND phase_number = %s AND status = 'submitted'
                ORDER BY submitted_at DESC LIMIT 1
                ''',
                (order_id, current_phase),
            )
            deliverable = await cur.fetchone()
            if not deliverable:
                raise HTTPException(status_code=400, detail="No submitted work found for this phase")
            
            # Mark deliverable as rejected
            await cur.execute(
                'UPDATE "Deliverable" SET status = %s WHERE deliverable_id = %s',
                ('rejected', deliverable[0]),
            )
            
            # Phase stays the same, freelancer must re-upload
            message = f"Phase {current_phase} declined. Freelancer needs to re-upload work for this phase."
            
            await conn.commit()
            return {"message": message}


@router.post("/{order_id}/review", response_model=ReviewPublic, status_code=201)
async def create_review(order_id: int, review: ReviewCreate, client_id: int = Query(...)):
    """Client leaves a review after order completion"""
    async with get_connection() as conn:
        async with conn.cursor() as cur:
            # Verify order belongs to client and is completed
            await cur.execute(
                '''
                SELECT client_id, service_id, status, freelancer_id
                FROM "Order"
                WHERE order_id = %s
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
                'INSERT INTO "Review" (order_id, client_id, freelancer_id, rating, comment, highlights) VALUES (%s, %s, %s, %s, %s, %s) RETURNING review_id',
                (order_id, client_id, freelancer_id, review.rating, review.comment, review.highlights),
            )
            review_id = (await cur.fetchone())[0]

            await conn.commit()

            return ReviewPublic(
                review_id=review_id,
                rating=review.rating,
                comment=review.comment,
                highlights=review.highlights,
                client_id=client_id,
                service_id=service_id,
            )
