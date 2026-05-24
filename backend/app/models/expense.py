import uuid
import enum
from datetime import datetime, timezone
from sqlalchemy import Column, String, Boolean, Numeric, Date, DateTime, Text, Enum, ForeignKey
from sqlalchemy.dialects.postgresql import UUID, JSONB
from app.database import Base


class PaymentMethod(str, enum.Enum):
    cash = "cash"
    credit = "credit"
    debit = "debit"
    pix = "pix"
    boleto = "boleto"
    other = "other"


class Expense(Base):
    __tablename__ = "expenses"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    receipt_id = Column(UUID(as_uuid=True), ForeignKey("receipts.id"), nullable=True)
    vendor = Column(String, nullable=True)
    date = Column(Date, nullable=False)
    total_amount = Column(Numeric(10, 2), nullable=False)
    currency = Column(String(3), server_default="BRL")
    category = Column(String, nullable=True)
    payment_method = Column(Enum(PaymentMethod), nullable=True)
    notes = Column(Text, nullable=True)
    line_items = Column(JSONB, nullable=True)
    is_manual = Column(Boolean, server_default="false")
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc),
                        onupdate=lambda: datetime.now(timezone.utc))
