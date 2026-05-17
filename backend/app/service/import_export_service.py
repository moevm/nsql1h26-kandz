import json
import time

from fastapi import HTTPException, UploadFile
from pymongo.database import Database

from app.core.config import Settings
from app.data.database import database_snapshot, replace_database
from app.service.validation import validate_database


def export_database(db: Database) -> dict:
    return database_snapshot(db)


async def import_database(db: Database, settings: Settings, file: UploadFile) -> dict:
    previous = database_snapshot(db)

    try:
        content = await file.read()
        database = validate_database(json.loads(content.decode("utf-8")))
        replace_database(db, settings, database)
    except HTTPException:
        replace_database(db, settings, previous)
        raise
    except Exception as error:
        replace_database(db, settings, previous)
        raise HTTPException(status_code=400, detail=f"Не удалось импортировать JSON: {error}") from error

    return {"status": "ok", "updated_at": database.get("updated_at")}


def export_filename() -> str:
    return f"kanji-database-{time.strftime('%Y-%m-%d')}.json"
