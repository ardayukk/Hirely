from typing import Optional
from pydantic import BaseModel, EmailStr


class UserCreate(BaseModel):
    username: str
    email: EmailStr
    password: str
    role: str  # 'client', 'freelancer', or 'admin'


class UserPublic(BaseModel):
    id: int
    username: str
    email: EmailStr
    role: str
    date_joined: str


class UserProfile(BaseModel):
    id: int
    email: EmailStr
    date_joined: str
    name: Optional[str] = None
    biography: Optional[str] = None
    phone: Optional[str] = None
    address: Optional[str] = None
    age: Optional[int] = None
    wallet_balance: Optional[float] = None
    display_name: Optional[str] = None
    tagline: Optional[str] = None
    avg_rating: Optional[float] = None
    total_orders: Optional[int] = None
    total_reviews: Optional[int] = None
    role: str


class UserUpdate(BaseModel):
    email: Optional[EmailStr] = None
    name: Optional[str] = None
    biography: Optional[str] = None
    phone: Optional[str] = None
    address: Optional[str] = None
    age: Optional[int] = None
    display_name: Optional[str] = None
    tagline: Optional[str] = None
