from typing import Any

from fastapi import HTTPException
from pymongo.database import Database

from app.data import kanji_repository as kanji_repo
from app.ml.recognizer import KanjiCnnRecognizer, RecognitionPrediction
from app.ml.stroke_preprocessing import Stroke, clean_strokes
from app.service.validation import validate_kanji


def search_kanji(
    db: Database,
    *,
    text: str | None = None,
    radicals: str | None = None,
    stroke_count: int | None = None,
    grade: int | None = None,
    jlpt: int | None = None,
    stroke_from: int | None = None,
    stroke_to: int | None = None,
    jlpt_levels: str | None = None,
    grade_levels: str | None = None,
    freq_from: int | None = None,
    freq_to: int | None = None,
    words_from: int | None = None,
    words_to: int | None = None,
    examples_from: int | None = None,
    examples_to: int | None = None,
    radicals_from: int | None = None,
    radicals_to: int | None = None,
    readings_from: int | None = None,
    readings_to: int | None = None,
    has_animation: bool = False,
    limit: int = 48,
) -> list[dict[str, Any]]:
    query = kanji_repo.kanji_filter_query(
        text=text,
        radicals=radicals,
        stroke_count=stroke_count,
        grade=grade,
        jlpt=jlpt,
        stroke_from=stroke_from,
        stroke_to=stroke_to,
        jlpt_levels=jlpt_levels,
        grade_levels=grade_levels,
        freq_from=freq_from,
        freq_to=freq_to,
        words_from=words_from,
        words_to=words_to,
        examples_from=examples_from,
        examples_to=examples_to,
        radicals_from=radicals_from,
        radicals_to=radicals_to,
        readings_from=readings_from,
        readings_to=readings_to,
        has_animation=has_animation,
    )
    return kanji_repo.search_kanji(db, query, limit, text)


def read_kanji_page(
    db: Database,
    *,
    literal: str | None = None,
    meaning: str | None = None,
    radical: str | None = None,
    stroke_count: int | None = None,
    grade: int | None = None,
    jlpt: int | None = None,
    page: int,
    page_size: int,
) -> dict[str, Any]:
    query = kanji_repo.table_filter_query(
        literal=literal,
        meaning=meaning,
        radical=None,
        stroke_count=stroke_count,
        grade=grade,
        jlpt=jlpt,
    )
    radical_condition = kanji_repo.radical_filter_condition(db, radical)

    if radical_condition:
        query["radicals"] = radical_condition

    return kanji_repo.read_kanji_page(db, query, page, page_size)


def read_search_page(
    db: Database,
    *,
    text: str | None = None,
    radicals: str | None = None,
    stroke_count: int | None = None,
    grade: int | None = None,
    jlpt: int | None = None,
    stroke_from: int | None = None,
    stroke_to: int | None = None,
    jlpt_levels: str | None = None,
    grade_levels: str | None = None,
    freq_from: int | None = None,
    freq_to: int | None = None,
    words_from: int | None = None,
    words_to: int | None = None,
    examples_from: int | None = None,
    examples_to: int | None = None,
    radicals_from: int | None = None,
    radicals_to: int | None = None,
    readings_from: int | None = None,
    readings_to: int | None = None,
    has_animation: bool = False,
    page: int,
    page_size: int,
) -> dict[str, Any]:
    query = kanji_repo.kanji_filter_query(
        text=text,
        radicals=radicals,
        stroke_count=stroke_count,
        grade=grade,
        jlpt=jlpt,
        stroke_from=stroke_from,
        stroke_to=stroke_to,
        jlpt_levels=jlpt_levels,
        grade_levels=grade_levels,
        freq_from=freq_from,
        freq_to=freq_to,
        words_from=words_from,
        words_to=words_to,
        examples_from=examples_from,
        examples_to=examples_to,
        radicals_from=radicals_from,
        radicals_to=radicals_to,
        readings_from=readings_from,
        readings_to=readings_to,
        has_animation=has_animation,
    )
    return kanji_repo.read_search_page(db, query, page, page_size, text)


def get_kanji_or_404(db: Database, literal: str) -> dict[str, Any]:
    kanji = kanji_repo.get_by_literal(db, literal)

    if not kanji:
        raise HTTPException(status_code=404, detail="Иероглиф не найден в базе данных.")

    return kanji


def create_kanji(db: Database, payload: Any) -> dict[str, Any]:
    kanji = validate_kanji(payload)
    kanji["radicals"] = kanji_repo.resolve_radical_values(db, kanji.get("radicals", []))

    if db.kanji.find_one({"literal": kanji["literal"]}):
        raise HTTPException(status_code=409, detail="Такой иероглиф уже есть в базе.")

    return kanji_repo.create_kanji(db, kanji)


