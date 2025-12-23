from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel


class DisputeCreate(BaseModel):
    order_id: int
    reason: Optional[str] = None


class DisputeAssign(BaseModel):
    admin_id: int


class DisputeResolve(BaseModel):
    decision: str
    outcome: Optional[str] = None  # 'refund' | 'release' | None


class DisputePublic(BaseModel):
    dispute_id: int
    status: str
    decision: Optional[str]
    resolution_date: Optional[datetime]
    order_id: int
    client_id: int
    admin_id: Optional[int]
    client_name: Optional[str] = None
    admin_name: Optional[str] = None
    description: Optional[str] = None
    freelancer_response: Optional[str] = None
    freelancer_response_at: Optional[datetime] = None


class DisputeList(BaseModel):
    items: List[DisputePublic]


class FreelancerResponseCreate(BaseModel):
    response: str
