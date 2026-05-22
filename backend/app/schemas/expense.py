from __future__ import annotations

from decimal import Decimal
from datetime import date, datetime
from typing import Optional
from uuid import UUID
from pydantic import BaseModel, ConfigDict
from app.models.expense import PaymentMethod


class ExpenseCreate(BaseModel):
    vendor: Optional[str] = None
    date: date
    total_amount: Decimal
    currency: str = "BRL"
    category: Optional[str] = None
    payment_method: Optional[PaymentMethod] = None
    notes: Optional[str] = None
    receipt_id: Optional[UUID] = None


class ExpenseUpdate(BaseModel):
    vendor: Optional[str] = None
    date: Optional[date] = None
    total_amount: Optional[Decimal] = None
    currency: Optional[str] = None
    category: Optional[str] = None
    payment_method: Optional[PaymentMethod] = None
    notes: Optional[str] = None


class ExpenseRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    user_id: UUID
    receipt_id: Optional[UUID]
    vendor: Optional[str]
    date: date
    total_amount: Decimal
    currency: str
    category: Optional[str]
    payment_method: Optional[PaymentMethod]
    notes: Optional[str]
    is_manual: bool
    created_at: datetime
    updated_at: datetime
