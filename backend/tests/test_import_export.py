from __future__ import annotations

import json

from app.service.auth_service import create_admin_token


def test_export_returns_snapshot(client, db):
    db.kanji.delete_many({})
    db.radicals.delete_many({})
    db.users.delete_many({})

    db.kanji.insert_one({"literal": "日", "_id": "日"})
    db.radicals.insert_one({"_id": "日", "stroke_count": 4, "kanji_list": ["日"]})
    db.users.insert_one({"username": "admin"})

    r = client.get("/api/export")
    assert r.status_code == 200
    assert "Content-Disposition" in r.headers
    data = r.json()
    assert isinstance(data.get("kanji"), list)
    assert isinstance(data.get("radicals"), list)
    assert isinstance(data.get("users"), list)
    assert "updated_at" in data


def test_import_requires_authorization(client):
    payload = json.dumps({"kanji": [], "radicals": [], "users": []})
    r = client.post("/api/import", files={"file": ("db.json", payload, "application/json")})
    assert r.status_code == 401


def test_import_rollback_on_invalid_json(client, app, db):
    # prepare data
    db.kanji.delete_many({})
    db.kanji.insert_one({"literal": "A", "_id": "A"})
    db.users.insert_one({"username": "admin"})
    token = create_admin_token("admin", app.state.settings)

    bad_payload = "not a json"

    r = client.post(
        "/api/import",
        files={"file": ("db.json", bad_payload, "application/json")},
        headers={"Authorization": f"Bearer {token}"},
    )

    assert r.status_code == 400
    # original data restored
    assert db.kanji.find_one({"literal": "A"}) is not None


def test_import_success_saves_schema(client, app, db):
    db.kanji.delete_many({})
    db.radicals.delete_many({})
    db.users.delete_many({})

    db.users.insert_one({"username": "admin"})
    token = create_admin_token("admin", app.state.settings)

    database = {
        "updated_at": "2020-01-01T00:00:00Z",
        "kanji": [
            {"literal": "Z", "_id": "Z", "meanings": [], "radicals": [], "readings": {"on": [], "kun": []}}
        ],
        "radicals": [{"_id": "r", "stroke_count": 1, "kanji_list": ["Z"]}],
        "users": [{"username": "admin"}],
    }

    payload = json.dumps(database)

    r = client.post(
        "/api/import",
        files={"file": ("db.json", payload, "application/json")},
        headers={"Authorization": f"Bearer {token}"},
    )

    assert r.status_code == 200
    body = r.json()
    assert body.get("status") == "ok"

    # verify data persisted
    assert db.kanji.count_documents({}) == 1
    assert db.radicals.count_documents({}) == 1
    meta = db.meta.find_one({"_id": "database"})
    assert meta is not None and meta.get("updated_at") == database["updated_at"]
