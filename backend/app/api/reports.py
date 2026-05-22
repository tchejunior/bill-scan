import io
from datetime import date
from decimal import Decimal
from fastapi import APIRouter, Depends, Query
from fastapi.responses import StreamingResponse
from sqlalchemy import func
from sqlalchemy.orm import Session
from app.api.deps import get_current_user
from app.database import get_db
from app.models.expense import Expense
from app.models.receipt import Receipt
from app.models.user import User
from app.schemas.report import CategoryBreakdown, PaymentBreakdown, ReportSummary
from app.services.storage import storage

router = APIRouter(prefix="/api/reports", tags=["reports"])


def _base_query(db: Session, user: User, from_date: date, to_date: date):
    return db.query(Expense).filter(
        Expense.user_id == user.id,
        Expense.date >= from_date,
        Expense.date <= to_date,
    )


@router.get("/summary", response_model=ReportSummary)
def summary(
    from_date: date = Query(..., alias="from_date"),
    to_date: date = Query(..., alias="to_date"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    base = _base_query(db, current_user, from_date, to_date)

    expenses = base.all()
    total = sum(e.total_amount for e in expenses) or Decimal("0")

    by_cat = (
        base.with_entities(
            Expense.category,
            func.sum(Expense.total_amount).label("amount"),
            func.count(Expense.id).label("count"),
        )
        .group_by(Expense.category)
        .all()
    )

    by_pm = (
        base.with_entities(
            Expense.payment_method,
            func.sum(Expense.total_amount).label("amount"),
            func.count(Expense.id).label("count"),
        )
        .group_by(Expense.payment_method)
        .all()
    )

    return ReportSummary(
        from_date=from_date,
        to_date=to_date,
        total_amount=total,
        expense_count=len(expenses),
        by_category=[
            CategoryBreakdown(category=r.category or "Outros", amount=r.amount, count=r.count)
            for r in by_cat
        ],
        by_payment_method=[
            PaymentBreakdown(payment_method=str(r.payment_method or "other"),
                             amount=r.amount, count=r.count)
            for r in by_pm
        ],
    )


@router.get("/pdf")
def pdf_report(
    from_date: date = Query(..., alias="from_date"),
    to_date: date = Query(..., alias="to_date"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    from app.services.pdf import generate_pdf_with_images

    expenses = (
        _base_query(db, current_user, from_date, to_date)
        .order_by(Expense.category, Expense.date)
        .all()
    )

    receipt_ids = [str(e.receipt_id) for e in expenses if e.receipt_id]
    receipts = db.query(Receipt).filter(Receipt.id.in_(receipt_ids)).all() if receipt_ids else []
    receipt_image_map = {}
    for r in receipts:
        try:
            receipt_image_map[str(r.id)] = storage.load(r.image_path)
        except FileNotFoundError:
            pass

    pdf_bytes = generate_pdf_with_images(expenses, from_date, to_date, receipt_image_map)

    return StreamingResponse(
        io.BytesIO(pdf_bytes),
        media_type="application/pdf",
        headers={
            "Content-Disposition": (
                f'attachment; filename="recibo42-{from_date}-{to_date}.pdf"'
            )
        },
    )
