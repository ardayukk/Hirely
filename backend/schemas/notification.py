from pydantic import BaseModel
from datetime import datetime


class NotificationPublic(BaseModel):
    notification_id: int
    user_id: int
    type: str
    message: str
    date_sent: datetime
    is_read: bool
