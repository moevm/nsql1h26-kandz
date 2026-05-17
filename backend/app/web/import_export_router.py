from typing import Any

from fastapi import APIRouter, File, Header, Request, UploadFile
from fastapi.responses import JSONResponse

from app.data.database import get_db
from app.service.auth_service import require_admin_token
from app.service import import_export_service


router = APIRouter(prefix="/api", tags=["import_export"])


@router.get("/database")
def read_database(request: Request) -> dict[str, Any]:
    return import_export_service.export_database(get_db(request))


@router.get("/export")
def export_database(request: Request) -> JSONResponse:
    return JSONResponse(
        import_export_service.export_database(get_db(request)),
        headers={"Content-Disposition": f'attachment; filename="{import_export_service.export_filename()}"'},
    )


@router.post("/import")
async def import_database(
    request: Request,
    file: UploadFile = File(...),
    authorization: str | None = Header(default=None),
) -> dict[str, Any]:
    require_admin_token(get_db(request), request.app.state.settings, authorization)
    return await import_export_service.import_database(get_db(request), request.app.state.settings, file)
