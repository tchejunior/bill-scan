from fastapi import Cookie, Depends, HTTPException
from sqlalchemy.orm import Session
import jwt
from app.database import get_db
from app.models.user import User
from app.config import settings


def get_current_user(
    access_token: str | None = Cookie(default=None),
    db: Session = Depends(get_db),
) -> User:
    if not access_token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    try:
        payload = jwt.decode(
            access_token,
            settings.secret_key,
            algorithms=["HS256"],
            options={"require": ["exp", "sub"]},
        )
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")

    if payload.get("type") != "access":
        raise HTTPException(status_code=401, detail="Invalid token type")

    user = db.query(User).filter(User.id == payload["sub"]).first()
    if not user or user.is_active is False:
        raise HTTPException(status_code=401, detail="User not found")
    return user
