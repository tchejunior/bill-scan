from pydantic import BaseModel
from uuid import UUID
from datetime import datetime
from app.models.receipt import ReceiptStatus


class ReceiptRead(BaseModel):
    id: UUID
    status: ReceiptStatus
    uploaded_at: datetime
    processed_at: datetime | None

    class Config:
        from_attributes = True
