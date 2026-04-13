from __future__ import annotations

from fastapi import APIRouter, Depends, Request, status
from fastapi.responses import JSONResponse

from app.auth import require_api_key

router = APIRouter(tags=["health"])


@router.get("/healthz")
def healthz() -> dict[str, str]:
    return {"status": "ok"}


@router.get("/readyz")
def readyz(request: Request) -> JSONResponse:
    scorer = getattr(request.app.state, "scorer", None)
    if scorer is None:
        return JSONResponse(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            content={"status": "not_ready"},
        )
    return JSONResponse(status_code=status.HTTP_200_OK, content={"status": "ready"})


@router.get(
    "/capabilities",
    dependencies=[Depends(require_api_key)],
)
def capabilities() -> dict[str, object]:
    return {
        "service": "router-agent",
        "contract": "auto-model-router-v1",
        "auth": "bearer",
        "endpoints": {
            "health": "/healthz",
            "ready": "/readyz",
            "models": "/models",
            "models_update": "/models/update",
            "route": "/route",
        },
    }
