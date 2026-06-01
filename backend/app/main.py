from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import get_settings
from app.data.database import create_client, create_indexes, seed_database
from app.ml.recognizer import load_kanji_recognizer
from app.web.auth_router import router as auth_router
from app.web.health_router import router as health_router
from app.web.import_export_router import router as import_export_router
from app.web.kanji_router import router as kanji_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    settings = get_settings()
    client = create_client(settings)

    app.state.settings = settings
    app.state.client = client
    app.state.db = client[settings.database_name]
    app.state.recognizer = load_kanji_recognizer(settings)

    create_indexes(app.state.db)
    seed_database(app.state.db, settings)

    try:
        yield
    finally:
        client.close()


app = FastAPI(title="KanjiLookup API", version="1.0.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost",
        "http://localhost:8080",
        "http://127.0.0.1:8080",
        "http://frontend",
    ],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health_router)
app.include_router(auth_router)
app.include_router(kanji_router)
app.include_router(import_export_router)
