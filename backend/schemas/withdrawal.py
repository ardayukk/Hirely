from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime
from decimal import Decimal

# Withdrawal Method Schemas
class WithdrawalMethodCreate(BaseModel):
    method_type: str = Field(..., pattern="^(bank_account|paypal|stripe)$")
    account_holder_name: str
    account_number: Optional[str] = None
    bank_name: Optional[str] = None
    swift_code: Optional[str] = None
    paypal_email: Optional[str] = None
    is_default: bool = False

class WithdrawalMethodPublic(BaseModel):
    method_id: int
    freelancer_id: int
    method_type: str
    account_holder_name: str
    account_number: Optional[str] = None
    bank_name: Optional[str] = None
    swift_code: Optional[str] = None
    paypal_email: Optional[str] = None
    is_default: bool
    created_at: datetime

# Withdrawal Schemas
class WithdrawalRequest(BaseModel):
    withdrawal_method_id: int
    amount: Decimal = Field(..., gt=0)

class WithdrawalPublic(BaseModel):
    withdrawal_id: int
    freelancer_id: int
    withdrawal_method_id: int
    amount: Decimal
    fee: Decimal
    net_amount: Decimal
    status: str
    requested_at: datetime
    processing_started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    notes: Optional[str] = None
    transaction_reference: Optional[str] = None

class WithdrawalWithMethod(WithdrawalPublic):
    method_type: str
    account_holder_name: str
    bank_name: Optional[str] = None
    paypal_email: Optional[str] = None
