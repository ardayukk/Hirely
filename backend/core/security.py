from passlib.context import CryptContext

# Use pbkdf2_sha256 to avoid bcrypt's 72-byte limit and backend issues
pwd_ctx = CryptContext(schemes=["pbkdf2_sha256"], deprecated="auto")


def hash_password(password: str) -> str:
    return pwd_ctx.hash(password)


def verify_password(password: str, hashed: str) -> bool:
    return pwd_ctx.verify(password, hashed)


# FastAPI dependency helpers for simple auth in analytics endpoints
from typing import Optional
from fastapi import Header, HTTPException
from backend.schemas.user import UserResponse


async def get_current_user_optional(authorization: Optional[str] = Header(None)) -> Optional[UserResponse]:
    """Return a UserResponse if an Authorization header is present and parsable, else None.

    For local testing we accept a header of the form `Bearer <user_id>` and return that user id.
    If no header is supplied we return None (optional auth).
    """
    if not authorization:
        return None
    try:
        parts = authorization.split()
        if len(parts) == 2 and parts[0].lower() == "bearer" and parts[1].isdigit():
            uid = int(parts[1])
            return UserResponse(user_id=uid, id=uid, role="freelancer")
    except Exception:
        pass
    return None


async def get_current_user(authorization: Optional[str] = Header(None)) -> UserResponse:
    user = await get_current_user_optional(authorization)
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    return user
