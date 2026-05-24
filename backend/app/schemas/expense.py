from decimal import Decimal
from datetime import date, datetime
from typing import Any, Optional
from uuid import UUID
from pydantic import BaseModel, ConfigDict, model_validator
from app.models.expense import PaymentMethod


class ExpenseCreate(BaseModel):
    merchant: Optional[str] = None
    date: date
    amount: int  # cents
    currency: str = "BRL"
    category: Optional[str] = None
    payment_method: Optional[PaymentMethod] = None
    notes: Optional[str] = None
    receipt_id: Optional[UUID] = None


class ExpenseUpdate(BaseModel):
    merchant: Optional[str] = None
    date: Optional[date] = None
    amount: Optional[int] = None  # cents
    currency: Optional[str] = None
    category: Optional[str] = None
    payment_method: Optional[PaymentMethod] = None
    notes: Optional[str] = None


class ExpenseRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    user_id: UUID
    receipt_id: Optional[UUID]
    merchant: Optional[str]
    amount: int  # cents
    date: date
    currency: str
    category: Optional[str]
    payment_method: Optional[PaymentMethod]
    notes: Optional[str]
    line_items: Optional[list] = None
    is_manual: bool
    created_at: datetime
    updated_at: datetime

    @model_validator(mode='before')
    @classmethod
    def _adapt(cls, v: Any) -> Any:
        if isinstance(v, dict):
            return v
        # SQLAlchemy ORM object — map vendor→merchant and total_amount→amount (cents)
        return {
            'id': v.id,
            'user_id': v.user_id,
            'receipt_id': v.receipt_id,
            'merchant': v.vendor,
            'amount': int(v.total_amount * 100) if v.total_amount else 0,
            'date': v.date,
            'currency': v.currency,
            'category': v.category,
            'payment_method': v.payment_method,
            'notes': v.notes,
            'line_items': v.line_items,
            'is_manual': v.is_manual,
            'created_at': v.created_at,
            'updated_at': v.updated_at,
        }
