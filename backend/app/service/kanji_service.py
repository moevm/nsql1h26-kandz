from typing import Any

from fastapi import HTTPException
from pymongo.database import Database

from app.data import kanji_repository as kanji_repo
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
