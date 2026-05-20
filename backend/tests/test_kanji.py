from __future__ import annotations

import pytest

from app.service.auth_service import create_admin_token


def make_payload(literal: str):
    return {
        "literal": literal,
        "meanings": [f"meaning-{literal}"],
        "radicals": ["日"],
        "readings": {"on": [f"on-{literal}"], "kun": []},
    }


def test_get_kanji_not_found(client):
    r = client.get("/api/kanji/不存在")
    assert r.status_code == 404


def test_create_kanji_requires_auth(client):
    r = client.post("/api/kanji", json=make_payload("新"))
    assert r.status_code == 401


def test_create_kanji_success(client, app, db):
    # prepare admin user
    db.users.insert_one({"username": "admin"})
    token = create_admin_token("admin", app.state.settings)

    payload = make_payload("新")
    r = client.post("/api/kanji", json=payload, headers={"Authorization": f"Bearer {token}"})

    assert r.status_code == 201
    body = r.json()
    assert body["literal"] == "新"
    assert body["radicals"] == ["日"]


def test_create_duplicate_returns_409(client, app, db):
    db.users.insert_one({"username": "admin"})
    token = create_admin_token("admin", app.state.settings)

    payload = make_payload("重")
    r1 = client.post("/api/kanji", json=payload, headers={"Authorization": f"Bearer {token}"})
    assert r1.status_code == 201

    r2 = client.post("/api/kanji", json=payload, headers={"Authorization": f"Bearer {token}"})
    assert r2.status_code == 409


def test_update_kanji_success(client, app, db):
    # insert existing kanji
    db.kanji.insert_one({"literal": "改", "_id": "改", "meanings": ["old"], "radicals": [], "readings": {"on": [], "kun": []}})
    db.users.insert_one({"username": "admin"})
    token = create_admin_token("admin", app.state.settings)

    payload = make_payload("改")
    r = client.put("/api/kanji/改", json=payload, headers={"Authorization": f"Bearer {token}"})
    assert r.status_code == 200
    body = r.json()
    assert body["literal"] == "改"
    # verify db updated
    stored = db.kanji.find_one({"literal": "改"})
    assert stored is not None
    assert stored.get("meanings") == ["meaning-改"]


def test_update_kanji_not_found_returns_404(client, app, db):
    db.users.insert_one({"username": "admin"})
    token = create_admin_token("admin", app.state.settings)

    payload = make_payload("不存在")
    r = client.put("/api/kanji/不存在", json=payload, headers={"Authorization": f"Bearer {token}"})
    assert r.status_code == 404


def test_create_kanji_validation_error(client, app, db):
    # missing meanings/radicals
    db.users.insert_one({"username": "admin"})
    token = create_admin_token("admin", app.state.settings)

    bad_payload = {"literal": "X"}
    r = client.post("/api/kanji", json=bad_payload, headers={"Authorization": f"Bearer {token}"})
    assert r.status_code == 400
