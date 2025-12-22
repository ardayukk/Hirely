from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel


class EarningsSummary(BaseModel):
    available_balance: float
    pending_balance: float
    total_earned: float
    average_order_value: float
    order_volume: int
    first_payout_date: Optional[datetime] = None
    last_payout_date: Optional[datetime] = None


class EarningsHistoryItem(BaseModel):
    payment_id: int
    order_id: int
    service_id: int
    service_title: str
    amount: float
    payment_date: datetime
    order_status: str


class EarningsHistoryResponse(BaseModel):
    items: List[EarningsHistoryItem]
    total: int
    page: int
    page_size: int


class ServiceBreakdownItem(BaseModel):
    service_id: int
    service_title: str
    total_earned: float
    order_count: int
    average_order_value: float


class EarningsPoint(BaseModel):
    period: datetime
    total_earned: float
