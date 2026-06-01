from __future__ import annotations

from typing import Any

from pymongo.database import Database

from app.data import kanji_repository as kanji_repo
from app.ml.recognizer import KanjiCnnRecognizer, RecognitionPrediction
from app.ml.stroke_preprocessing import clean_strokes


DEFAULT_RECOGNITION_LIMIT = 24
MAX_RECOGNITION_LIMIT = 48


def _recognition_limit(payload: Any) -> int:
    if not isinstance(payload, dict):
        return DEFAULT_RECOGNITION_LIMIT

    try:
        requested = int(payload.get("limit", DEFAULT_RECOGNITION_LIMIT))
    except (TypeError, ValueError):
        requested = DEFAULT_RECOGNITION_LIMIT

    return max(1, min(requested, MAX_RECOGNITION_LIMIT))


def _model_candidates(
    db: Database,
    query: dict[str, Any],
    predictions: list[RecognitionPrediction],
    expected_strokes: int,
) -> list[dict[str, Any]]:
    prediction_by_literal = {item.literal: item for item in predictions}
    documents = kanji_repo.kanji_by_literals(db, query, list(prediction_by_literal))
    ranked: list[dict[str, Any]] = []

    for document in documents:
        prediction = prediction_by_literal.get(document["literal"])
        if not prediction:
            continue

        stroke_count = document.get("stroke_count") or expected_strokes
        frequency = document.get("freq") or 3000
        stroke_penalty = abs(stroke_count - expected_strokes) * 0.5
        frequency_bonus = max(0.0, 6.0 - frequency / 500)
        score = max(1, min(100, round(70 + prediction.probability * 30 + frequency_bonus - stroke_penalty)))
        rank_score = (
            10_000
            + prediction.probability * 1_000
            + frequency_bonus
            - stroke_penalty
        )
        ranked.append({"kanji": document, "score": score, "_rank_score": rank_score})

    ranked.sort(
        key=lambda item: (
            -item["_rank_score"],
            item["kanji"].get("freq") or 999_999_999,
            item["kanji"]["literal"],
        )
    )
    return ranked


def _merge_recognition_results(*groups: list[dict[str, Any]], limit: int = DEFAULT_RECOGNITION_LIMIT) -> list[dict[str, Any]]:
    merged: dict[str, dict[str, Any]] = {}

    for group in groups:
        for item in group:
            literal = item.get("kanji", {}).get("literal")
            if not literal:
                continue

            current = merged.get(literal)
            item_rank = item.get("_rank_score", item.get("score", 0))
            current_rank = current.get("_rank_score", current.get("score", 0)) if current else 0
            if not current or item_rank > current_rank:
                merged[literal] = item

    ranked = sorted(
        merged.values(),
        key=lambda item: (
            -item.get("_rank_score", item.get("score", 0)),
            item.get("kanji", {}).get("freq") or 999_999_999,
            item.get("kanji", {}).get("literal") or "",
        ),
    )[:limit]

    for item in ranked:
        item.pop("_rank_score", None)

    return ranked


def recognize_drawing(
    db: Database,
    payload: Any,
    recognizer: KanjiCnnRecognizer | None = None,
) -> list[dict[str, Any]]:
    strokes = payload.get("strokes") if isinstance(payload, dict) else []
    filters = payload.get("filters") if isinstance(payload, dict) and isinstance(payload.get("filters"), dict) else {}
    clean = clean_strokes(strokes)

    if not clean:
        return []

    point_count = sum(len(stroke) for stroke in clean)
    if point_count < 2:
        return []

    expected_strokes = max(1, min(30, len(clean)))
    limit = _recognition_limit(payload)
    query = kanji_repo.kanji_filter_query(
        stroke_from=kanji_repo.optional_int(filters.get("strokeFrom")),
        stroke_to=kanji_repo.optional_int(filters.get("strokeTo")),
        jlpt_levels=",".join(filters.get("jlptLevels", [])) if isinstance(filters.get("jlptLevels"), list) else None,
        grade_levels=",".join(filters.get("gradeLevels", [])) if isinstance(filters.get("gradeLevels"), list) else None,
        freq_from=kanji_repo.optional_int(filters.get("freqFrom")),
        freq_to=kanji_repo.optional_int(filters.get("freqTo")),
        words_from=kanji_repo.optional_int(filters.get("wordsFrom")),
        words_to=kanji_repo.optional_int(filters.get("wordsTo")),
        examples_from=kanji_repo.optional_int(filters.get("examplesFrom")),
        examples_to=kanji_repo.optional_int(filters.get("examplesTo")),
        radicals_from=kanji_repo.optional_int(filters.get("radicalsFrom")),
        radicals_to=kanji_repo.optional_int(filters.get("radicalsTo")),
        readings_from=kanji_repo.optional_int(filters.get("readingsFrom")),
        readings_to=kanji_repo.optional_int(filters.get("readingsTo")),
        has_animation=bool(filters.get("hasAnimation")),
    )
    predictions: list[RecognitionPrediction] = []

    if recognizer:
        predictions = recognizer.predict(clean, top_k=300)

    neural_candidates = _model_candidates(db, query, predictions, expected_strokes) if predictions else []
    fallback_candidates = kanji_repo.recognition_candidates(db, query, expected_strokes, limit=24)
    return _merge_recognition_results(neural_candidates, fallback_candidates, limit=limit)
