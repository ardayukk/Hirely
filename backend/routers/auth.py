from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, EmailStr
from backend.core.security import hash_password, verify_password
from backend.db import get_connection
from backend.schemas.user import UserCreate, UserPublic

router = APIRouter(prefix="/auth", tags=["auth"])


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class DevSetRole(BaseModel):
    user_id: int
    role: str  # client | freelancer | admin


@router.post("/register", response_model=UserPublic)
async def register(user: UserCreate):
    """
    Register a new client user.
    Flow:
    1. Insert into "User" (email, password)
    2. Insert into "NonAdmin" (name, biography, wallet)
    3. Insert into "Client" (display_name)
    """
    async with get_connection() as conn:
        async with conn.cursor() as cur:
            # Check if email already exists
            await cur.execute('SELECT user_id FROM "User" WHERE email = %s', (user.email,))
            existing = await cur.fetchone()
            if existing:
                raise HTTPException(
                    status_code=400,
                    detail="An account with this email already exists. Please use a different email or login."
                )

            hashed = hash_password(user.password)

            try:
                # 1. Insert into User
                await cur.execute(
                    'INSERT INTO "User" (email, password) VALUES (%s, %s) RETURNING user_id',
                    (user.email, hashed)
                )
                user_id = await cur.fetchone()
                if not user_id:
                    raise Exception("Failed to create user")
                user_id = user_id[0]

                # 2. Insert into NonAdmin
                await cur.execute(
                    'INSERT INTO "NonAdmin" (user_id, name, biography, wallet_balance) VALUES (%s, %s, %s, %s)',
                    (user_id, user.username, "", 0.00)
                )

                # 3. Insert into Client (assuming role is always 'client' for now)
                if user.role == 'client':
                    await cur.execute(
                        'INSERT INTO "Client" (user_id, display_name) VALUES (%s, %s)',
                        (user_id, user.username)
                    )
                elif user.role == 'freelancer':
                    await cur.execute(
                        'INSERT INTO "Freelancer" (user_id, tagline, avg_rating, total_orders, total_reviews) VALUES (%s, %s, %s, %s, %s)',
                        (user_id, "", 0.00, 0, 0)
                    )

                await conn.commit()

                return UserPublic(
                    id=user_id,
                    username=user.username,
                    email=user.email,
                    role=user.role,
                    date_joined=str("now")
                )

            except Exception as e:
                await conn.rollback()
                if "unique" in str(e).lower() or "already exists" in str(e).lower():
                    raise HTTPException(
                        status_code=400,
                        detail="An account with this email already exists. Please use a different email or login."
                    )
                raise HTTPException(
                    status_code=400,
                    detail="Registration failed. Please check your input and try again."
                )


@router.post("/login", response_model=UserPublic)
async def login(payload: LoginRequest):
    """
    Login user with email and password.
    Query the "User" table and verify password.
    """
    async with get_connection() as conn:
        async with conn.cursor() as cur:
            # Fetch user from User table
            await cur.execute(
                'SELECT user_id, password FROM "User" WHERE email = %s',
                (payload.email,)
            )
            user_row = await cur.fetchone()

            if not user_row:
                raise HTTPException(
                    status_code=401,
                    detail="Email or password is incorrect. Please check and try again."
                )

            user_id, hashed_password = user_row

            if not verify_password(payload.password, hashed_password):
                raise HTTPException(
                    status_code=401,
                    detail="Email or password is incorrect. Please check and try again."
                )

            # Determine user role (Admin, Client, or Freelancer)
            await cur.execute('SELECT user_id FROM "Admin" WHERE user_id = %s', (user_id,))
            is_admin = await cur.fetchone()

            await cur.execute('SELECT user_id FROM "Client" WHERE user_id = %s', (user_id,))
            is_client = await cur.fetchone()

            await cur.execute('SELECT user_id FROM "Freelancer" WHERE user_id = %s', (user_id,))
            is_freelancer = await cur.fetchone()

            # Fetch NonAdmin data for name/username
            await cur.execute(
                'SELECT name FROM "NonAdmin" WHERE user_id = %s',
                (user_id,)
            )
            nonadmin_row = await cur.fetchone()
            name = nonadmin_row[0] if nonadmin_row else ""

            # Determine role
            if is_admin:
                role = "admin"
            elif is_client:
                role = "client"
            elif is_freelancer:
                role = "freelancer"
            else:
                role = "unknown"

            return UserPublic(
                id=user_id,
                username=name,
                email=payload.email,
                role=role,
                date_joined=str("now")
            )


@router.post("/dev/set-role", response_model=UserPublic)
async def dev_set_role(payload: DevSetRole):
    """Dev-only helper to flip a user's role without re-registering."""
    role = payload.role.lower()
    if role not in {"client", "freelancer", "admin"}:
        raise HTTPException(status_code=400, detail="Role must be client, freelancer, or admin")

    async with get_connection() as conn:
        async with conn.cursor() as cur:
            try:
                # Ensure user exists
                await cur.execute('SELECT email, date_joined FROM "User" WHERE user_id = %s', (payload.user_id,))
                user_row = await cur.fetchone()
                if not user_row:
                    raise HTTPException(status_code=404, detail="User not found")
                email, date_joined = user_row

                # Ensure NonAdmin exists (for client/freelancer defaults)
                await cur.execute('SELECT name FROM "NonAdmin" WHERE user_id = %s', (payload.user_id,))
                non_row = await cur.fetchone()
                name = non_row[0] if non_row else None
                if not non_row:
                    name = f"User {payload.user_id}"
                    await cur.execute(
                        'INSERT INTO "NonAdmin" (user_id, name, biography, wallet_balance) VALUES (%s, %s, %s, %s)',
                        (payload.user_id, name, "", 0.0),
                    )

                # Clear existing roles
                await cur.execute('DELETE FROM "Admin" WHERE user_id = %s', (payload.user_id,))
                await cur.execute('DELETE FROM "Client" WHERE user_id = %s', (payload.user_id,))
                await cur.execute('DELETE FROM "Freelancer" WHERE user_id = %s', (payload.user_id,))

                # Insert new role row
                if role == "admin":
                    admin_username = name or f"admin_{payload.user_id}"
                    await cur.execute(
                        'INSERT INTO "Admin" (user_id, username) VALUES (%s, %s)',
                        (payload.user_id, admin_username),
                    )
                elif role == "client":
                    await cur.execute(
                        'INSERT INTO "Client" (user_id, display_name) VALUES (%s, %s)',
                        (payload.user_id, name or f"client_{payload.user_id}"),
                    )
                elif role == "freelancer":
                    await cur.execute(
                        'INSERT INTO "Freelancer" (user_id, tagline, avg_rating, total_orders, total_reviews) VALUES (%s, %s, %s, %s, %s)',
                        (payload.user_id, "", 0.0, 0, 0),
                    )

                await conn.commit()

                return UserPublic(
                    id=payload.user_id,
                    username=name or "",
                    email=email,
                    role=role,
                    date_joined=str(date_joined),
                )
            except HTTPException:
                await conn.rollback()
                raise
            except Exception as e:
                await conn.rollback()
                raise HTTPException(status_code=400, detail=f"Failed to set role: {str(e)}")
