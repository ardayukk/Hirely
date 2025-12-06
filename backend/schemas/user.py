from pydantic import BaseModel, EmailStr


class UserCreate(BaseModel):
    username: str
    email: EmailStr
    password: str
    role: str  # 'client' or 'freelancer'


class UserPublic(BaseModel):
    id: int
    username: str
    email: EmailStr
    role: str
    date_joined: str
