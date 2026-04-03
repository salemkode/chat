from __future__ import annotations

import logging
import os
from dataclasses import dataclass
from pathlib import Path

from app.core.errors import RouterConfigurationError

SERVICE_ROOT = Path(__file__).resolve().parent.parent


@dataclass(frozen=True)
class Settings:
    api_key: str
    host: str
    port: int
    model_path: Path
    log_level: str

    @classmethod
    def from_env(cls) -> "Settings":
        api_key = os.getenv("ROUTER_API_KEY", "").strip()
        if not api_key:
            raise RouterConfigurationError("ROUTER_API_KEY is required")

        host = os.getenv("ROUTER_HOST", "0.0.0.0").strip() or "0.0.0.0"

        raw_port = os.getenv("ROUTER_PORT", "8001").strip() or "8001"
        try:
            port = int(raw_port)
        except ValueError as exc:
            raise RouterConfigurationError("ROUTER_PORT must be an integer") from exc

        raw_model_path = os.getenv("ROUTER_MODEL_PATH", "app/ml/model.pkl").strip()
        model_path = Path(raw_model_path)
        if not model_path.is_absolute():
            model_path = SERVICE_ROOT / model_path

        log_level = os.getenv("ROUTER_LOG_LEVEL", "INFO").strip().upper() or "INFO"

        return cls(
            api_key=api_key,
            host=host,
            port=port,
            model_path=model_path,
            log_level=log_level,
        )


def configure_logging(settings: Settings) -> None:
    level = getattr(logging, settings.log_level, logging.INFO)
    logging.basicConfig(
        level=level,
        format="%(asctime)s %(levelname)s [router-agent] %(name)s: %(message)s",
    )
