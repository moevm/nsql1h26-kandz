from fastapi import APIRouter, Request

from app.data.database import get_db


router = APIRouter(tags=["health"])


@router.get("/api/health")
def api_health(request: Request) -> dict[str, str]:
    get_db(request).command("ping")
    return {"status": "ok"}


@router.get("/health")
def health(request: Request) -> dict[str, str]:
    return api_health(request)
