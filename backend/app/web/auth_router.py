from fastapi import APIRouter, Request

from app.data.database import get_db
from app.service.auth_service import login_admin


router = APIRouter(prefix="/api/auth", tags=["auth"])


@router.post("/login")
async def login(request: Request) -> dict[str, str]:
    payload = await request.json()
    username = payload.get("username") if isinstance(payload, dict) else None
    password = payload.get("password") if isinstance(payload, dict) else None
    return login_admin(get_db(request), request.app.state.settings, username, password)
