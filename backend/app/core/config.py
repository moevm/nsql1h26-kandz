from dataclasses import dataclass
import os
from pathlib import Path


@dataclass(frozen=True)
class Settings:
    mongodb_uri: str
    database_name: str
    seed_path: Path
    admin_token_secret: str
    recognition_enabled: bool = True
    recognition_model_path: Path | None = None
    recognition_labels_path: Path | None = None
    collections: tuple[str, ...] = ("kanji", "radicals", "users")


def get_settings() -> Settings:
    app_dir = Path(__file__).resolve().parents[1]
    root_dir = Path(__file__).resolve().parents[3]
    default_seed_path = root_dir / "frontend" / "public" / "kanji-db.json"
    default_model_path = app_dir / "ml" / "assets" / "dakanji-v1.2.tflite"
    default_labels_path = app_dir / "ml" / "assets" / "dakanji-v1.2-labels.txt"

    return Settings(
        mongodb_uri=os.getenv("MONGODB_URI", "mongodb://localhost:27017/"),
        database_name=os.getenv("DATABASE_NAME", "kandz"),
        seed_path=Path(os.getenv("SEED_PATH", default_seed_path)),
        admin_token_secret=os.getenv("ADMIN_TOKEN_SECRET", "kanji-lookup-dev-secret"),
        recognition_enabled=os.getenv("RECOGNITION_ENABLED", "1").lower() not in {"0", "false", "no"},
        recognition_model_path=Path(os.getenv("RECOGNITION_MODEL_PATH", default_model_path)),
        recognition_labels_path=Path(os.getenv("RECOGNITION_LABELS_PATH", default_labels_path)),
    )
