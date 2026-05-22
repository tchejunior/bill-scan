from pydantic import BaseModel, ConfigDict
from uuid import UUID
from datetime import datetime
from app.models.receipt import ReceiptStatus


class ReceiptRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    status: ReceiptStatus
    uploaded_at: datetime
    processed_at: datetime | None
