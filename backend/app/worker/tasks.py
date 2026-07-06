import json
import redis
from datetime import datetime, timezone, date
from sqlalchemy.orm import Session
from app.worker.celery_app import celery
from app.database import _get_session_factory
from app.models.receipt import Receipt, ReceiptStatus
from app.models.expense import Expense, PaymentMethod
from app.services.ai import extract_receipt_data
from app.services.storage import storage
from app.config import settings

_PM_MAP = {
    "cash": PaymentMethod.cash,
    "credit": PaymentMethod.credit,
    "debit": PaymentMethod.debit,
    "pix": PaymentMethod.pix,
    "boleto": PaymentMethod.boleto,
    "other": PaymentMethod.other,
}


def _run_process_receipt(receipt_id: str, db: Session) -> None:
    receipt = db.query(Receipt).filter(Receipt.id == receipt_id).first()
    if not receipt:
        raise ValueError(f"Receipt {receipt_id} not found")

    receipt.status = ReceiptStatus.processing
    db.commit()

    try:
        image_data = storage.load(receipt.image_path)
        data = extract_receipt_data(image_data)
    except Exception:
        receipt.status = ReceiptStatus.failed
        db.commit()
        raise

    parsed_date = date.today()
    if data.get("date"):
        try:
            parsed_date = date.fromisoformat(data["date"])
        except (ValueError, TypeError):
            pass

    line_items = data.get("line_items")
    if not isinstance(line_items, list):
        line_items = []

    # Idempotent: reuse existing expense if this task is retried after a transient failure
    expense = db.query(Expense).filter(Expense.receipt_id == receipt.id).first()
    if expense is None:
        expense = Expense(user_id=receipt.user_id, receipt_id=receipt.id)
        db.add(expense)

    expense.vendor = data.get("vendor")
    expense.date = parsed_date
    expense.total_amount = data.get("total_amount") or 0
    expense.currency = data.get("currency", "BRL")
    expense.category = data.get("suggested_category")
    expense.payment_method = _PM_MAP.get(data.get("payment_method") or "", PaymentMethod.other)
    expense.line_items = line_items or None

    # Missing key fields need manual review even when the AI response parsed cleanly
    is_partial = (
        bool(data.get("_parse_error"))
        or not data.get("vendor")
        or not data.get("date")
        or not data.get("total_amount")
    )
    receipt.status = ReceiptStatus.partial if is_partial else ReceiptStatus.processed
    receipt.processed_at = datetime.now(timezone.utc)
    receipt.raw_ai_output = data
    db.commit()
    db.refresh(expense)

    r = redis.from_url(settings.redis_url)
    try:
        r.publish(
            f"user:{receipt.user_id}:events",
            json.dumps({
                "type": "receipt.processed",
                "receipt_id": str(receipt.id),
                "expense_id": str(expense.id),
            }),
        )
    finally:
        r.close()


def _publish_failure(receipt_id: str, user_id: str) -> None:
    r = redis.from_url(settings.redis_url)
    try:
        r.publish(
            f"user:{user_id}:events",
            json.dumps({"type": "receipt.failed", "receipt_id": receipt_id}),
        )
    finally:
        r.close()


@celery.task(bind=True, max_retries=3, default_retry_delay=30)
def process_receipt(self, receipt_id: str):
    db = _get_session_factory()()
    try:
        _run_process_receipt(receipt_id, db)
    except Exception as exc:
        if self.request.retries >= self.max_retries:
            receipt = db.query(Receipt).filter(Receipt.id == receipt_id).first()
            if receipt:
                _publish_failure(receipt_id, str(receipt.user_id))
        raise self.retry(exc=exc)
    finally:
        db.close()
