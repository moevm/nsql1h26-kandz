"""
Builds frontend/public/kanji-db.json from the source files in data/.

The application uses MongoDB as the source of truth at runtime, while this
script prepares the initial seed that Docker imports on a fresh volume.
"""

from __future__ import annotations

import csv
import hashlib
import json
import os
import re
import time
from base64 import urlsafe_b64encode
from collections import defaultdict
from pathlib import Path
from typing import Any
from xml.etree import ElementTree


ROOT_DIR = Path(__file__).resolve().parent.parent
DATA_DIR = Path(os.getenv("DATA_DIR", ROOT_DIR / "data"))
OUTPUT_PATH = Path(os.getenv("SEED_OUTPUT", ROOT_DIR / "frontend" / "public" / "kanji-db.json"))

MAX_WORDS_PER_KANJI = int(os.getenv("MAX_WORDS_PER_KANJI", "5"))
MAX_SENTENCES_PER_KANJI = int(os.getenv("MAX_SENTENCES_PER_KANJI", "3"))

FILES = {
    "jmdict": "jmdict-eng-3.6.2.json",
    "kanjidic2": "kanjidic2-en-3.6.2.json",
    "kradfile": "kradfile-3.6.2.json",
    "radfile": "radkfile-3.6.2.json",
    "kvg_index": "kvg-index.json",
    "sentences": "Sentence pairs in Japanese-English - 2026-03-10.tsv",
    "svg_dir": "kanji",
}


def load_json(name: str) -> Any:
    path = DATA_DIR / FILES[name]
    with path.open("r", encoding="utf-8") as file:
        return json.load(file)


def is_cjk(value: str) -> bool:
    cjk_ranges = (
        (0x3400, 0x4DBF),
        (0x4E00, 0x9FFF),
        (0xF900, 0xFAFF),
        (0x20000, 0x2A6DF),
        (0x2A700, 0x2B73F),
        (0x2B740, 0x2B81F),
        (0x2B820, 0x2CEAF),
        (0x2CEB0, 0x2EBEF),
        (0x30000, 0x323AF),
    )
    return any(any(start <= ord(char) <= end for start, end in cjk_ranges) for char in value)


def ordered_unique(values: list[str]) -> list[str]:
    return list(dict.fromkeys(item for item in values if item))


def parse_kanjidic2(data: dict[str, Any]) -> tuple[list[str], dict[str, dict[str, Any]]]:
    order: list[str] = []
    parsed: dict[str, dict[str, Any]] = {}

    for entry in data.get("characters", []):
        literal = entry.get("literal")
        if not isinstance(literal, str) or not is_cjk(literal):
            continue

        readings_on: list[str] = []
        readings_kun: list[str] = []
        meanings: list[str] = []
        reading_meaning = entry.get("readingMeaning") or {}

        for group in reading_meaning.get("groups", []):
            for reading in group.get("readings", []):
                value = reading.get("value")
                if not value:
                    continue
                if reading.get("type") == "ja_on":
                    readings_on.append(value)
                if reading.get("type") == "ja_kun":
                    readings_kun.append(value)

            for meaning in group.get("meanings", []):
                if meaning.get("lang") in (None, "en", "eng"):
                    meanings.append(meaning.get("value") or meaning.get("meaning") or "")

        misc = entry.get("misc") or {}
        stroke_counts = misc.get("strokeCounts") or []
        unicode_value = next(
            (
                codepoint.get("value")
                for codepoint in entry.get("codepoints", [])
                if codepoint.get("type") == "ucs" and codepoint.get("value")
            ),
            f"{ord(literal):04x}",
        )

        order.append(literal)
        parsed[literal] = {
            "unicode": unicode_value.lower(),
            "stroke_count": stroke_counts[0] if stroke_counts else None,
            "grade": misc.get("grade"),
            "jlpt": misc.get("jlptLevel"),
            "freq": misc.get("frequency"),
            "readings": {
                "on": ordered_unique(readings_on),
                "kun": ordered_unique(readings_kun),
                "nanori": ordered_unique(reading_meaning.get("nanori") or []),
            },
            "meanings": ordered_unique(meanings),
        }

    return order, parsed


