from typing import Any
import time

from fastapi import HTTPException


def now_iso() -> str:
    return time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())


def is_record(value: Any) -> bool:
    return isinstance(value, dict)


def validate_database(value: Any) -> dict[str, Any]:
    if not is_record(value):
        raise HTTPException(status_code=400, detail="JSON должен содержать объект базы данных.")

    kanji = value.get("kanji")
    radicals = value.get("radicals")

    if not isinstance(kanji, list) or not isinstance(radicals, list):
        raise HTTPException(status_code=400, detail="Нужны коллекции kanji и radicals.")

    for item in kanji:
        if (
            not is_record(item)
            or not isinstance(item.get("literal"), str)
            or not isinstance(item.get("meanings"), list)
            or not isinstance(item.get("radicals"), list)
        ):
            raise HTTPException(status_code=400, detail="Некорректная запись в коллекции kanji.")

        item["_id"] = item.get("_id") or item["literal"]
        item["unicode"] = item.get("unicode") or f"{ord(item['literal'][0]):04x}"
        item["readings"] = item.get("readings") or {"on": [], "kun": [], "nanori": []}
        item["words"] = item.get("words") or []
        item["example_sentences"] = item.get("example_sentences") or []
        item["kvg"] = item.get("kvg")

    for item in radicals:
        if (
            not is_record(item)
            or not isinstance(item.get("_id"), str)
            or not isinstance(item.get("kanji_list"), list)
            or not isinstance(item.get("stroke_count"), int)
        ):
            raise HTTPException(status_code=400, detail="Некорректная запись в коллекции radicals.")

    return {
        "updated_at": value.get("updated_at") or now_iso(),
        "kanji": kanji,
        "radicals": radicals,
        "users": value.get("users") if isinstance(value.get("users"), list) else [],
    }


def validate_kanji(value: Any) -> dict[str, Any]:
    return validate_database({"kanji": [value], "radicals": []})["kanji"][0]
