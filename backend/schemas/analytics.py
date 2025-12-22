from typing import List, Optional, Dict, Any
from pydantic import BaseModel
from datetime import datetime, date
from enum import Enum


class CategoryMetric(BaseModel):
    category: str
    avg_order_price: Optional[float] = None
    dispute_rate: Optional[float] = None
    avg_rating: Optional[float] = None


class AnalyticsSummary(BaseModel):
    generated_at: datetime
    overall_avg_price: Optional[float]
    overall_dispute_rate: Optional[float]
    overall_satisfaction: Optional[float]
    per_category: List[CategoryMetric]


class AnalyticsSnapshot(BaseModel):
    report_id: int
    report_date: datetime
    avg_pricing: Optional[float]
    avg_dispute_rate: Optional[float]
    avg_satisfaction: Optional[float]


class EventType(str, Enum):
    VIEW = 'VIEW'
    CLICK = 'CLICK'
    ORDER_CONVERSION = 'ORDER_CONVERSION'
    CONTACT = 'CONTACT'
    SEARCH_IMPRESSION = 'SEARCH_IMPRESSION'

class ServiceEventCreate(BaseModel):
    service_id: int
    event_type: EventType
    metadata: Optional[Dict[str, Any]] = {}

class ServiceEventResponse(ServiceEventCreate):
    event_id: int
    user_id: Optional[int]
    created_at: datetime

class DailyMetricResponse(BaseModel):
    service_id: int
    date: date
    views_count: int
    clicks_count: int
    orders_count: int
    impressions_count: Optional[int] = 0
    conversion_rate: float
    ctr: Optional[float] = 0.0
    avg_response_time: Optional[float]
    avg_rating: Optional[float]
    total_earnings: float

class FreelancerAnalyticsSummary(BaseModel):
    total_views: int
    total_clicks: int
    total_orders: int
    total_impressions: Optional[int] = 0
    avg_conversion_rate: float
    avg_ctr: Optional[float] = 0.0
    avg_response_time: Optional[float]
    avg_rating: Optional[float]
    total_earnings: float

