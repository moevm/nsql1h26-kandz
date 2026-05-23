import json
import time

from fastapi import Request
from pymongo import ASCENDING, MongoClient
from pymongo.database import Database
from pymongo.errors import PyMongoError

from app.core.config import Settings
from app.data.serialization import serialize_document
from app.service.auth_service import default_admin_user
from app.service.validation import now_iso, validate_database


def wait_for_mongo(client: MongoClient) -> None:
    last_error: Exception | None = None

    for _ in range(30):
        try:
            client.admin.command("ping")
            return
        except PyMongoError as error:
            last_error = error
            time.sleep(1)

    raise RuntimeError(f"MongoDB is not available: {last_error}")


def create_client(settings: Settings) -> MongoClient:
    client: MongoClient = MongoClient(settings.mongodb_uri)
    wait_for_mongo(client)
    return client


def get_db(request: Request) -> Database:
    return request.app.state.db


def create_indexes(db: Database) -> None:
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


def touch_database(db: Database) -> None:
    db.meta.update_one(
        {"_id": "database"},
        {"$set": {"updated_at": now_iso()}},
        upsert=True,
    )


def sync_radicals(db: Database) -> None:
    grouped_radicals = list(
        db.kanji.aggregate(
            [
                {"$unwind": "$radicals"},
                {"$group": {"_id": "$radicals", "kanji_list": {"$addToSet": "$literal"}}},
            ]
        )
    )

    for radical in grouped_radicals:
        db.radicals.update_one(
            {"_id": radical["_id"]},
            {
                "$set": {"kanji_list": sorted(radical["kanji_list"])},
                "$setOnInsert": {"stroke_count": 1, "meaning": "custom"},
            },
            upsert=True,
        )

    db.radicals.delete_many({"_id": {"$nin": [item["_id"] for item in grouped_radicals]}})


def replace_database(db: Database, settings: Settings, database: dict) -> None:
    existing_users = list(db.users.find({}))
    incoming_users = database.get("users") if isinstance(database.get("users"), list) else []
    preserved_users = incoming_users or existing_users or [default_admin_user()]

    for collection_name in settings.collections:
        db[collection_name].delete_many({})
        items = preserved_users if collection_name == "users" else database.get(collection_name, [])

        if items:
            db[collection_name].insert_many(items)

    db.meta.update_one(
        {"_id": "database"},
        {"$set": {"updated_at": database.get("updated_at") or now_iso()}},
        upsert=True,
    )
    # If the imported database already contains radicals, respect them and
    # avoid overwriting by syncing from kanji. Only sync when radicals were
    # not provided in the import payload.
    if not database.get("radicals"):
        sync_radicals(db)


def load_seed(settings: Settings) -> dict:
    if not settings.seed_path.exists():
        raise RuntimeError(f"Seed file not found: {settings.seed_path}")

    with settings.seed_path.open("r", encoding="utf-8") as seed_file:
        return validate_database(json.load(seed_file))


def seed_database(db: Database, settings: Settings) -> None:
    if db.kanji.count_documents({}) > 0:
        return

    replace_database(db, settings, load_seed(settings))


def database_snapshot(db: Database) -> dict:
    meta = db.meta.find_one({"_id": "database"}) or {}

    return serialize_document(
        {
            "updated_at": meta.get("updated_at") or now_iso(),
            "kanji": list(db.kanji.find({})),
            "radicals": list(db.radicals.find({})),
            "users": list(db.users.find({})),
        }
    )
