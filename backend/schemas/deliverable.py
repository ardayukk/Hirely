from pydantic import BaseModel
from datetime import datetime
from typing import Optional


class DeliverableCreate(BaseModel):
    description: Optional[str] = None
    due_date: Optional[datetime] = None
    payment_amount: Optional[float] = None


class DeliverablePublic(BaseModel):
    deliverable_id: int
    order_id: int
    description: Optional[str] = None
    due_date: Optional[datetime] = None
    payment_amount: Optional[float] = None
    status: str
