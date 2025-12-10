from typing import List, Optional
from pydantic import BaseModel
from datetime import datetime


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
