from __future__ import annotations

from collections.abc import Generator
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from app.config import Settings
from app.main import create_app

SERVICE_ROOT = Path(__file__).resolve().parent.parent


@pytest.fixture
def settings() -> Settings:
    return Settings(
        api_key="test-router-key",
        host="127.0.0.1",
        port=8001,
        model_path=SERVICE_ROOT / "app/ml/model.pkl",
        log_level="CRITICAL",
    )


@pytest.fixture
def client(settings: Settings) -> Generator[TestClient, None, None]:
    app = create_app(settings=settings)
    with TestClient(app) as test_client:
        yield test_client


@pytest.fixture
def auth_headers() -> dict[str, str]:
    return {"Authorization": "Bearer test-router-key"}


@pytest.fixture
def baseline_models_payload() -> dict[str, object]:
    return {
        "models": [
            {
                "name": "cheap-fast",
                "intelligence": 0.6,
                "price": 0.1,
                "speed": 0.92,
                "latency": 0.08,
                "task_scores": {
                    "general": 0.7,
                    "code": 0.45,
                    "math": 0.4,
                    "analysis": 0.45,
                },
                "max_context_tokens": 64000,
                "supports_tools": False,
            },
            {
                "name": "code-pro",
                "intelligence": 0.86,
                "price": 0.46,
                "speed": 0.72,
                "latency": 0.22,
                "task_scores": {
                    "general": 0.79,
                    "code": 0.96,
                    "math": 0.64,
                    "analysis": 0.7,
                },
                "max_context_tokens": 128000,
                "supports_tools": True,
            },
            {
                "name": "math-brain",
                "intelligence": 0.88,
                "price": 0.5,
                "speed": 0.67,
                "latency": 0.24,
                "task_scores": {
                    "general": 0.8,
                    "code": 0.62,
                    "math": 0.98,
                    "analysis": 0.72,
                },
                "max_context_tokens": 128000,
                "supports_tools": False,
            },
            {
                "name": "premium-smart",
                "intelligence": 0.96,
                "price": 0.9,
                "speed": 0.56,
                "latency": 0.42,
                "task_scores": {
                    "general": 0.94,
                    "code": 0.9,
                    "math": 0.88,
                    "analysis": 0.94,
                },
                "max_context_tokens": 256000,
                "supports_tools": True,
            },
            {
                "name": "analyst-long",
                "intelligence": 0.9,
                "price": 0.58,
                "speed": 0.64,
                "latency": 0.3,
                "task_scores": {
                    "general": 0.84,
                    "code": 0.74,
                    "math": 0.7,
                    "analysis": 0.97,
                },
                "max_context_tokens": 256000,
                "supports_tools": True,
            },
        ]
    }
