import re
from math import ceil
from typing import Any

from pymongo import ASCENDING, DESCENDING
from pymongo.database import Database

from app.data.database import sync_radicals, touch_database
from app.data.serialization import serialize_document


def split_values(value: str | None) -> list[str]:
    if not value:
        return []

    return [item.strip() for item in value.split(",") if item.strip()]


def optional_int(value: Any) -> int | None:
    if value is None or value == "":
        return None

    try:
        return int(value)
    except (TypeError, ValueError):
        return None


def contains_query(value: str | None) -> dict[str, Any] | None:
    if not value or not value.strip():
        return None

    return {"$regex": re.escape(value.strip()), "$options": "i"}


def kanji_filter_query(
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
) -> dict[str, Any]:
    query: dict[str, Any] = {}
    radical_values = split_values(radicals)
    jlpt_values = split_values(jlpt_levels)
    grade_values = split_values(grade_levels)
    text_regex = contains_query(text)
    expr_filters: list[dict[str, Any]] = []

    if text_regex:
        query["$or"] = [
            {"literal": text_regex},
            {"unicode": text_regex},
            {"meanings": text_regex},
            {"readings.on": text_regex},
            {"readings.kun": text_regex},
            {"readings.nanori": text_regex},
            {"words.word": text_regex},
            {"words.reading": text_regex},
            {"words.meanings": text_regex},
        ]

    if radical_values:
        query["radicals"] = {"$all": radical_values}

    if stroke_count is not None:
        query["stroke_count"] = stroke_count

    if grade is not None:
        query["grade"] = grade

    if jlpt is not None:
        query["jlpt"] = jlpt

    stroke_range: dict[str, int] = {}
    if stroke_from is not None:
        stroke_range["$gte"] = stroke_from
    if stroke_to is not None:
        stroke_range["$lte"] = stroke_to
    if stroke_range and "stroke_count" not in query:
        query["stroke_count"] = stroke_range

    freq_range: dict[str, int] = {}
    if freq_from is not None:
        freq_range["$gte"] = freq_from
    if freq_to is not None:
        freq_range["$lte"] = freq_to
    if freq_range:
        query["freq"] = freq_range

    if has_animation:
        query["kvg.stroke_paths.0"] = {"$exists": True}

    if jlpt_values:
        parsed_jlpt: list[int | None] = []
        for level in jlpt_values:
            if level == "none":
                parsed_jlpt.append(None)
            elif level.isdigit():
                parsed_jlpt.append(int(level))
        query["jlpt"] = {"$in": parsed_jlpt}

    if grade_values:
        parsed_grades: list[int | None] = []
        for level in grade_values:
            if level == "none":
                parsed_grades.append(None)
            elif level.isdigit():
                parsed_grades.append(int(level))
        query["grade"] = {"$in": parsed_grades}

    words_size = {"$size": {"$ifNull": ["$words", []]}}
    examples_size = {"$size": {"$ifNull": ["$example_sentences", []]}}
    radicals_size = {"$size": {"$ifNull": ["$radicals", []]}}
    readings_size = {
        "$add": [
            {"$size": {"$ifNull": ["$readings.on", []]}},
            {"$size": {"$ifNull": ["$readings.kun", []]}},
            {"$size": {"$ifNull": ["$readings.nanori", []]}},
        ]
    }

    if words_from is not None:
        expr_filters.append({"$gte": [words_size, words_from]})
    if words_to is not None:
        expr_filters.append({"$lte": [words_size, words_to]})
    if examples_from is not None:
        expr_filters.append({"$gte": [examples_size, examples_from]})
    if examples_to is not None:
        expr_filters.append({"$lte": [examples_size, examples_to]})
    if radicals_from is not None:
        expr_filters.append({"$gte": [radicals_size, radicals_from]})
    if radicals_to is not None:
        expr_filters.append({"$lte": [radicals_size, radicals_to]})
    if readings_from is not None:
        expr_filters.append({"$gte": [readings_size, readings_from]})
    if readings_to is not None:
        expr_filters.append({"$lte": [readings_size, readings_to]})

    if expr_filters:
        query["$expr"] = expr_filters[0] if len(expr_filters) == 1 else {"$and": expr_filters}

    return query


