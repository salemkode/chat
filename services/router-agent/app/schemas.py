from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator

from app.core.types import Preference, RouterModel, TaskType


def _clamp01(value: float) -> float:
    if value < 0 or value > 1:
        raise ValueError("value must be between 0 and 1")
    return float(value)


class StrictSchema(BaseModel):
    model_config = ConfigDict(extra="forbid")


class MessageInput(StrictSchema):
    role: Literal["system", "user", "assistant", "tool"]
    content: str = Field(min_length=1)

    @field_validator("content")
    @classmethod
    def strip_content(cls, value: str) -> str:
        value = value.strip()
        if not value:
            raise ValueError("content must not be blank")
        return value


class AttachmentSummary(StrictSchema):
    image_count: int = Field(default=0, ge=0)
    file_count: int = Field(default=0, ge=0)
    total_count: int = Field(default=0, ge=0)

    @model_validator(mode="after")
    def validate_totals(self) -> "AttachmentSummary":
        if self.total_count < self.image_count + self.file_count:
            raise ValueError("total_count must be >= image_count + file_count")
        return self


class UserInput(StrictSchema):
    preference: Preference = "balanced"
    requires_image_input: bool = False
    attachments: AttachmentSummary | None = None


class ModelInput(StrictSchema):
    name: str = Field(min_length=1)
    intelligence: float
    price: float
    speed: float
    latency: float
    task_scores: dict[TaskType, float] | None = None
    max_context_tokens: int | None = Field(default=None, gt=0)
    supports_tools: bool = False

    @field_validator("name")
    @classmethod
    def strip_name(cls, value: str) -> str:
        value = value.strip()
        if not value:
            raise ValueError("name must not be blank")
        return value

    @field_validator("intelligence", "price", "speed", "latency")
    @classmethod
    def validate_score(cls, value: float) -> float:
        return _clamp01(value)

    @field_validator("task_scores")
    @classmethod
    def validate_task_scores(
        cls,
        value: dict[TaskType, float] | None,
    ) -> dict[TaskType, float] | None:
        if value is None:
            return None
        return {task: _clamp01(score) for task, score in value.items()}

    def to_router_model(self) -> RouterModel:
        task_scores = {
            "general": self.intelligence,
            "code": self.intelligence,
            "math": self.intelligence,
            "analysis": self.intelligence,
        }
        if self.task_scores:
            task_scores.update(self.task_scores)
        return RouterModel(
            name=self.name,
            intelligence=self.intelligence,
            price=self.price,
            speed=self.speed,
            latency=self.latency,
            task_scores=task_scores,
            max_context_tokens=self.max_context_tokens,
            supports_tools=self.supports_tools,
        )


class UpdateModelsRequest(StrictSchema):
    models: list[ModelInput] = Field(min_length=1)

    @model_validator(mode="after")
    def ensure_unique_names(self) -> "UpdateModelsRequest":
        names = [model.name for model in self.models]
        if len(names) != len(set(names)):
            raise ValueError("model names must be unique")
        return self


class UpdateModelsResponse(StrictSchema):
    count: int
    version: int


class ModelsResponse(StrictSchema):
    version: int
    count: int
    models: list[ModelInput]


class RouteRequest(StrictSchema):
    messages: list[MessageInput] = Field(min_length=1)
    user: UserInput = Field(default_factory=UserInput)


class RouteResponse(StrictSchema):
    model: str


def model_to_input(model: RouterModel) -> ModelInput:
    return ModelInput.model_validate(model.to_public_dict())
