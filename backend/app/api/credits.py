from datetime import datetime, timedelta, timezone
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import or_
from sqlalchemy.orm import Session
from app.api.deps import get_current_user
from app.database import get_db
from app.models.receipt import Receipt, ReceiptStatus
from app.models.user import User
from app.schemas.credit import CreditStatus, RetryFailedResponse
from app.worker.tasks import process_receipt

router = APIRouter(prefix="/api/credits", tags=["credits"])

CREDIT_WINDOW = timedelta(days=7)


def _failed_receipts_query(db: Session, user_id):
    return db.query(Receipt).filter(
        Receipt.user_id == user_id,
        Receipt.status == ReceiptStatus.failed,
    )


@router.get("", response_model=CreditStatus)
def get_credit_status(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    used_at = current_user.retry_credit_used_at
    now = datetime.now(timezone.utc)
    available = used_at is None or used_at + CREDIT_WINDOW <= now
    return CreditStatus(
        available=available,
        next_credit_at=None if available else used_at + CREDIT_WINDOW,
        failed_count=_failed_receipts_query(db, current_user.id).count(),
    )


@router.post("/retry-failed", response_model=RetryFailedResponse)
def retry_failed_scans(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    failed_ids = [r.id for r in _failed_receipts_query(db, current_user.id).all()]
    if not failed_ids:
        raise HTTPException(status_code=400, detail="Nenhum recibo com falha para tentar novamente")

    now = datetime.now(timezone.utc)
    window_start = now - CREDIT_WINDOW
    # Atomic consume: only spends the credit if it is currently available,
    # so concurrent requests cannot double-spend.
    consumed = db.query(User).filter(
        User.id == current_user.id,
        or_(
            User.retry_credit_used_at.is_(None),
            User.retry_credit_used_at <= window_start,
        ),
    ).update({"retry_credit_used_at": now}, synchronize_session=False)
    if not consumed:
        raise HTTPException(status_code=409, detail="Crédito semanal já utilizado")
    db.commit()

    for receipt_id in failed_ids:
        process_receipt.delay(str(receipt_id))

    return RetryFailedResponse(retried_count=len(failed_ids), next_credit_at=now + CREDIT_WINDOW)