def table_filter_query(
    *,
    literal: str | None = None,
    meaning: str | None = None,
    radical: str | None = None,
    stroke_count: int | None = None,
    grade: int | None = None,
    jlpt: int | None = None,
) -> dict[str, Any]:
    query: dict[str, Any] = {}
    literal_regex = contains_query(literal)
    meaning_regex = contains_query(meaning)
    radical_regex = contains_query(radical)

    if literal_regex:
        query["literal"] = literal_regex
    if meaning_regex:
        query["meanings"] = meaning_regex
    if radical_regex:
        query["radicals"] = radical_regex
    if stroke_count is not None:
        query["stroke_count"] = stroke_count
    if grade is not None:
        query["grade"] = grade
    if jlpt is not None:
        query["jlpt"] = jlpt

    return query


def radical_ids_by_text(db: Database, value: str | None) -> list[str]:
    radical_regex = contains_query(value)

    if not radical_regex:
        return []

    matches: list[str] = [
        item["_id"]
        for item in db.radicals.find(
            {"$or": [{"_id": radical_regex}, {"meaning": radical_regex}]},
            {"_id": 1},
        )
    ]
    kanji_literals = [
        item["literal"]
        for item in db.kanji.find(
            {
                "$or": [
                    {"literal": radical_regex},
                    {"meanings": radical_regex},
                    {"readings.on": radical_regex},
                    {"readings.kun": radical_regex},
                    {"readings.nanori": radical_regex},
                ]
            },
            {"literal": 1},
        ).limit(50)
    ]

    if kanji_literals:
        matches.extend(
            item["_id"]
            for item in db.radicals.find({"_id": {"$in": kanji_literals}}, {"_id": 1})
        )

    return list(dict.fromkeys(matches))


def radical_filter_condition(db: Database, value: str | None) -> dict[str, Any] | None:
    radical_regex = contains_query(value)

    if not radical_regex:
        return None

    matches = radical_ids_by_text(db, value)

    if matches:
        return {"$in": matches}

    return radical_regex


def resolve_radical_values(db: Database, values: list[str]) -> list[str]:
    resolved: list[str] = []

    for value in values:
        matches = radical_ids_by_text(db, value)
        resolved.extend(matches or [value])

    return list(dict.fromkeys(resolved))


def kanji_sort_pipeline(exact_text: str | None = None) -> list[dict[str, Any]]:
    pipeline: list[dict[str, Any]] = []
    sort_fields: dict[str, Any] = {"_sort_freq": ASCENDING, "literal": ASCENDING}
    project_fields: dict[str, Any] = {"_sort_freq": 0}

    if exact_text:
        pipeline.append(
            {
                "$addFields": {
                    "_exact_literal": {
                        "$cond": [{"$eq": ["$literal", exact_text.strip()]}, 0, 1]
                    }
                }
            }
        )
        sort_fields = {"_exact_literal": ASCENDING, **sort_fields}
        project_fields["_exact_literal"] = 0

    pipeline.extend(
        [
            {"$addFields": {"_sort_freq": {"$ifNull": ["$freq", 999_999_999]}}},
            {"$sort": sort_fields},
            {"$project": project_fields},
        ]
    )
    return pipeline


def aggregate_kanji(
    db: Database,
    query: dict[str, Any],
    extra: list[dict[str, Any]] | None = None,
    exact_text: str | None = None,
) -> list[dict[str, Any]]:
    pipeline: list[dict[str, Any]] = [{"$match": query}, *kanji_sort_pipeline(exact_text)]
    if extra:
        pipeline.extend(extra)
    return [serialize_document(item) for item in db.kanji.aggregate(pipeline)]


def list_radicals(db: Database) -> list[dict[str, Any]]:
    return [serialize_document(item) for item in db.radicals.find({}).sort("stroke_count", ASCENDING)]


def _radical_usage_expression() -> dict[str, Any]:
    return {"$size": {"$ifNull": ["$kanji_list", []]}}


def _radical_count_label(low: int, high: int) -> str:
    if low == high:
        return f"{low} \u043a\u0430\u043d\u0434\u0437\u0438"

    return f"{low}-{high} \u043a\u0430\u043d\u0434\u0437\u0438"


def _stroke_label(count: int) -> str:
    if count % 10 == 1 and count % 100 != 11:
        word = "\u0447\u0435\u0440\u0442\u0430"
    elif count % 10 in (2, 3, 4) and count % 100 not in (12, 13, 14):
        word = "\u0447\u0435\u0440\u0442\u044b"
    else:
        word = "\u0447\u0435\u0440\u0442"

    return f"{count} {word}"


def _serialize_radical_group(group: dict[str, Any], group_by: str, index: int) -> dict[str, Any]:
    low = int(group.get("min", 0))
    high = int(group.get("max", low))
    label = _stroke_label(low) if group_by == "strokes" else _radical_count_label(low, high)

    return {
        "id": f"{group_by}-{index}-{low}-{high}",
        "label": label,
        "min": low,
        "max": high,
        "count": int(group.get("count", 0)),
        "radicals": [serialize_document(item) for item in group.get("radicals", [])],
    }


