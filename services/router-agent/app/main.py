from __future__ import annotations

from contextlib import asynccontextmanager

from fastapi import FastAPI

from app.api.health import router as health_router
from app.api.models import router as models_router
from app.api.route import router as route_router
from app.config import Settings, configure_logging
from app.core.registry import ModelRegistry
from app.core.scoring import load_scorer


def create_app(settings: Settings | None = None) -> FastAPI:
    @asynccontextmanager
    async def lifespan(app: FastAPI):
        resolved_settings = settings or Settings.from_env()
        configure_logging(resolved_settings)
        app.state.settings = resolved_settings
        app.state.registry = ModelRegistry()
        app.state.scorer = load_scorer(resolved_settings.model_path)
        yield

    app = FastAPI(
        title="router-agent",
        version="0.1.0",
        lifespan=lifespan,
    )
    app.include_router(health_router)
    app.include_router(models_router)
    app.include_router(route_router)
    return app


app = create_app()
