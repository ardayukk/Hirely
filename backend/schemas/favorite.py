from pydantic import BaseModel
from typing import Optional

class FavoriteCreate(BaseModel):
    service_id: Optional[int] = None
    freelancer_id: Optional[int] = None

class FavoritePublic(BaseModel):
    favorite_id: int
    client_id: int
    service_id: Optional[int] = None
    freelancer_id: Optional[int] = None
    created_at: str
