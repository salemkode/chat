from __future__ import annotations

from pathlib import Path

import pytest

from app.config import Settings
from app.core.errors import RouterConfigurationError, ScorerNotReadyError
from app.core.scoring import load_scorer


def test_settings_requires_router_api_key(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.delenv("ROUTER_API_KEY", raising=False)
    monkeypatch.delenv("ROUTER_HOST", raising=False)
    monkeypatch.delenv("ROUTER_PORT", raising=False)
    monkeypatch.delenv("ROUTER_MODEL_PATH", raising=False)
    monkeypatch.delenv("ROUTER_LOG_LEVEL", raising=False)

    with pytest.raises(RouterConfigurationError):
        Settings.from_env()


def test_load_scorer_fails_for_missing_artifact() -> None:
    with pytest.raises(ScorerNotReadyError):
        load_scorer(Path("/tmp/router-agent-missing-model.pkl"))
