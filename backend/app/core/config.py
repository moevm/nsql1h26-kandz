from dataclasses import dataclass
import os
from pathlib import Path


@dataclass(frozen=True)
class Settings:
    mongodb_uri: str
    database_name: str
    seed_path: Path
    admin_token_secret: str
    collections: tuple[str, ...] = ("kanji", "radicals", "users")


def get_settings() -> Settings:
    default_seed_path = Path(__file__).resolve().parents[3] / "frontend" / "public" / "kanji-db.json"

    return Settings(
        mongodb_uri=os.getenv("MONGODB_URI", "mongodb://localhost:27017/"),
        database_name=os.getenv("DATABASE_NAME", "kandz"),
        seed_path=Path(os.getenv("SEED_PATH", default_seed_path)),
        admin_token_secret=os.getenv("ADMIN_TOKEN_SECRET", "kanji-lookup-dev-secret"),
    )
