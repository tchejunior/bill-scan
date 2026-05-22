import uuid as uuid_lib
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.api.deps import get_current_user
from app.database import get_db
from app.models.expense import Expense
from app.models.user import User
from app.schemas.expense import ExpenseCreate, ExpenseRead, ExpenseUpdate

router = APIRouter(prefix="/api/expenses", tags=["expenses"])


def _get_owned_expense(expense_id: uuid_lib.UUID, user: User, db: Session) -> Expense:
    expense = db.query(Expense).filter(
        Expense.id == expense_id, Expense.user_id == user.id
    ).first()
    if not expense:
        raise HTTPException(status_code=404, detail="Expense not found")
    return expense


@router.post("", response_model=ExpenseRead, status_code=201)
def create_expense(
    body: ExpenseCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    expense = Expense(
        user_id=current_user.id,
        is_manual=True,
        **body.model_dump(exclude_none=True),
    )
    db.add(expense)
    db.commit()
    db.refresh(expense)
    return expense


@router.get("", response_model=list[ExpenseRead])
def list_expenses(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return db.query(Expense).filter(Expense.user_id == current_user.id).order_by(
        Expense.date.desc(), Expense.created_at.desc()
    ).all()


@router.get("/{expense_id}", response_model=ExpenseRead)
def get_expense(
    expense_id: uuid_lib.UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return _get_owned_expense(expense_id, current_user, db)


@router.patch("/{expense_id}", response_model=ExpenseRead)
def update_expense(
    expense_id: uuid_lib.UUID,
    body: ExpenseUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    expense = _get_owned_expense(expense_id, current_user, db)
    for field, value in body.model_dump(exclude_none=True).items():
        setattr(expense, field, value)
    db.commit()
    db.refresh(expense)
    return expense


@router.delete("/{expense_id}", status_code=204)
def delete_expense(
    expense_id: uuid_lib.UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    expense = _get_owned_expense(expense_id, current_user, db)
    db.delete(expense)
    db.commit()
