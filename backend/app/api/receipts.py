from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from fastapi.responses import Response
from sqlalchemy.orm import Session
from app.api.deps import get_current_user
from app.database import get_db
from app.models.expense import Expense
from app.models.receipt import Receipt
from app.models.user import User
from app.schemas.receipt import ReceiptRead
from app.services.image import process_image
from app.services.storage import storage
from app.worker.tasks import process_receipt
import uuid

router = APIRouter(prefix="/api/receipts", tags=["receipts"])

_ALLOWED_TYPES = {"image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"}


@router.post("", response_model=ReceiptRead, status_code=202)
async def upload_receipt(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if file.content_type not in _ALLOWED_TYPES:
        raise HTTPException(status_code=415, detail="Unsupported image type")

    receipt_id = uuid.uuid4()
    raw = await file.read()
    if not raw:
        raise HTTPException(status_code=422, detail="Empty file received")
    try:
        webp_data = process_image(raw)
    except Exception as exc:
        raise HTTPException(status_code=422, detail=f"Could not process image: {exc}") from exc
    image_path = storage.save(str(current_user.id), str(receipt_id), webp_data)

    receipt = Receipt(id=receipt_id, user_id=current_user.id, image_path=image_path)
    db.add(receipt)
    db.commit()
    db.refresh(receipt)

    process_receipt.delay(str(receipt_id))
    return receipt


@router.get("", response_model=list[ReceiptRead])
def list_receipts(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return db.query(Receipt).filter(Receipt.user_id == current_user.id).order_by(
        Receipt.uploaded_at.desc()
    ).all()


@router.get("/{receipt_id}", response_model=ReceiptRead)
def get_receipt(
    receipt_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    receipt = db.query(Receipt).filter(
        Receipt.id == receipt_id, Receipt.user_id == current_user.id
    ).first()
    if not receipt:
        raise HTTPException(status_code=404, detail="Receipt not found")
    return receipt


@router.get("/{receipt_id}/image")
def get_receipt_image(
    receipt_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    receipt = db.query(Receipt).filter(
        Receipt.id == receipt_id, Receipt.user_id == current_user.id
    ).first()
    if not receipt:
        raise HTTPException(status_code=404, detail="Receipt not found")
    try:
        data = storage.load(receipt.image_path)
    except FileNotFoundError:
        raise HTTPException(status_code=404, detail="Image not found")
    return Response(content=data, media_type="image/webp", headers={
        "Cache-Control": "private, max-age=3600",
    })


@router.delete("/{receipt_id}", status_code=204)
def delete_receipt(
    receipt_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    receipt = db.query(Receipt).filter(
        Receipt.id == receipt_id, Receipt.user_id == current_user.id
    ).first()
    if not receipt:
        raise HTTPException(status_code=404, detail="Receipt not found")
    # Detach from any expenses before deleting to satisfy FK constraint
    db.query(Expense).filter(
        Expense.receipt_id == receipt_id,
        Expense.user_id == current_user.id,
    ).update({"receipt_id": None})
    db.flush()
    try:
        storage.delete(receipt.image_path)
    except Exception:
        pass
    db.delete(receipt)
    db.commit()
