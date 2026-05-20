from __future__ import annotations

import base64
import hashlib

import pytest
from fastapi import HTTPException

from app.service.auth_service import parse_token, verify_password


def build_pbkdf2_hash(password: str, iterations: int = 1, salt: str = "salt") -> str:
    digest = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt.encode("utf-8"), iterations)
    encoded = base64.urlsafe_b64encode(digest).decode("ascii").rstrip("=")
    return f"pbkdf2_sha256${iterations}${salt}${encoded}"


def test_login_admin_rejects_invalid_password(client, db):
    db.users.insert_one(
        {
            "username": "admin",
            "password_hash": "pbkdf2_sha256$260000$salt$invalid",
        }
    )

    response = client.post("/api/auth/login", json={"username": "admin", "password": "wrong"})

    assert response.status_code == 401
    assert response.json()["detail"] == "Неверный логин или пароль администратора."


def test_login_admin_accepts_plain_password_current_contract(client, db):
    db.users.insert_one({"username": "admin", "password": "admin123"})

    response = client.post("/api/auth/login", json={"username": "admin", "password": "admin123"})

    assert response.status_code == 200
    body = response.json()
    assert body["username"] == "admin"
    assert body["token_type"] == "bearer"
    assert isinstance(body["access_token"], str)
    assert body["access_token"].count(".") == 1


def test_login_admin_supports_pbkdf2_hash(client, db):
    db.users.insert_one(
        {
            "username": "secure-admin",
            "password_hash": build_pbkdf2_hash("secret"),
        }
    )

    response = client.post("/api/auth/login", json={"username": "secure-admin", "password": "secret"})

    assert response.status_code == 200
    body = response.json()
    assert body["username"] == "secure-admin"
    assert body["token_type"] == "bearer"
    assert isinstance(body["access_token"], str)


def test_login_admin_rejects_unknown_user(client):
    response = client.post("/api/auth/login", json={"username": "missing", "password": "secret"})

    assert response.status_code == 401
    assert response.json()["detail"] == "Неверный логин или пароль администратора."


def test_verify_password_handles_plaintext_and_hashes():
    assert verify_password("admin123", {"password": "admin123"}) is True
    assert verify_password("admin123", {"password": "other"}) is False
    assert verify_password(None, {"password": "admin123"}) is False


def test_parse_token_rejects_invalid_signature(settings):
    token = "eyJzdWIiOiJhZG1pbiIsInJvbGUiOiJhZG1pbiIsImV4cCI6OTk5OTk5OTk5OX0.invalid"

    with pytest.raises(HTTPException) as error:
        parse_token(token, settings)

    assert getattr(error.value, "status_code", None) == 401