def list_radical_groups(
    db: Database,
    group_by: str = "usage",
    order: str = "desc",
    buckets: int = 5,
) -> list[dict[str, Any]]:
    sort_direction = DESCENDING if order == "desc" else ASCENDING

    if group_by == "strokes":
        pipeline = [
            {"$addFields": {"usage_count": _radical_usage_expression()}},
            {"$sort": {"stroke_count": sort_direction, "_id": ASCENDING}},
            {
                "$group": {
                    "_id": "$stroke_count",
                    "min": {"$min": "$stroke_count"},
                    "max": {"$max": "$stroke_count"},
                    "count": {"$sum": 1},
                    "radicals": {"$push": "$$ROOT"},
                }
            },
            {"$sort": {"_id": sort_direction}},
        ]
    else:
        pipeline = [
            {"$addFields": {"usage_count": _radical_usage_expression()}},
            {
                "$bucketAuto": {
                    "groupBy": "$usage_count",
                    "buckets": max(1, min(buckets, 10)),
                    "output": {
                        "count": {"$sum": 1},
                        "min": {"$min": "$usage_count"},
                        "max": {"$max": "$usage_count"},
                        "radicals": {"$push": "$$ROOT"},
                    },
                }
            },
        ]

    groups = list(db.radicals.aggregate(pipeline))
    groups.sort(key=lambda item: (item.get("max", 0), item.get("min", 0)), reverse=order == "desc")

    for group in groups:
        metric = "stroke_count" if group_by == "strokes" else "usage_count"
        group["radicals"].sort(
            key=lambda item: (
                -item.get(metric, 0) if order == "desc" else item.get(metric, 0),
                item.get("_id", ""),
            ),
        )

    return [_serialize_radical_group(group, group_by, index) for index, group in enumerate(groups)]


def search_kanji(
    db: Database,
    query: dict[str, Any],
    limit: int = 48,
    exact_text: str | None = None,
) -> list[dict[str, Any]]:
    return aggregate_kanji(db, query, [{"$limit": max(1, min(limit, 100))}], exact_text)


def read_kanji_page(db: Database, query: dict[str, Any], page: int, page_size: int) -> dict[str, Any]:
    total = db.kanji.count_documents(query)
    total_pages = max(1, ceil(total / page_size))
    current_page = min(page, total_pages)
    start = (current_page - 1) * page_size

    return {
        "items": aggregate_kanji(db, query, [{"$skip": start}, {"$limit": page_size}]),
        "total": total,
        "page": current_page,
        "page_size": page_size,
        "total_pages": total_pages,
    }


def read_search_page(
    db: Database,
    query: dict[str, Any],
    page: int,
    page_size: int,
    exact_text: str | None = None,
) -> dict[str, Any]:
    total = db.kanji.count_documents(query)
    total_pages = max(1, ceil(total / page_size))
    current_page = min(page, total_pages)
    start = (current_page - 1) * page_size

    return {
        "items": aggregate_kanji(
            db,
            query,
            [{"$skip": start}, {"$limit": page_size}],
            exact_text,
        ),
        "total": total,
        "page": current_page,
        "page_size": page_size,
        "total_pages": total_pages,
    }


def get_by_literal(db: Database, literal: str) -> dict[str, Any] | None:
    kanji = db.kanji.find_one({"literal": literal})
    return serialize_document(kanji) if kanji else None


def create_kanji(db: Database, kanji: dict[str, Any]) -> dict[str, Any]:
    db.kanji.insert_one(kanji)
    sync_radicals(db)
    touch_database(db)
    return serialize_document(kanji)


def replace_kanji(db: Database, literal: str, kanji: dict[str, Any]) -> bool:
    result = db.kanji.replace_one({"literal": literal}, kanji)

    if result.matched_count == 0:
        return False

    sync_radicals(db)
    touch_database(db)
    return True


