from __future__ import annotations

from dataclasses import dataclass

from app.core.errors import NoEligibleModelError
from app.core.features import build_feature_vector
from app.core.types import Preference, RequestClassification, RouterModel


@dataclass(frozen=True)
class CandidateScore:
    model: RouterModel
    probability: float
    heuristic_score: float
    final_score: float
    task_fit: float


def _clamp01(value: float) -> float:
    return max(0.0, min(1.0, value))


def _heuristic_score(
    model: RouterModel,
    classification: RequestClassification,
    preference: Preference,
) -> float:
    task_fit = model.task_score(classification.task_type)
    quality_score = _clamp01(model.intelligence * 0.45 + task_fit * 0.55)
    cost_score = _clamp01(1.0 - model.price)
    speed_score = _clamp01(model.speed * 0.45 + (1.0 - model.latency) * 0.55)
    tool_score = 1.0 if not classification.needs_tools or model.supports_tools else 0.0

    if preference == "cost":
        return quality_score * 0.2 + cost_score * 0.6 + speed_score * 0.15 + tool_score * 0.05
    if preference == "speed":
        return quality_score * 0.2 + cost_score * 0.15 + speed_score * 0.6 + tool_score * 0.05
    if preference == "quality":
        return quality_score * 0.82 + cost_score * 0.03 + speed_score * 0.1 + tool_score * 0.05
    return quality_score * 0.45 + cost_score * 0.25 + speed_score * 0.25 + tool_score * 0.05


def _blend_scores(probability: float, heuristic_score: float, preference: Preference) -> float:
    if preference == "quality":
        return probability * 0.05 + heuristic_score * 0.95
    if preference in {"cost", "speed"}:
        return probability * 0.3 + heuristic_score * 0.7
    return probability * 0.4 + heuristic_score * 0.6


def select_model(
    models: list[RouterModel],
    classification: RequestClassification,
    preference: Preference,
    scorer: object,
) -> RouterModel:
    if not models:
        raise NoEligibleModelError("No models are registered")

    eligible = [
        model
        for model in models
        if model.max_context_tokens is None
        or model.max_context_tokens >= classification.estimated_input_tokens
    ]
    if not eligible:
        raise NoEligibleModelError("No eligible models satisfy the request context window")
    if len(eligible) == 1:
        return eligible[0]

    scored_candidates: list[CandidateScore] = []
    for model in eligible:
        features = build_feature_vector(classification, model, preference)
        probability = scorer.predict_probability(features)
        heuristic_score = _heuristic_score(model, classification, preference)
        scored_candidates.append(
            CandidateScore(
                model=model,
                probability=probability,
                heuristic_score=heuristic_score,
                final_score=_blend_scores(probability, heuristic_score, preference),
                task_fit=model.task_score(classification.task_type),
            )
        )

    scored_candidates.sort(
        key=lambda candidate: (
            -candidate.final_score,
            -candidate.probability,
            -candidate.heuristic_score,
            -candidate.task_fit,
            candidate.model.latency,
            candidate.model.price,
            candidate.model.name,
        )
    )
    return scored_candidates[0].model
