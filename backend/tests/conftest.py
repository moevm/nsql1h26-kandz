from __future__ import annotations

import sys
from pathlib import Path

import mongomock
import pytest
from fastapi.testclient import TestClient
from httpx import ASGITransport, AsyncClient


BACKEND_ROOT = Path(__file__).resolve().parents[1]
if str(BACKEND_ROOT) not in sys.path:
    sys.path.insert(0, str(BACKEND_ROOT))


from app import main as app_module
from app.core.config import Settings


@pytest.fixture()
def settings(tmp_path: Path) -> Settings:
    return Settings(
        mongodb_uri="mongodb://test",
        database_name="kandz_test",
        seed_path=tmp_path / "seed.json",
        admin_token_secret="test-secret",
        recognition_enabled=False,
    )


@pytest.fixture()
def mongo_client() -> mongomock.MongoClient:
    return mongomock.MongoClient()


@pytest.fixture()
def db(settings: Settings, mongo_client: mongomock.MongoClient):
    return mongo_client[settings.database_name]


@pytest.fixture()
def app(settings: Settings, mongo_client: mongomock.MongoClient, monkeypatch: pytest.MonkeyPatch):
    monkeypatch.setattr(app_module, "get_settings", lambda: settings)
    monkeypatch.setattr(app_module, "create_client", lambda _settings: mongo_client)
    monkeypatch.setattr(app_module, "create_indexes", lambda _db: None)
    monkeypatch.setattr(app_module, "seed_database", lambda _db, _settings: None)
    return app_module.app


@pytest.fixture()
def client(app):
    with TestClient(app) as test_client:
        yield test_client


@pytest.fixture()
async def async_client(app):
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://testserver") as test_client:
        yield test_client
