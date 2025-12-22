from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from datetime import datetime


class OrderCreate(BaseModel):
    """Client places an order for a service"""
    service_id: int
    total_price: float
    order_type: str  # 'small' or 'big'
    delivery_date: Optional[datetime] = None  # for small orders
    milestone_count: Optional[int] = None  # for big orders
    milestone_delivery_date: Optional[datetime] = None
    requirements: Optional[Dict[str, Any]] = None
    required_hours: Optional[int] = None
    addon_service_ids: Optional[List[int]] = None


class OrderPublic(BaseModel):
    order_id: int
    order_date: datetime
    status: str
    revision_count: int
    included_revision_limit: Optional[int] = None
    extra_revisions_purchased: int = 0
    revisions_unlimited: bool = False
    revisions_allowed: Optional[int] = None
    revisions_remaining: Optional[int] = None
    total_price: float
    review_given: bool
    service_id: int
    client_id: int
    freelancer_id: Optional[int] = None
    requirements: Optional[Dict[str, Any]] = None
    required_hours: Optional[int] = None
    addon_service_ids: Optional[List[int]] = None
    service_title: Optional[str] = None
    client_name: Optional[str] = None
    freelancer_name: Optional[str] = None
    delivery_date: Optional[datetime] = None


class OrderDetail(OrderPublic):
    service_title: Optional[str] = None
    service_category: Optional[str] = None
    freelancer_name: Optional[str] = None
    client_name: Optional[str] = None
    is_big_order: bool = False
    milestone_count: Optional[int] = None
    current_phase: Optional[int] = None


class RevisionCreate(BaseModel):
    """Client requests a revision"""
    revision_text: str


class PurchaseRevisionsRequest(BaseModel):
    quantity: int
    payment_ref: Optional[str] = None
    amount: Optional[float] = 0.0


class RevisionPublic(BaseModel):
    revision_id: int
    revision_text: str
    revision_no: int
    order_id: int
    client_id: int


class ReviewCreate(BaseModel):
    """Client leaves a review after completion"""
    rating: int  # 1-5
    comment: Optional[str] = None
    highlights: Optional[str] = None


class ReviewPublic(BaseModel):
    review_id: int
    rating: int
    comment: Optional[str]
    highlights: Optional[str]
    client_id: int
    service_id: int


class OrderRejectionRequest(BaseModel):
    """Freelancer rejects an order"""
    reason: Optional[str] = None


class OrderRejectionPublic(BaseModel):
    rejection_id: int
    order_id: int
    freelancer_id: int
    client_id: int
    reason: Optional[str]
    rejection_date: datetime
    service_id: int
