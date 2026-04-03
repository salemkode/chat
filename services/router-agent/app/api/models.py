from __future__ import annotations

from fastapi import APIRouter, Depends, Request

from app.auth import require_api_key
from app.schemas import (
    ModelsResponse,
    UpdateModelsRequest,
    UpdateModelsResponse,
    model_to_input,
)

router = APIRouter(tags=["models"], dependencies=[Depends(require_api_key)])


@router.post("/models/update", response_model=UpdateModelsResponse)
def update_models(payload: UpdateModelsRequest, request: Request) -> UpdateModelsResponse:
    registry = request.app.state.registry
    snapshot = registry.replace([model.to_router_model() for model in payload.models])
    return UpdateModelsResponse(count=snapshot.count, version=snapshot.version)


@router.get("/models", response_model=ModelsResponse)
def get_models(request: Request) -> ModelsResponse:
    snapshot = request.app.state.registry.snapshot()
    return ModelsResponse(
        version=snapshot.version,
        count=snapshot.count,
        models=[model_to_input(model) for model in snapshot.models],
    )
