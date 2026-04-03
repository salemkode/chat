from __future__ import annotations

from dataclasses import asdict, dataclass
from typing import Literal

TaskType = Literal["general", "code", "math", "analysis"]
Preference = Literal["balanced", "cost", "speed", "quality"]


@dataclass(frozen=True)
class RouterModel:
    name: str
    intelligence: float
    price: float
    speed: float
    latency: float
    task_scores: dict[TaskType, float]
    max_context_tokens: int | None = None
    supports_tools: bool = False

    def task_score(self, task_type: TaskType) -> float:
        return self.task_scores.get(task_type, self.intelligence)

    def to_public_dict(self) -> dict[str, object]:
        return asdict(self)


@dataclass(frozen=True)
class RequestClassification:
    task_type: TaskType
    complexity: float
    estimated_input_tokens: int
    needs_tools: bool = False


@dataclass(frozen=True)
class RegistrySnapshot:
    version: int
    updated_at: float | None
    models_by_name: dict[str, RouterModel]

    @property
    def models(self) -> list[RouterModel]:
        return list(self.models_by_name.values())

    @property
    def count(self) -> int:
        return len(self.models_by_name)
