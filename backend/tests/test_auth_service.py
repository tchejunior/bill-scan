from app.services.auth import (
    hash_password, verify_password,
    create_access_token, create_refresh_token, decode_token,
)
from app.config import settings
import uuid
import pytest


def test_hash_and_verify_password():
    hashed = hash_password("mysecret")
    assert hashed != "mysecret"
    assert verify_password("mysecret", hashed)
    assert not verify_password("wrongpassword", hashed)


def test_create_and_decode_access_token():
    user_id = uuid.uuid4()
    token = create_access_token(user_id)
    payload = decode_token(token)
    assert payload["sub"] == str(user_id)
    assert payload["type"] == "access"


def test_create_and_decode_refresh_token():
    user_id = uuid.uuid4()
    token = create_refresh_token(user_id)
    payload = decode_token(token)
    assert payload["sub"] == str(user_id)
    assert payload["type"] == "refresh"


def test_decode_invalid_token_raises():
    import jwt
    with pytest.raises(jwt.InvalidTokenError):
        decode_token("not.a.valid.token")


def test_decode_expired_token_raises():
    import jwt as pyjwt
    from datetime import datetime, timedelta, timezone
    user_id = uuid.uuid4()
    payload = {
        "sub": str(user_id),
        "exp": datetime.now(timezone.utc) - timedelta(seconds=1),
        "type": "access",
    }
    expired_token = pyjwt.encode(payload, settings.secret_key, algorithm="HS256")
    with pytest.raises(pyjwt.ExpiredSignatureError):
        decode_token(expired_token)


def test_decode_tampered_token_raises():
    import jwt as pyjwt
    user_id = uuid.uuid4()
    token = create_access_token(user_id)
    tampered = token[:-4] + "xxxx"
    with pytest.raises(pyjwt.InvalidTokenError):
        decode_token(tampered)
