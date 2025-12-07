from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, EmailStr
from core.security import hash_password, verify_password
from db import get_connection
from schemas.user import UserCreate, UserPublic

router = APIRouter(prefix="/auth", tags=["auth"])


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


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
