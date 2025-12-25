from typing import Optional, List
from pydantic import BaseModel
from datetime import datetime


class ServiceAddonCreate(BaseModel):
    title: str
    description: Optional[str] = None
    price: float
    delivery_time_extension: int = 0


class ServiceCreate(BaseModel):
    title: str
    category: str
    description: Optional[str] = None
    delivery_time: Optional[int] = None  # in days
    hourly_price: Optional[float] = None
    package_tier: Optional[str] = None
    sample_work: Optional[str] = None
    addon_service_ids: Optional[List[int]] = None
    addons: Optional[List[ServiceAddonCreate]] = None


class ServiceUpdate(BaseModel):
    title: Optional[str] = None
    category: Optional[str] = None
    description: Optional[str] = None
    delivery_time: Optional[int] = None  # in days
    hourly_price: Optional[float] = None
    package_tier: Optional[str] = None
    sample_work: Optional[str] = None


class ServicePublic(BaseModel):
    service_id: int
    title: str
    category: str
    description: Optional[str] = None
    delivery_time: Optional[int] = None
    hourly_price: Optional[float] = None
    package_tier: Optional[str] = None
    status: str
    average_rating: float


class FreelancerSummary(BaseModel):
    user_id: int
    username: str
    tagline: Optional[str] = None
    avg_rating: float
    total_orders: int
    total_reviews: int


class ReviewSummary(BaseModel):
    review_id: int
    rating: int
    comment: Optional[str] = None
    client_id: int


class ServiceAddon(BaseModel):
    addon_id: int
    title: str
    description: Optional[str] = None
    price: float
    delivery_time_extension: int = 0


class ServiceDetail(BaseModel):
    service_id: int
    title: str
    category: str
    description: Optional[str] = None
    delivery_time: Optional[int] = None
    hourly_price: Optional[float] = None
    package_tier: Optional[str] = None
    status: str
    average_rating: float
    freelancer: FreelancerSummary
    sample_work: Optional[str] = None
    reviews: List[ReviewSummary] = []
    addons: List[ServiceAddon] = []


class SampleWorkUpdate(BaseModel):
    sample_work: str


class ServiceUpdate(BaseModel):
    title: Optional[str] = None
    category: Optional[str] = None
    description: Optional[str] = None
    delivery_time: Optional[int] = None
    hourly_price: Optional[float] = None
    package_tier: Optional[str] = None
    status: Optional[str] = None


class ServiceUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    delivery_time: Optional[int] = None
    hourly_price: Optional[float] = None
    package_tier: Optional[str] = None


class AddOnCreate(BaseModel):
    addon_service_id: int
