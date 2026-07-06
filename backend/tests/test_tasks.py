import uuid
from datetime import date
from unittest.mock import patch, MagicMock
from app.models.receipt import ReceiptStatus
from app.models.expense import PaymentMethod


def _make_user(db):
    from app.models.user import User
    from app.services.auth import hash_password
    u = User(email=f"{uuid.uuid4()}@test.com", password_hash=hash_password("pw"))
    db.add(u)
    db.commit()
    db.refresh(u)
    return u


def _make_receipt(db, user_id):
    from app.models.receipt import Receipt
    r = Receipt(user_id=user_id, image_path="u/r.webp")
    db.add(r)
    db.commit()
    db.refresh(r)
    return r


def test_process_receipt_creates_expense(db):
    user = _make_user(db)
    receipt = _make_receipt(db, user.id)

    ai_data = {
        "vendor": "Test Shop", "date": "2026-05-21", "total_amount": 99.99,
        "subtotal": 90.0, "tax_amount": 9.99, "payment_method": "pix",
        "suggested_category": "Compras", "currency": "BRL", "line_items": [],
    }

    with patch("app.worker.tasks.extract_receipt_data", return_value=ai_data), \
         patch("app.worker.tasks.storage.load", return_value=b"fake"), \
         patch("app.worker.tasks.redis.from_url") as mock_redis:
        mock_redis.return_value.publish = MagicMock()
        from app.worker.tasks import _run_process_receipt
        _run_process_receipt(str(receipt.id), db)

    db.refresh(receipt)
    assert receipt.status == ReceiptStatus.processed
    assert receipt.processed_at is not None

    from app.models.expense import Expense
    expense = db.query(Expense).filter(Expense.receipt_id == receipt.id).first()
    assert expense is not None
    assert expense.vendor == "Test Shop"
    assert expense.payment_method == PaymentMethod.pix
    assert float(expense.total_amount) == 99.99


def test_process_receipt_partial_when_key_fields_missing(db):
    user = _make_user(db)
    receipt = _make_receipt(db, user.id)

    ai_data = {
        "vendor": None, "date": None, "total_amount": 98.88,
        "subtotal": None, "tax_amount": None, "payment_method": None,
        "suggested_category": "Outro", "currency": "BRL", "line_items": [],
    }

    with patch("app.worker.tasks.extract_receipt_data", return_value=ai_data), \
         patch("app.worker.tasks.storage.load", return_value=b"fake"), \
         patch("app.worker.tasks.redis.from_url") as mock_redis:
        mock_redis.return_value.publish = MagicMock()
        from app.worker.tasks import _run_process_receipt
        _run_process_receipt(str(receipt.id), db)

    db.refresh(receipt)
    assert receipt.status == ReceiptStatus.partial

    from app.models.expense import Expense
    expense = db.query(Expense).filter(Expense.receipt_id == receipt.id).first()
    assert expense is not None
    assert float(expense.total_amount) == 98.88


def test_process_receipt_sets_failed_on_ai_error(db):
    user = _make_user(db)
    receipt = _make_receipt(db, user.id)

    with patch("app.worker.tasks.extract_receipt_data", side_effect=Exception("API error")), \
         patch("app.worker.tasks.storage.load", return_value=b"fake"):
        from app.worker.tasks import _run_process_receipt
        try:
            _run_process_receipt(str(receipt.id), db)
        except Exception:
            pass

    db.refresh(receipt)
    assert receipt.status == ReceiptStatus.failed