def recognition_candidates(db: Database, query: dict[str, Any], expected_strokes: int) -> list[dict[str, Any]]:
    pipeline = [
        {"$match": query},
        {
            "$addFields": {
                "_safe_strokes": {"$ifNull": ["$stroke_count", expected_strokes]},
                "_safe_freq": {"$ifNull": ["$freq", 3000]},
            }
        },
        {
            "$addFields": {
                "_stroke_penalty": {
                    "$multiply": [
                        {"$abs": {"$subtract": ["$_safe_strokes", expected_strokes]}},
                        5,
                    ]
                },
                "_frequency_bonus": {
                    "$max": [
                        0,
                        {"$subtract": [10, {"$floor": {"$divide": ["$_safe_freq", 300]}}]},
                    ]
                },
            }
        },
        {
            "$addFields": {
                "score": {
                    "$max": [
                        42,
                        {"$subtract": [{"$add": [96, "$_frequency_bonus"]}, "$_stroke_penalty"]},
                    ]
                },
                "_sort_freq": {"$ifNull": ["$freq", 999_999_999]},
            }
        },
        {"$sort": {"score": -1, "_sort_freq": ASCENDING, "literal": ASCENDING}},
        {"$limit": 6},
        {
            "$project": {
                "_safe_strokes": 0,
                "_safe_freq": 0,
                "_stroke_penalty": 0,
                "_frequency_bonus": 0,
                "_sort_freq": 0,
            }
        },
    ]

    candidates = []
    for document in db.kanji.aggregate(pipeline):
        score = document.pop("score", 0)
        candidates.append({"kanji": serialize_document(document), "score": score})

    return candidates


def statistics(db: Database, query: dict[str, Any], axis: str) -> list[dict[str, Any]]:
    pipeline = [
        {"$match": query},
        {"$group": {"_id": {"$ifNull": [f"${axis}", "none"]}, "count": {"$sum": 1}}},
        {
            "$addFields": {
                "sort_value": {
                    "$cond": [{"$eq": ["$_id", "none"]}, 999_999_999, "$_id"]
                }
            }
        },
        {"$sort": {"sort_value": ASCENDING}},
        {"$project": {"_id": 0, "value": "$_id", "count": 1}},
    ]
    return [serialize_document(item) for item in db.kanji.aggregate(pipeline)]


def chart_data(db: Database, query: dict[str, Any], x_axis: str, y_axis: str) -> list[dict[str, Any]]:
    value_expressions: dict[str, Any] = {
        "avg_freq": "$freq",
        "avg_words": {"$size": {"$ifNull": ["$words", []]}},
        "avg_examples": {"$size": {"$ifNull": ["$example_sentences", []]}},
        "avg_radicals": {"$size": {"$ifNull": ["$radicals", []]}},
        "avg_readings": {
            "$add": [
                {"$size": {"$ifNull": ["$readings.on", []]}},
                {"$size": {"$ifNull": ["$readings.kun", []]}},
                {"$size": {"$ifNull": ["$readings.nanori", []]}},
            ]
        },
        "avg_strokes": "$stroke_count",
    }
    value_accumulator = (
        {"$sum": 1}
        if y_axis == "count"
        else {"$avg": value_expressions.get(y_axis, "$freq")}
    )

    if x_axis == "radical_top":
        pipeline = [
            {"$match": query},
            {"$unwind": "$radicals"},
            {"$group": {"_id": "$radicals", "count": {"$sum": 1}, "value": value_accumulator}},
            {"$sort": {"count": -1, "_id": ASCENDING}},
            {"$limit": 10},
            {
                "$project": {
                    "_id": 0,
                    "label": "$_id",
                    "value": {"$ifNull": ["$value", 0]},
                    "count": 1,
                }
            },
        ]
        items = [serialize_document(item) for item in db.kanji.aggregate(pipeline)]
        # round numeric values to 2 decimals for consistency (mongomock lacks $round)
        for it in items:
            val = it.get("value")
            if isinstance(val, float):
                it["value"] = round(val, 2)
        return items

    field = {
        "jlpt": "jlpt",
        "stroke_count": "stroke_count",
        "grade": "grade",
    }.get(x_axis, "jlpt")

    pipeline = [
        {"$match": query},
        {
            "$group": {
                "_id": {"$ifNull": [f"${field}", "none"]},
                "count": {"$sum": 1},
                "value": value_accumulator,
            }
        },
        {
            "$addFields": {
                "sort_value": {
                    "$cond": [{"$eq": ["$_id", "none"]}, 999_999_999, "$_id"]
                }
            }
        },
        {"$sort": {"sort_value": ASCENDING}},
        {
            "$project": {
                "_id": 0,
                "label": "$_id",
                "value": {"$ifNull": ["$value", 0]},
                "count": 1,
            }
        },
    ]
    items = [serialize_document(item) for item in db.kanji.aggregate(pipeline)]
    for it in items:
        val = it.get("value")
        if isinstance(val, float):
            it["value"] = round(val, 2)
    return items
