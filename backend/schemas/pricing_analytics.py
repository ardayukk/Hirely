from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class PricingSummary(BaseModel):
    median_price: float
    avg_price: float
    std_dev_price: float
    total_services: int
    categories_count: int
    avg_orders_per_service: float
    most_expensive_category: Optional[str]
    most_expensive_avg: Optional[float]
    most_competitive_category: Optional[str]
    most_competitive_count: Optional[int]


class CategoryTrendPoint(BaseModel):
    category: str
    period: str
    avg_price: float
    service_count: int


class PriceDistributionBucket(BaseModel):
    bucket_label: str
    range_start: float
    range_end: float
    count: int


class PriceDemandPoint(BaseModel):
    service_id: int
    title: str
    avg_price: float
    category: str
    total_orders: int
    revenue: float


class UndercuttingService(BaseModel):
    service_id: int
    service_title: str
    service_price: float
    category: str
    category_avg: float
    price_diff_pct: float


class PremiumAdoptionPoint(BaseModel):
    period: str
    basic_count: int
    standard_count: int
    premium_count: int
    basic_pct: float
    standard_pct: float
    premium_pct: float
