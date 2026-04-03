from __future__ import annotations

from app.core.types import Preference, RequestClassification, RouterModel

FEATURE_NAMES = (
    "complexity",
    "estimated_tokens_norm",
    "task_general",
    "task_code",
    "task_math",
    "task_analysis",
    "preference_balanced",
    "preference_cost",
    "preference_speed",
    "preference_quality",
    "request_needs_tools",
    "model_intelligence",
    "model_price",
    "model_speed",
    "model_latency",
    "task_fit",
    "context_fit",
    "model_supports_tools",
    "tool_fit",
)


def _clamp01(value: float) -> float:
    return max(0.0, min(1.0, value))


def context_fit(estimated_tokens: int, max_context_tokens: int | None) -> float:
    if max_context_tokens is None:
        return 1.0
    return _clamp01(max_context_tokens / max(estimated_tokens, 1))


def build_feature_vector(
    classification: RequestClassification,
    model: RouterModel,
    preference: Preference,
) -> list[float]:
    task_type = classification.task_type
    task_fit = model.task_score(task_type)
    model_supports_tools = 1.0 if model.supports_tools else 0.0
    request_needs_tools = 1.0 if classification.needs_tools else 0.0
    tool_fit = 1.0 if not classification.needs_tools else model_supports_tools

    return [
        classification.complexity,
        _clamp01(classification.estimated_input_tokens / 200_000),
        1.0 if task_type == "general" else 0.0,
        1.0 if task_type == "code" else 0.0,
        1.0 if task_type == "math" else 0.0,
        1.0 if task_type == "analysis" else 0.0,
        1.0 if preference == "balanced" else 0.0,
        1.0 if preference == "cost" else 0.0,
        1.0 if preference == "speed" else 0.0,
        1.0 if preference == "quality" else 0.0,
        request_needs_tools,
        model.intelligence,
        model.price,
        model.speed,
        model.latency,
        task_fit,
        context_fit(classification.estimated_input_tokens, model.max_context_tokens),
        model_supports_tools,
        tool_fit,
    ]
