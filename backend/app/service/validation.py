from typing import Any
import time

from fastapi import HTTPException

from app.service.auth_service import hash_password


def now_iso() -> str:
    return time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())


def is_record(value: Any) -> bool:
    return isinstance(value, dict)


def validate_string_list(value: Any) -> bool:
    return isinstance(value, list) and all(isinstance(item, str) for item in value)


def validate_optional_int(value: Any) -> bool:
    return value is None or isinstance(value, int)


def validate_readings(value: Any) -> bool:
    if not is_record(value):
        return False

    return all(validate_string_list(value.get(key, [])) for key in ("on", "kun", "nanori"))


def validate_words(value: Any) -> bool:
    return isinstance(value, list) and all(
        is_record(item)
        and isinstance(item.get("word"), str)
        and validate_string_list(item.get("meanings", []))
        for item in value
    )


def validate_sentences(value: Any) -> bool:
    return isinstance(value, list) and all(
        is_record(item)
        and isinstance(item.get("japanese"), str)
        and isinstance(item.get("english"), str)
        for item in value
    )


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
            or not item.get("literal").strip()
            or not validate_string_list(item.get("meanings"))
            or not validate_string_list(item.get("radicals"))
        ):
            raise HTTPException(status_code=400, detail="Некорректная запись в коллекции kanji.")

        item["_id"] = item.get("_id") or item["literal"]
        item["unicode"] = item.get("unicode") or f"{ord(item['literal'][0]):04x}"
        item["readings"] = item.get("readings") or {"on": [], "kun": [], "nanori": []}
        item["words"] = item.get("words") or []
        item["example_sentences"] = item.get("example_sentences") or []
        item["kvg"] = item.get("kvg")

        if (
            not validate_optional_int(item.get("stroke_count"))
            or not validate_optional_int(item.get("grade"))
            or not validate_optional_int(item.get("jlpt"))
            or not validate_optional_int(item.get("freq"))
            or not validate_readings(item.get("readings"))
            or not validate_words(item.get("words"))
            or not validate_sentences(item.get("example_sentences"))
        ):
            raise HTTPException(status_code=400, detail="Некорректная запись в коллекции kanji.")

    for item in radicals:
        if (
            not is_record(item)
            or not isinstance(item.get("_id"), str)
            or not isinstance(item.get("kanji_list"), list)
            or not isinstance(item.get("stroke_count"), int)
        ):
            raise HTTPException(status_code=400, detail="Некорректная запись в коллекции radicals.")

    users = value.get("users") if isinstance(value.get("users"), list) else []
    for item in users:
        if (
            not is_record(item)
            or not isinstance(item.get("username"), str)
            or not item.get("username").strip()
            or not (isinstance(item.get("password_hash"), str) or isinstance(item.get("password"), str))
        ):
            raise HTTPException(status_code=400, detail="Некорректная запись в коллекции users.")

        if isinstance(item.get("password"), str) and not isinstance(item.get("password_hash"), str):
            item["password_hash"] = hash_password(item["password"])
        item.pop("password", None)

    return {
        "updated_at": value.get("updated_at") or now_iso(),
        "kanji": kanji,
        "radicals": radicals,
        "users": users,
    }


def validate_kanji(value: Any) -> dict[str, Any]:
    return validate_database({"kanji": [value], "radicals": []})["kanji"][0]
