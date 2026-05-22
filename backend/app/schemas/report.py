from pydantic import BaseModel
from datetime import date
from decimal import Decimal


class CategoryBreakdown(BaseModel):
    category: str
    amount: Decimal
    count: int


class PaymentBreakdown(BaseModel):
    payment_method: str
    amount: Decimal
    count: int


class ReportSummary(BaseModel):
    from_date: date
    to_date: date
    total_amount: Decimal
    expense_count: int
    by_category: list[CategoryBreakdown]
    by_payment_method: list[PaymentBreakdown]
