from typing import Any

from fastapi import APIRouter, Header, Query, Request

from app.data.database import get_db
from app.data.kanji_repository import list_radical_groups, list_radicals
from app.service.auth_service import require_admin_token
from app.service import kanji_service


router = APIRouter(prefix="/api", tags=["kanji"])


@router.get("/radicals")
def read_radicals(request: Request) -> list[dict[str, Any]]:
    return list_radicals(get_db(request))


@router.get("/radicals/groups")
def read_radical_groups(
    request: Request,
    group_by: str = Query("usage", pattern="^(usage|strokes)$"),
    order: str = Query("desc", pattern="^(asc|desc)$"),
    buckets: int = Query(5, ge=1, le=10),
) -> list[dict[str, Any]]:
    return list_radical_groups(get_db(request), group_by=group_by, order=order, buckets=buckets)


@router.get("/search")
def search_kanji(
    request: Request,
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
    limit: int = Query(48, ge=1, le=100),
) -> list[dict[str, Any]]:
    return kanji_service.search_kanji(
        get_db(request),
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
        limit=limit,
    )


@router.get("/search/page")
def search_kanji_page(
    request: Request,
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
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=50),
) -> dict[str, Any]:
    return kanji_service.read_search_page(
        get_db(request),
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
        page=page,
        page_size=page_size,
    )


@router.get("/kanji")
def read_kanji_page(
    request: Request,
    literal: str | None = None,
    meaning: str | None = None,
    radical: str | None = None,
    stroke_count: int | None = None,
    grade: int | None = None,
    jlpt: int | None = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(8, ge=1, le=50),
) -> dict[str, Any]:
    return kanji_service.read_kanji_page(
        get_db(request),
        literal=literal,
        meaning=meaning,
        radical=radical,
        stroke_count=stroke_count,
        grade=grade,
        jlpt=jlpt,
        page=page,
        page_size=page_size,
    )


@router.get("/kanji/{literal}")
def read_kanji_detail(literal: str, request: Request) -> dict[str, Any]:
    return kanji_service.get_kanji_or_404(get_db(request), literal)


@router.post("/kanji", status_code=201)
async def create_kanji(
    request: Request,
    authorization: str | None = Header(default=None),
) -> dict[str, Any]:
    db = get_db(request)
    require_admin_token(db, request.app.state.settings, authorization)
    return kanji_service.create_kanji(db, await request.json())


@router.put("/kanji/{literal}")
async def update_kanji(
    literal: str,
    request: Request,
    authorization: str | None = Header(default=None),
) -> dict[str, Any]:
    db = get_db(request)
    require_admin_token(db, request.app.state.settings, authorization)
    return kanji_service.update_kanji(db, literal, await request.json())


@router.post("/recognize")
async def recognize_drawing(request: Request) -> list[dict[str, Any]]:
    return kanji_service.recognize_drawing(get_db(request), await request.json())


@router.get("/stats")
def read_statistics(
    request: Request,
    axis: str = Query("stroke_count", pattern="^(stroke_count|jlpt|grade)$"),
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
    return kanji_service.read_statistics(
        get_db(request),
        axis=axis,
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


@router.get("/charts")
def read_chart_data(
    request: Request,
    x_axis: str = Query("jlpt", pattern="^(jlpt|stroke_count|grade|radical_top)$"),
    y_axis: str = Query("avg_freq", pattern="^(count|avg_freq|avg_words|avg_examples|avg_radicals|avg_readings|avg_strokes)$"),
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
    return kanji_service.read_chart_data(
        get_db(request),
        x_axis=x_axis,
        y_axis=y_axis,
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