def parse_words(data: dict[str, Any], allowed_kanji: set[str]) -> dict[str, list[dict[str, Any]]]:
    by_kanji: dict[str, list[dict[str, Any]]] = defaultdict(list)
    seen_by_kanji: dict[str, set[str]] = defaultdict(set)

    for entry in data.get("words", []):
        kanji_forms = entry.get("kanji") or []
        kana_forms = entry.get("kana") or []
        if not kanji_forms:
            continue

        written_forms = [form.get("text", "") for form in kanji_forms if form.get("text")]
        related_kanji = {char for word in written_forms for char in word if char in allowed_kanji}
        related_kanji = {
            char
            for char in related_kanji
            if len(by_kanji[char]) < MAX_WORDS_PER_KANJI
        }
        if not related_kanji:
            continue

        meanings: list[str] = []
        pos: list[str] = []
        for sense in entry.get("sense", []):
            pos.extend(sense.get("partOfSpeech") or [])
            for gloss in sense.get("gloss", []):
                if isinstance(gloss, dict):
                    meanings.append(gloss.get("text", ""))
                elif isinstance(gloss, str):
                    meanings.append(gloss)

        word = written_forms[0]
        word_doc = {
            "word": word,
            "reading": kana_forms[0].get("text", "") if kana_forms else "",
            "meanings": ordered_unique(meanings)[:4],
            "pos": ordered_unique(pos)[:4],
        }
        if not word_doc["word"] or not word_doc["meanings"]:
            continue

        for literal in related_kanji:
            if word in seen_by_kanji[literal]:
                continue
            seen_by_kanji[literal].add(word)
            by_kanji[literal].append(word_doc)

    return dict(by_kanji)


def parse_sentences(path: Path, allowed_kanji: set[str]) -> dict[str, list[dict[str, str]]]:
    by_kanji: dict[str, list[dict[str, str]]] = defaultdict(list)
    seen_pairs: set[tuple[str, str]] = set()

    with path.open("r", encoding="utf-8", newline="") as file:
        reader = csv.reader(file, delimiter="\t")
        for row in reader:
            if len(row) < 4:
                continue

            japanese = row[1].strip()
            english = row[3].strip()
            pair_key = (japanese, english)
            if not japanese or not english or pair_key in seen_pairs:
                continue
            seen_pairs.add(pair_key)

            related_kanji = {
                char
                for char in japanese
                if char in allowed_kanji and len(by_kanji[char]) < MAX_SENTENCES_PER_KANJI
            }
            if not related_kanji:
                continue

            sentence_doc = {"japanese": japanese, "english": english, "source": "tatoeba"}
            for literal in related_kanji:
                by_kanji[literal].append(sentence_doc)

    return dict(by_kanji)


def parse_svg_paths(svg_path: Path) -> list[str]:
    if not svg_path.exists():
        return []

    try:
        root = ElementTree.parse(svg_path).getroot()
    except ElementTree.ParseError:
        return []

    paths: list[str] = []
    for element in root.iter():
        if element.tag.endswith("path"):
            path_value = element.attrib.get("d")
            if path_value:
                paths.append(re.sub(r"\s+", " ", path_value).strip())

    return paths


def parse_kvg(data: dict[str, list[str]], allowed_kanji: set[str]) -> dict[str, dict[str, Any]]:
    parsed: dict[str, dict[str, Any]] = {}
    svg_dir = DATA_DIR / FILES["svg_dir"]

    for literal, files in data.items():
        if literal not in allowed_kanji or not files:
            continue

        filename = files[0]
        stroke_paths = parse_svg_paths(svg_dir / filename)
        parsed[literal] = {
            "svg_path": filename,
            "stroke_paths": stroke_paths,
        }

    return parsed


