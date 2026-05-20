from __future__ import annotations

from typing import Any


def test_list_radicals_sorted(client, db):
    db.radicals.delete_many({})
    db.radicals.insert_many([
        {"_id": "r_a", "stroke_count": 5, "kanji_list": []},
        {"_id": "r_b", "stroke_count": 3, "kanji_list": []},
        {"_id": "r_c", "stroke_count": 4, "kanji_list": []},
    ])

    r = client.get("/api/radicals")
    assert r.status_code == 200
    items = r.json()
    assert [item["_id"] for item in items] == ["r_b", "r_c", "r_a"]


def test_list_radical_groups_by_strokes(client, db):
    db.radicals.delete_many({})
    db.radicals.insert_many([
        {"_id": "rad1", "stroke_count": 1, "kanji_list": ["日"]},
        {"_id": "rad2", "stroke_count": 2, "kanji_list": ["本"]},
        {"_id": "rad3", "stroke_count": 1, "kanji_list": ["人"]},
    ])

    r = client.get("/api/radicals/groups", params={"group_by": "strokes", "order": "asc", "buckets": 5})
    assert r.status_code == 200
    groups = r.json()
    # expecting groups for stroke counts 1 and 2
    counts = sorted({g["min"] for g in groups})
    assert counts == [1, 2]
    # ensure radicals appear in groups
    all_radicals = [rad for g in groups for rad in g["radicals"]]
    ids = {r["_id"] for r in all_radicals}
    assert ids >= {"rad1", "rad2", "rad3"}


def _find_by_label(items: list[dict[str, Any]], label: Any) -> dict[str, Any] | None:
    for it in items:
        if it.get("label") == label:
            return it
    return None


def test_read_chart_data_by_stroke_count_and_count(client, db):
    db.kanji.delete_many({})
    db.kanji.insert_many([
        {"literal": "A", "_id": "A", "stroke_count": 4, "freq": 10},
        {"literal": "B", "_id": "B", "stroke_count": 4, "freq": 5},
        {"literal": "C", "_id": "C", "stroke_count": 5, "freq": 20},
    ])

    r = client.get("/api/charts", params={"x_axis": "stroke_count", "y_axis": "count"})
    assert r.status_code == 200
    buckets = r.json()
    item4 = _find_by_label(buckets, 4)
    item5 = _find_by_label(buckets, 5)
    assert item4 is not None and item4["count"] == 2
    assert item5 is not None and item5["count"] == 1
