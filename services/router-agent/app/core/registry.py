from __future__ import annotations

from threading import RLock
from time import time

from app.core.types import RegistrySnapshot, RouterModel


class ModelRegistry:
    def __init__(self) -> None:
        self._lock = RLock()
        self._version = 0
        self._updated_at: float | None = None
        self._models_by_name: dict[str, RouterModel] = {}

    def replace(self, models: list[RouterModel]) -> RegistrySnapshot:
        models_by_name = {model.name: model for model in models}
        with self._lock:
            self._version += 1
            self._updated_at = time()
            self._models_by_name = models_by_name
            return self.snapshot()

    def snapshot(self) -> RegistrySnapshot:
        with self._lock:
            return RegistrySnapshot(
                version=self._version,
                updated_at=self._updated_at,
                models_by_name=dict(self._models_by_name),
            )
