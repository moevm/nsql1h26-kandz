from __future__ import annotations

import pytest


def make_kanji(literal: str, stroke_count: int = 5, jlpt: int | None = None, grade: int | None = None, radicals: list[str] | None = None, freq: int | None = None):
    return {
        "literal": literal,
        "_id": literal,
        "stroke_count": stroke_count,
        "jlpt": jlpt,
        "grade": grade,
        "radicals": radicals or [],
        "meanings": [f"meaning-{literal}"],
        "readings": {"on": [f"on-{literal}"], "kun": []},
        "freq": freq,
    }


@pytest.fixture()
def sample_kanji(db):
    docs = [
        make_kanji("日", stroke_count=4, jlpt=5, grade=1, radicals=["日"], freq=10),
        make_kanji("本", stroke_count=5, jlpt=5, grade=1, radicals=["木"], freq=20),
        make_kanji("人", stroke_count=2, jlpt=5, grade=1, radicals=["人"], freq=30),
        make_kanji("学", stroke_count=8, jlpt=4, grade=2, radicals=["子"], freq=40),
    ]
    db.kanji.delete_many({})
    db.kanji.insert_many(docs)
    return docs


def test_search_by_text(client, sample_kanji):
    r = client.get("/api/search", params={"text": "本"})
    assert r.status_code == 200
    items = r.json()
    assert any(item["literal"] == "本" for item in items)


def test_search_by_radicals(client, sample_kanji):
    r = client.get("/api/search", params={"radicals": "木"})
    assert r.status_code == 200
    items = r.json()
    assert all("木" in item.get("radicals", []) for item in items)


def test_search_by_stroke_count(client, sample_kanji):
    r = client.get("/api/search", params={"stroke_count": 5})
    assert r.status_code == 200
    items = r.json()
    assert all(item.get("stroke_count") == 5 for item in items)


def test_search_by_jlpt_and_grade(client, sample_kanji):
    r = client.get("/api/search", params={"jlpt": 5, "grade": 1})
    assert r.status_code == 200
    items = r.json()
    assert all(item.get("jlpt") == 5 and item.get("grade") == 1 for item in items)


def test_search_pagination(client, sample_kanji):
    # page endpoint returns items and paging metadata
    r = client.get("/api/search/page", params={"page": 1, "page_size": 2})
    assert r.status_code == 200
    body = r.json()
    assert body["page"] == 1
    assert body["page_size"] == 2
    assert len(body["items"]) <= 2


def test_search_empty_results(client, db):
    db.kanji.delete_many({})
    r = client.get("/api/search", params={"text": "nonexistent"})
    assert r.status_code == 200
    assert r.json() == []


def test_search_invalid_params_returns_422(client):
    r = client.get("/api/search", params={"limit": 9999})
    assert r.status_code == 422