def update_kanji(db: Database, literal: str, payload: Any) -> dict[str, Any]:
    kanji = validate_kanji(payload)
    kanji["literal"] = literal
    kanji["_id"] = literal
    kanji["radicals"] = kanji_repo.resolve_radical_values(db, kanji.get("radicals", []))

    if not kanji_repo.replace_kanji(db, literal, kanji):
        raise HTTPException(status_code=404, detail="Иероглиф не найден в базе данных.")

    return kanji


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
        ranked.append({"kanji": document, "score": score})

    ranked.sort(key=lambda item: (-item["score"], item["kanji"].get("freq") or 999_999_999, item["kanji"]["literal"]))
    return ranked


def _merge_recognition_results(*groups: list[dict[str, Any]], limit: int = 48) -> list[dict[str, Any]]:
    merged: dict[str, dict[str, Any]] = {}

    for group in groups:
        for item in group:
            literal = item.get("kanji", {}).get("literal")
            if not literal:
                continue

            current = merged.get(literal)
            if not current or item.get("score", 0) > current.get("score", 0):
                merged[literal] = item

    return sorted(
        merged.values(),
        key=lambda item: (
            -item.get("score", 0),
            item.get("kanji", {}).get("freq") or 999_999_999,
            item.get("kanji", {}).get("literal") or "",
        ),
    )[:limit]


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
    return _merge_recognition_results(neural_candidates, fallback_candidates, limit=48)


def read_statistics(
    db: Database,
    *,
    axis: str,
    text: str | None = None,
    radicals: str | None = None,
    stroke_count: int | None = None,
    grade: int | None = None,
    jlpt: int | None = None,
    stroke_from: int | None = None,
    stroke_to: int | None = None,
    jlpt_levels: str | None = None,
    grade_levels: str | None = None,
    freq_from: int | None = None,
    freq_to: int | None = None,
    words_from: int | None = None,
    words_to: int | None = None,
    examples_from: int | None = None,
    examples_to: int | None = None,
    radicals_from: int | None = None,
    radicals_to: int | None = None,
    readings_from: int | None = None,
    readings_to: int | None = None,
    has_animation: bool = False,
) -> list[dict[str, Any]]:
    query = kanji_repo.kanji_filter_query(
        text=text,
        radicals=radicals,
        stroke_count=stroke_count,
        grade=grade,
        jlpt=jlpt,
        stroke_from=stroke_from,
        stroke_to=stroke_to,
        jlpt_levels=jlpt_levels,
        grade_levels=grade_levels,
        freq_from=freq_from,
        freq_to=freq_to,
        words_from=words_from,
        words_to=words_to,
        examples_from=examples_from,
        examples_to=examples_to,
        radicals_from=radicals_from,
        radicals_to=radicals_to,
        readings_from=readings_from,
        readings_to=readings_to,
        has_animation=has_animation,
    )
    return kanji_repo.statistics(db, query, axis)


def read_chart_data(
    db: Database,
    *,
    x_axis: str,
    y_axis: str,
    text: str | None = None,
    radicals: str | None = None,
    stroke_count: int | None = None,
    grade: int | None = None,
    jlpt: int | None = None,
    stroke_from: int | None = None,
    stroke_to: int | None = None,
    jlpt_levels: str | None = None,
    grade_levels: str | None = None,
    freq_from: int | None = None,
    freq_to: int | None = None,
    words_from: int | None = None,
    words_to: int | None = None,
    examples_from: int | None = None,
    examples_to: int | None = None,
    radicals_from: int | None = None,
    radicals_to: int | None = None,
    readings_from: int | None = None,
    readings_to: int | None = None,
    has_animation: bool = False,
) -> list[dict[str, Any]]:
    query = kanji_repo.kanji_filter_query(
        text=text,
        radicals=radicals,
        stroke_count=stroke_count,
        grade=grade,
        jlpt=jlpt,
        stroke_from=stroke_from,
        stroke_to=stroke_to,
        jlpt_levels=jlpt_levels,
        grade_levels=grade_levels,
        freq_from=freq_from,
        freq_to=freq_to,
        words_from=words_from,
        words_to=words_to,
        examples_from=examples_from,
        examples_to=examples_to,
        radicals_from=radicals_from,
        radicals_to=radicals_to,
        readings_from=readings_from,
        readings_to=readings_to,
        has_animation=has_animation,
    )
    return kanji_repo.chart_data(db, query, x_axis, y_axis)
