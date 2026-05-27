from fastapi import APIRouter, Cookie, Depends, HTTPException, Response
from sqlalchemy.orm import Session
from app.config import settings
from app.database import get_db
from app.models.user import User
from app.schemas.auth import RegisterRequest, LoginRequest, UserRead, ChangePasswordRequest, UpdateProfileRequest
from app.services.auth import (
    hash_password, verify_password,
    create_access_token, create_refresh_token, decode_token,
)
from app.api.deps import get_current_user
import jwt

router = APIRouter(prefix="/api/auth", tags=["auth"])

_COOKIE_OPTS = dict(httponly=True, samesite="lax", secure=settings.cookie_secure)


@router.post("/register", status_code=200)
def register(body: RegisterRequest, db: Session = Depends(get_db)):
    if not db.query(User).filter(User.email == body.email).first():
        user = User(
            email=body.email,
            password_hash=hash_password(body.password),
            display_name=body.email.split('@')[0],
        )
        db.add(user)
        db.commit()
    return {"detail": "If this email is not registered, your account has been created."}


@router.post("/login", response_model=UserRead)
def login(body: LoginRequest, response: Response, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == body.email).first()
    if not user or not verify_password(body.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    response.set_cookie("access_token", create_access_token(user.id),
                        max_age=900, path="/", **_COOKIE_OPTS)
    response.set_cookie("refresh_token", create_refresh_token(user.id),
                        max_age=86400 * 30, path="/api/auth/refresh", **_COOKIE_OPTS)
    return user


@router.post("/refresh", response_model=UserRead)
def refresh(
    response: Response,
    refresh_token: str | None = Cookie(default=None),
    db: Session = Depends(get_db),
):
    if not refresh_token:
        raise HTTPException(status_code=401, detail="No refresh token")
    try:
        payload = decode_token(refresh_token)
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid refresh token")
    if payload.get("type") != "refresh":
        raise HTTPException(status_code=401, detail="Wrong token type")
    user = db.query(User).filter(User.id == payload["sub"]).first()
    if not user or not user.is_active:
        raise HTTPException(status_code=401, detail="User not found")
    response.set_cookie("access_token", create_access_token(user.id),
                        max_age=900, path="/", **_COOKIE_OPTS)
    return user


@router.post("/logout")
def logout(response: Response):
    response.delete_cookie("access_token", path="/", **_COOKIE_OPTS)
    response.delete_cookie("refresh_token", path="/api/auth/refresh", **_COOKIE_OPTS)
    return {"detail": "Logged out"}


@router.get("/me", response_model=UserRead)
def get_me(current_user: User = Depends(get_current_user)):
    return current_user


@router.patch("/me", response_model=UserRead)
def update_profile(
    body: UpdateProfileRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    current_user.display_name = body.display_name.strip()
    db.commit()
    db.refresh(current_user)
    return current_user


@router.post("/change-password")
def change_password(
    body: ChangePasswordRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if not verify_password(body.current_password, current_user.password_hash):
        raise HTTPException(status_code=401, detail="Senha atual incorreta")
    if len(body.new_password) < 8:
        raise HTTPException(status_code=422, detail="A nova senha deve ter pelo menos 8 caracteres")
    current_user.password_hash = hash_password(body.new_password)
    db.commit()
    return {"detail": "Senha alterada com sucesso"}
