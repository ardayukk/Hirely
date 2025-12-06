from fastapi import APIRouter, HTTPException

from core.security import hash_password
from db import get_connection
from repositories.user_repo import create_user, get_user_by_email
from schemas.user import UserCreate, UserPublic
from core.security import verify_password
from pydantic import BaseModel, EmailStr

router = APIRouter(prefix="/auth", tags=["auth"])


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


@router.post("/register", response_model=UserPublic)
async def register(user: UserCreate):
    async with get_connection() as conn:
        existing = await get_user_by_email(conn, user.email)
        if existing:
            raise HTTPException(status_code=400, detail="Email already registered")

        hashed = hash_password(user.password)
        new_user = await create_user(
            conn=conn,
            username=user.username,
            email=user.email,
            hashed_password=hashed,
            role=user.role,
        )

    return UserPublic(
        id=new_user[0],
        username=new_user[1],
        email=new_user[2],
        role=new_user[3],
        date_joined=str(new_user[4]),
    )


@router.post("/login", response_model=UserPublic)
async def login(payload: LoginRequest):
    async with get_connection() as conn:
        existing = await get_user_by_email(conn, payload.email)
        if not existing:
            raise HTTPException(status_code=400, detail="Invalid credentials")

        hashed_password = existing[5]
        if not verify_password(payload.password, hashed_password):
            raise HTTPException(status_code=400, detail="Invalid credentials")

        return UserPublic(
            id=existing[0],
            username=existing[1],
            email=existing[2],
            role=existing[10],
            date_joined=str(existing[7]),
        )
