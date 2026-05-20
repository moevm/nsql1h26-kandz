from __future__ import annotations

from pathlib import Path

from app.core.config import get_settings


class PingDatabase:
    def __init__(self) -> None:
        self.commands: list[str] = []

    def command(self, name: str):
        self.commands.append(name)
        return {"ok": 1}


def test_get_settings_uses_environment(monkeypatch, tmp_path: Path):
    monkeypatch.setenv("MONGODB_URI", "mongodb://example:27017/")
    monkeypatch.setenv("DATABASE_NAME", "enterprise")
    monkeypatch.setenv("SEED_PATH", str(tmp_path / "seed.json"))
    monkeypatch.setenv("ADMIN_TOKEN_SECRET", "secret-from-env")

    settings = get_settings()

    assert settings.mongodb_uri == "mongodb://example:27017/"
    assert settings.database_name == "enterprise"
    assert settings.seed_path == tmp_path / "seed.json"
    assert settings.admin_token_secret == "secret-from-env"


def test_app_lifespan_populates_state(app):
    assert app.state.settings.database_name == "kandz_test"
    assert app.state.db.name == "kandz_test"
    assert app.state.client is not None


def test_health_endpoints_ping_database(client, app):
    ping_db = PingDatabase()
    app.state.db = ping_db

    response = client.get("/api/health")

    assert response.status_code == 200
    assert response.json() == {"status": "ok"}
    assert ping_db.commands == ["ping"]

    ping_db.commands.clear()

    response = client.get("/health")

    assert response.status_code == 200
    assert response.json() == {"status": "ok"}
    assert ping_db.commands == ["ping"]