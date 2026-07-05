from datetime import datetime, timedelta, timezone
from unittest.mock import patch
from app.models.receipt import Receipt, ReceiptStatus
from app.models.user import User

# NOTE: the db fixture does not fully isolate tests (state leaks across tests,
# same reason test_auth.py uses a unique email per test). Every test here sets
# its own preconditions explicitly instead of assuming a clean slate.


def _get_user(db):
    return db.query(User).filter(User.email == "test@recibo42.com").first()


def _reset(db, used_at=None):
    user = _get_user(db)
    user.retry_credit_used_at = used_at
    db.query(Receipt).filter(
        Receipt.user_id == user.id,
        Receipt.status == ReceiptStatus.failed,
    ).delete()
    db.commit()
    return user


def _make_failed_receipt(db, user_id):
    receipt = Receipt(user_id=user_id, image_path="x/y.webp", status=ReceiptStatus.failed)
    db.add(receipt)
    db.commit()
    return receipt


def test_credit_status_available_for_fresh_user(auth_client, db):
    _reset(db)
    resp = auth_client.get("/api/credits")
    assert resp.status_code == 200
    body = resp.json()
    assert body["available"] is True
    assert body["next_credit_at"] is None
    assert body["failed_count"] == 0


def test_retry_without_failed_receipts_returns_400(auth_client, db):
    _reset(db)
    resp = auth_client.post("/api/credits/retry-failed")
    assert resp.status_code == 400
    # Credit must not be consumed
    db.expire_all()
    assert _get_user(db).retry_credit_used_at is None


def test_retry_consumes_credit_and_dispatches_tasks(auth_client, db):
    user = _reset(db)
    r1 = _make_failed_receipt(db, user.id)
    r2 = _make_failed_receipt(db, user.id)

    with patch("app.api.credits.process_receipt.delay") as mock_delay:
        resp = auth_client.post("/api/credits/retry-failed")

    assert resp.status_code == 200
    assert resp.json()["retried_count"] == 2
    dispatched = {call.args[0] for call in mock_delay.call_args_list}
    assert dispatched == {str(r1.id), str(r2.id)}

    status = auth_client.get("/api/credits").json()
    assert status["available"] is False
    assert status["next_credit_at"] is not None


def test_retry_within_window_returns_409(auth_client, db):
    user = _reset(db, used_at=datetime.now(timezone.utc) - timedelta(days=2))
    _make_failed_receipt(db, user.id)

    with patch("app.api.credits.process_receipt.delay") as mock_delay:
        resp = auth_client.post("/api/credits/retry-failed")

    assert resp.status_code == 409
    mock_delay.assert_not_called()


def test_credit_available_again_after_window(auth_client, db):
    user = _reset(db, used_at=datetime.now(timezone.utc) - timedelta(days=8))
    receipt = _make_failed_receipt(db, user.id)

    status = auth_client.get("/api/credits").json()
    assert status["available"] is True

    with patch("app.api.credits.process_receipt.delay") as mock_delay:
        resp = auth_client.post("/api/credits/retry-failed")

    assert resp.status_code == 200
    mock_delay.assert_called_once_with(str(receipt.id))
