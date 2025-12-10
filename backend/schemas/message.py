from typing import Optional
from datetime import datetime
from pydantic import BaseModel


class MessageCreate(BaseModel):
    order_id: int
    message_text: str
    reply_to_id: Optional[int] = None
    file_name: Optional[str] = None
    file_path: Optional[str] = None
    file_type: Optional[str] = None


class MessagePublic(BaseModel):
    message_id: int
    sender_id: int
    receiver_id: int
    message_text: str
    timestamp: datetime
    is_read: bool
    reply_to_id: Optional[int] = None
    file_id: Optional[int] = None
    file_name: Optional[str] = None
    file_path: Optional[str] = None
    file_type: Optional[str] = None


class ConversationMessage(MessagePublic):
    sender_name: Optional[str] = None
    receiver_name: Optional[str] = None


class ConversationThread(BaseModel):
    client_id: int
    freelancer_id: int
    other_user_id: int
    other_user_name: Optional[str]
    last_message: Optional[str]
    last_message_at: Optional[datetime]
    unread_count: int = 0
    order_id: Optional[int] = None
