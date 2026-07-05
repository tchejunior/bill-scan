from datetime import datetime
from pydantic import BaseModel


class CreditStatus(BaseModel):
    available: bool
    next_credit_at: datetime | None
    failed_count: int


class RetryFailedResponse(BaseModel):
    retried_count: int
    next_credit_at: datetime
