from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class NPSSurveyCreate(BaseModel):
    order_id: int
    nps_score: int
    satisfaction_rating: int
    response_time_rating: int
    quality_rating: int
    communication_rating: int
    would_repeat: Optional[bool] = None
    comments: Optional[str] = None


class NPSSurvey(NPSSurveyCreate):
    survey_id: int
    client_id: int
    freelancer_id: int
    created_at: datetime


class SatisfactionMetrics(BaseModel):
    avg_order_rating: float
    avg_nps_score: float
    order_completion_rate: float
    revision_request_rate: float
    dispute_rate: float
    avg_response_time_satisfaction: float
    repeat_client_rate: float
    total_surveys: int
    total_completed_orders: int
    total_revised_orders: int
    total_disputed_orders: int


class SatisfactionTrend(BaseModel):
    date: str
    nps_score: float
    satisfaction_rating: float
    completion_rate: float
    repeat_rate: float


class SatisfactionDrilldown(BaseModel):
    category: Optional[str] = None
    freelancer_tier: Optional[str] = None
    period: str
    metrics: SatisfactionMetrics
