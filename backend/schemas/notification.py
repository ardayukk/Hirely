from pydantic import BaseModel
from datetime import datetime


class NotificationPublic(BaseModel):
    notification_id: int
    user_id: int
    type: str
    message: str
    created_at: datetime
    is_read: bool
