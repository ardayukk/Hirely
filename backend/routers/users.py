from decimal import Decimal
from typing import Optional

from fastapi import APIRouter, HTTPException

from backend.db import get_connection
from backend.schemas.user import UserProfile, UserUpdate

router = APIRouter(prefix="/users", tags=["users"])


async def _fetch_profile(cur, user_id: int) -> Optional[UserProfile]:
    query = (
        'SELECT U.user_id, U.email, U.date_joined, '
        'NA.name, NA.biography, NA.phone, NA.address, NA.age, NA.wallet_balance, '
        'C.display_name, '
        'F.tagline, F.avg_rating, F.total_orders, F.total_reviews, '
        'A.username '
        'FROM "User" U '
        'LEFT JOIN "NonAdmin" NA ON U.user_id = NA.user_id '
        'LEFT JOIN "Client" C ON U.user_id = C.user_id '
        'LEFT JOIN "Freelancer" F ON U.user_id = F.user_id '
        'LEFT JOIN "Admin" A ON U.user_id = A.user_id '
        'WHERE U.user_id = %s'
    )
    await cur.execute(query, (user_id,))
    row = await cur.fetchone()
    if not row:
        return None

    (
        uid,
        email,
        date_joined,
        name,
        biography,
        phone,
        address,
        age,
        wallet_balance,
        display_name,
        tagline,
        avg_rating,
        total_orders,
        total_reviews,
        admin_username,
    ) = row

    if admin_username is not None:
        role = "admin"
        resolved_name = admin_username
    elif display_name is not None:
        role = "client"
        resolved_name = name
    elif tagline is not None or avg_rating is not None:
        role = "freelancer"
        resolved_name = name
    else:
        role = "unknown"
        resolved_name = name

    return UserProfile(
        id=uid,
        email=email,
        date_joined=str(date_joined),
        name=resolved_name,
        biography=biography,
        phone=phone,
        address=address,
        age=age,
        wallet_balance=float(wallet_balance) if isinstance(wallet_balance, Decimal) else wallet_balance,
        display_name=display_name,
        tagline=tagline,
        avg_rating=float(avg_rating) if isinstance(avg_rating, Decimal) else avg_rating,
        total_orders=total_orders,
        total_reviews=total_reviews,
        role=role,
    )


@router.get("/{user_id}", response_model=UserProfile)
async def get_profile(user_id: int):
    async with get_connection() as conn:
        async with conn.cursor() as cur:
            profile = await _fetch_profile(cur, user_id)
            if not profile:
                raise HTTPException(status_code=404, detail="User not found")
            return profile


@router.put("/{user_id}", response_model=UserProfile)
async def update_profile(user_id: int, payload: UserUpdate):
    async with get_connection() as conn:
        async with conn.cursor() as cur:
            profile = await _fetch_profile(cur, user_id)
            if not profile:
                raise HTTPException(status_code=404, detail="User not found")

            try:
                # Update email if provided
                if payload.email:
                    await cur.execute(
                        'UPDATE "User" SET email = %s WHERE user_id = %s',
                        (payload.email, user_id),
                    )

                # Admin users store their display name in the Admin table
                if profile.role == "admin" and payload.name:
                    await cur.execute(
                        'UPDATE "Admin" SET username = %s WHERE user_id = %s',
                        (payload.name, user_id),
                    )

                # NonAdmin fields
                nonadmin_fields = {
                    "name": payload.name,
                    "biography": payload.biography,
                    "phone": payload.phone,
                    "address": payload.address,
                    "age": payload.age,
                }
                set_clauses = []
                values = []
                for column, value in nonadmin_fields.items():
                    if value is not None:
                        set_clauses.append(f"{column} = %s")
                        values.append(value)
                if set_clauses and profile.role != "admin":
                    values.append(user_id)
                    query = f'UPDATE "NonAdmin" SET {", ".join(set_clauses)} WHERE user_id = %s'
                    await cur.execute(query, tuple(values))

                # Role-specific updates
                if profile.role == "client" and payload.display_name is not None:
                    await cur.execute(
                        'UPDATE "Client" SET display_name = %s WHERE user_id = %s',
                        (payload.display_name, user_id),
                    )

                if profile.role == "freelancer" and payload.tagline is not None:
                    await cur.execute(
                        'UPDATE "Freelancer" SET tagline = %s WHERE user_id = %s',
                        (payload.tagline, user_id),
                    )

                await conn.commit()
            except Exception as e:
                await conn.rollback()
                if "unique" in str(e).lower():
                    raise HTTPException(status_code=400, detail="Email already in use")
                raise HTTPException(status_code=400, detail="Failed to update profile")

            # Return the fresh profile
            updated = await _fetch_profile(cur, user_id)
            if not updated:
                raise HTTPException(status_code=404, detail="User not found")
            return updated
