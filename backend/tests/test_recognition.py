from __future__ import annotations

from dataclasses import dataclass


@dataclass(frozen=True)
class FakePrediction:
    literal: str
    probability: float


class FakeRecognizer:
    def predict(self, strokes, top_k=200):
        return [
            FakePrediction("学", 0.94),
            FakePrediction("火", 0.21),
        ][:top_k]


def test_recognize_uses_backend_model_candidates(client, app, db):
    app.state.recognizer = FakeRecognizer()
    db.kanji.insert_many(
        [
            {
                "_id": "学",
                "literal": "学",
                "unicode": "5b66",
                "stroke_count": 8,
                "freq": 63,
                "readings": {"on": ["ガク"], "kun": []},
                "meanings": ["study"],
                "radicals": ["子"],
                "words": [],
                "example_sentences": [],
                "kvg": {"stroke_paths": ["M1,1L8,8"]},
            },
            {
                "_id": "日",
                "literal": "日",
                "unicode": "65e5",
                "stroke_count": 4,
                "freq": 1,
                "readings": {"on": ["ニチ"], "kun": ["ひ"]},
                "meanings": ["day"],
                "radicals": ["日"],
                "words": [],
                "example_sentences": [],
                "kvg": {"stroke_paths": ["M1,1L8,8"]},
            },
        ]
    )

    response = client.post(
        "/api/recognize",
        json={"strokes": [[{"x": 10, "y": 10}, {"x": 80, "y": 80}]], "filters": {}},
    )

    assert response.status_code == 200
    body = response.json()
    assert body[0]["kanji"]["literal"] == "学"
    assert body[0]["score"] > 0


def test_recognize_respects_global_filters(client, app, db):
    app.state.recognizer = FakeRecognizer()
    db.kanji.insert_many(
        [
            {
                "_id": "学",
                "literal": "学",
                "unicode": "5b66",
                "stroke_count": 8,
                "freq": 63,
                "readings": {"on": ["ガク"], "kun": []},
                "meanings": ["study"],
                "radicals": ["子"],
                "words": [],
                "example_sentences": [],
                "kvg": {"stroke_paths": ["M1,1L8,8"]},
            },
            {
                "_id": "火",
                "literal": "火",
                "unicode": "706b",
                "stroke_count": 4,
                "freq": 574,
                "readings": {"on": ["カ"], "kun": ["ひ"]},
                "meanings": ["fire"],
                "radicals": ["火"],
                "words": [],
                "example_sentences": [],
                "kvg": {"stroke_paths": ["M1,1L8,8"]},
            },
        ]
    )

    response = client.post(
        "/api/recognize",
        json={
            "strokes": [[{"x": 10, "y": 10}, {"x": 80, "y": 80}]],
            "filters": {"strokeFrom": "4", "strokeTo": "4"},
        },
    )

    assert response.status_code == 200
    assert [item["kanji"]["literal"] for item in response.json()] == ["火"]
