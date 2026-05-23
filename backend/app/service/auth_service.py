import base64
import hashlib
import hmac
import json
import time
from typing import Any

from fastapi import HTTPException
from pymongo.database import Database

from app.core.config import Settings


def encode_part(value: bytes) -> str:
    return base64.urlsafe_b64encode(value).decode("ascii").rstrip("=")


def decode_part(value: str) -> bytes:
    padding = "=" * (-len(value) % 4)
    return base64.urlsafe_b64decode(value + padding)


def sign_payload(payload: str, secret: str) -> str:
    signature = hmac.new(secret.encode("utf-8"), payload.encode("ascii"), hashlib.sha256).digest()
    return encode_part(signature)


def hash_password(password: str, salt: str = "kanji-lookup-admin", iterations: int = 120_000) -> str:
    digest = hashlib.pbkdf2_hmac(
        "sha256",
        password.encode("utf-8"),
        salt.encode("utf-8"),
        iterations,
    )
    return f"pbkdf2_sha256${iterations}${salt}${encode_part(digest)}"


def default_admin_user() -> dict[str, Any]:
    return {
        "username": "admin",
        "password_hash": hash_password("admin123"),
        "created_at": "2026-04-29T12:00:00Z",
    }


def create_admin_token(username: str, settings: Settings, ttl_seconds: int = 3600) -> str:
    payload = {
        "sub": username,
        "role": "admin",
        "exp": int(time.time()) + ttl_seconds,
    }
    encoded_payload = encode_part(json.dumps(payload, separators=(",", ":")).encode("utf-8"))
    signature = sign_payload(encoded_payload, settings.admin_token_secret)
    return f"{encoded_payload}.{signature}"


def parse_token(token: str, settings: Settings) -> dict[str, Any]:
    try:
        encoded_payload, signature = token.split(".", 1)
    except ValueError as error:
        raise HTTPException(status_code=401, detail="Некорректный токен администратора.") from error

    expected_signature = sign_payload(encoded_payload, settings.admin_token_secret)
    if not hmac.compare_digest(signature, expected_signature):
        raise HTTPException(status_code=401, detail="Некорректный токен администратора.")

    try:
        payload = json.loads(decode_part(encoded_payload))
    except (ValueError, json.JSONDecodeError) as error:
        raise HTTPException(status_code=401, detail="Некорректный токен администратора.") from error

    if payload.get("role") != "admin" or int(payload.get("exp", 0)) < int(time.time()):
        raise HTTPException(status_code=401, detail="Сессия администратора истекла.")

    return payload


def verify_password(password: str | None, user: dict[str, Any]) -> bool:
    if not password:
        return False

    stored_hash = user.get("password_hash")
    if isinstance(stored_hash, str) and stored_hash.startswith("pbkdf2_sha256$"):
        try:
            _, iterations, salt, expected = stored_hash.split("$", 3)
            digest = hashlib.pbkdf2_hmac(
                "sha256",
                password.encode("utf-8"),
                salt.encode("utf-8"),
                int(iterations),
            )
            actual = encode_part(digest)
            return hmac.compare_digest(actual, expected)
        except (TypeError, ValueError):
            return False

    return user.get("password") == password


def login_admin(db: Database, settings: Settings, username: str | None, password: str | None) -> dict[str, str]:
    user = db.users.find_one({"username": username})

    if not user or not verify_password(password, user):
        raise HTTPException(status_code=401, detail="Неверный логин или пароль администратора.")

    return {
        "username": user["username"],
        "access_token": create_admin_token(user["username"], settings),
        "token_type": "bearer",
    }


def require_admin_token(db: Database, settings: Settings, authorization: str | None) -> dict[str, Any]:
    if not authorization or not authorization.lower().startswith("bearer "):
        raise HTTPException(status_code=401, detail="Нужна авторизация администратора.")

    payload = parse_token(authorization.split(" ", 1)[1].strip(), settings)
    user = db.users.find_one({"username": payload.get("sub")})

    if not user:
        raise HTTPException(status_code=401, detail="Администратор не найден.")

    return {"username": user["username"]}
