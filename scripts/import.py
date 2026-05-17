"""
Imports a prepared KanjiLookup seed into MongoDB.

Use scripts/build_seed.py to regenerate frontend/public/kanji-db.json from the
raw files in data/. This importer deliberately works with the same JSON shape
that the FastAPI backend uses for Docker seeding and import/export.
"""

from __future__ import annotations

import argparse
import json
import os
from pathlib import Path
from typing import Any

try:
    from pymongo import ASCENDING, MongoClient
except ImportError as error:
    raise SystemExit("pymongo не установлен. Установите его командой: pip install pymongo") from error

import build_seed


ROOT_DIR = Path(__file__).resolve().parent.parent
DEFAULT_SEED_PATH = ROOT_DIR / "frontend" / "public" / "kanji-db.json"


def load_seed(path: Path) -> dict[str, Any]:
    with path.open("r", encoding="utf-8") as file:
        database = json.load(file)

    if not isinstance(database.get("kanji"), list) or not isinstance(database.get("radicals"), list):
        raise SystemExit("Seed должен содержать коллекции kanji и radicals.")

    if not isinstance(database.get("users"), list):
        database["users"] = []

    return database


def create_indexes(db: Any) -> None:
    db.kanji.create_index([("literal", ASCENDING)], unique=True)
    db.kanji.create_index([("unicode", ASCENDING)])
    db.kanji.create_index([("freq", ASCENDING)])
    db.kanji.create_index([("stroke_count", ASCENDING)])
    db.kanji.create_index([("grade", ASCENDING)])
    db.kanji.create_index([("jlpt", ASCENDING)])
    db.kanji.create_index([("radicals", ASCENDING)])
    db.kanji.create_index([("meanings", ASCENDING)])
    db.kanji.create_index([("readings.on", ASCENDING)])
    db.kanji.create_index([("readings.kun", ASCENDING)])
    db.radicals.create_index([("stroke_count", ASCENDING)])
    db.users.create_index([("username", ASCENDING)], unique=True)


def replace_collection(db: Any, name: str, documents: list[dict[str, Any]]) -> None:
    collection = db[name]
    collection.delete_many({})
    if documents:
        collection.insert_many(documents, ordered=False)


def main() -> None:
    parser = argparse.ArgumentParser(description="Import KanjiLookup seed into MongoDB.")
    parser.add_argument("--seed", type=Path, default=DEFAULT_SEED_PATH, help="Path to kanji-db.json.")
    parser.add_argument("--rebuild", action="store_true", help="Regenerate the seed from data/ before import.")
    args = parser.parse_args()

    if args.rebuild or not args.seed.exists():
        build_seed.main()

    seed = load_seed(args.seed)
    mongo_uri = os.getenv("MONGODB_URI") or os.getenv("MONGO_URI") or "mongodb://localhost:27017/"
    database_name = os.getenv("DATABASE_NAME") or os.getenv("MONGO_DB") or "kandz"

    client = MongoClient(mongo_uri)
    db = client[database_name]

    replace_collection(db, "kanji", seed["kanji"])
    replace_collection(db, "radicals", seed["radicals"])
    replace_collection(db, "users", seed["users"])
    db.meta.update_one(
        {"_id": "database"},
        {"$set": {"updated_at": seed.get("updated_at")}},
        upsert=True,
    )
    create_indexes(db)

    print(f"MongoDB: {mongo_uri}")
    print(f"Database: {database_name}")
    print(f"kanji: {db.kanji.count_documents({}):,}")
    print(f"radicals: {db.radicals.count_documents({}):,}")
    print(f"users: {db.users.count_documents({}):,}")

    client.close()


if __name__ == "__main__":
    main()