def build_radicals(
    radfile: dict[str, Any],
    reverse_radicals: dict[str, list[str]],
) -> list[dict[str, Any]]:
    documents: list[dict[str, Any]] = []

    for radical, info in radfile.get("radicals", {}).items():
        documents.append(
            {
                "_id": radical,
                "kanji_list": reverse_radicals.get(radical, []),
                "stroke_count": info.get("strokeCount") or info.get("strokes") or 1,
                "meaning": info.get("meaning"),
            }
        )

    known_radicals = {document["_id"] for document in documents}
    for radical, kanji_list in reverse_radicals.items():
        if radical not in known_radicals:
            documents.append(
                {
                    "_id": radical,
                    "kanji_list": kanji_list,
                    "stroke_count": 1,
                    "meaning": None,
                }
            )

    return sorted(documents, key=lambda item: (item["stroke_count"], item["_id"]))


def password_hash(password: str) -> str:
    salt = b"kandz-admin"
    iterations = 260_000
    digest = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt, iterations)
    encoded_digest = urlsafe_b64encode(digest).decode("ascii").rstrip("=")
    return f"pbkdf2_sha256${iterations}${salt.decode('ascii')}${encoded_digest}"


def main() -> None:
    started_at = time.time()
    print(f"Data dir: {DATA_DIR}")

    print("Loading kanjidic2...")
    kanji_order, kanjidic2 = parse_kanjidic2(load_json("kanjidic2"))
    allowed_kanji = set(kanji_order)
    print(f"  kanji: {len(kanji_order):,}")

    print("Loading radicals...")
    kradfile = load_json("kradfile").get("kanji", {})
    radfile = load_json("radfile")
    print(f"  radicals: {len(radfile.get('radicals', {})):,}")

    print("Loading JMDict words...")
    words_by_kanji = parse_words(load_json("jmdict"), allowed_kanji)
    print(f"  kanji with words: {len(words_by_kanji):,}")

    print("Loading sentence pairs...")
    sentences_by_kanji = parse_sentences(DATA_DIR / FILES["sentences"], allowed_kanji)
    print(f"  kanji with examples: {len(sentences_by_kanji):,}")

    print("Loading KanjiVG paths...")
    kvg_by_kanji = parse_kvg(load_json("kvg_index"), allowed_kanji)
    print(f"  kanji with stroke paths: {len(kvg_by_kanji):,}")

    kanji_documents: list[dict[str, Any]] = []
    reverse_radicals: dict[str, list[str]] = defaultdict(list)

    for literal in kanji_order:
        base = kanjidic2[literal]
        radicals = [radical for radical in kradfile.get(literal, []) if isinstance(radical, str)]

        for radical in radicals:
            reverse_radicals[radical].append(literal)

        kanji_documents.append(
            {
                "_id": literal,
                "literal": literal,
                "unicode": base["unicode"],
                "stroke_count": base["stroke_count"],
                "grade": base["grade"],
                "jlpt": base["jlpt"],
                "freq": base["freq"],
                "readings": base["readings"],
                "meanings": base["meanings"],
                "radicals": radicals,
                "words": words_by_kanji.get(literal, []),
                "example_sentences": sentences_by_kanji.get(literal, []),
                "kvg": kvg_by_kanji.get(literal),
            }
        )

    database = {
        "updated_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "kanji": kanji_documents,
        "radicals": build_radicals(radfile, reverse_radicals),
        "users": [
            {
                "username": "admin",
                "password_hash": password_hash("admin123"),
                "created_at": "2026-04-29T12:00:00Z",
            }
        ],
    }

    OUTPUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    with OUTPUT_PATH.open("w", encoding="utf-8") as file:
        json.dump(database, file, ensure_ascii=False, separators=(",", ":"))

    elapsed = time.time() - started_at
    size_mb = OUTPUT_PATH.stat().st_size / 1024 / 1024
    print(f"Wrote {OUTPUT_PATH}")
    print(f"kanji={len(database['kanji']):,}, radicals={len(database['radicals']):,}, size={size_mb:.1f} MB, time={elapsed:.1f}s")


if __name__ == "__main__":
    main()
