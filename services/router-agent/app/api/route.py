from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Request, status

from app.auth import require_api_key
from app.core.classifier import classify_messages
from app.core.errors import NoEligibleModelError
from app.core.selector import select_model
from app.schemas import RouteRequest, RouteResponse

router = APIRouter(tags=["routing"], dependencies=[Depends(require_api_key)])


@router.post("/route", response_model=RouteResponse)
def route_request(payload: RouteRequest, request: Request) -> RouteResponse:
    snapshot = request.app.state.registry.snapshot()
    if snapshot.count == 0:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="No models are registered",
        )

    classification = classify_messages(payload.messages)
    try:
        model = select_model(
            models=snapshot.models,
            classification=classification,
            preference=payload.user.preference,
            scorer=request.app.state.scorer,
        )
    except NoEligibleModelError as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=str(exc),
        ) from exc
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Internal scorer failure",
        ) from exc

    return RouteResponse(model=model.name)
