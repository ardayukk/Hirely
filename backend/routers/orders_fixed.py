from decimal import Decimal
from typing import List, Optional
from fastapi import APIRouter, HTTPException, Query
from datetime import datetime, timedelta
import json

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


@router.get("", response_model=List[OrderPublic])
async def get_orders(user_id: int = Query(...)):
    """Get all orders for a user (client or freelancer)"""
    async with get_connection() as conn:
        async with conn.cursor() as cur:
            # Combined query for both client and freelancer orders
            query = '''
                SELECT DISTINCT o.order_id, o.order_date, o.status, 
                       COALESCE(o.revision_count, 0) AS revision_count,
                       o.included_revision_limit,
                       COALESCE(o.extra_revisions_purchased, 0) AS extra_revisions_purchased,
                       o.total_price, 
                       COALESCE(o.review_given, FALSE) AS review_given,
                       mo.service_id, mo.client_id, 
                       COALESCE(fo.freelancer_id, cs.freelancer_id) AS freelancer_id,
                       o.required_hours,
                       o.requirements
                FROM "Order" o
                JOIN make_order mo ON o.order_id = mo.order_id
                LEFT JOIN finish_order fo ON o.order_id = fo.order_id
                LEFT JOIN create_service cs ON mo.service_id = cs.service_id
                WHERE mo.client_id = %s OR COALESCE(fo.freelancer_id, cs.freelancer_id) = %s
                ORDER BY o.order_date DESC
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
