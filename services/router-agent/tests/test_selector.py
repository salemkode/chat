from __future__ import annotations

from app.core.selector import select_model
from app.core.types import RequestClassification, RouterModel


class FakeScorer:
    def __init__(self, scores: dict[str, float]) -> None:
        self._scores = scores

    def predict_probability(self, _features: list[float]) -> float:
        raise AssertionError("Use NamedFakeScorer in tests that rely on feature lookup")


class NamedFakeScorer:
    def __init__(self, values: list[float]) -> None:
        self._values = iter(values)

    def predict_probability(self, _features: list[float]) -> float:
        return next(self._values)


def build_model(name: str, latency: float, price: float, task_fit: float = 0.8) -> RouterModel:
    return RouterModel(
        name=name,
        intelligence=0.8,
        price=price,
        speed=0.7,
        latency=latency,
        task_scores={
            "general": task_fit,
            "code": task_fit,
            "math": task_fit,
            "analysis": task_fit,
        },
        max_context_tokens=64000,
        supports_tools=False,
    )


def test_selector_returns_single_eligible_model() -> None:
    classification = RequestClassification(
        task_type="general",
        complexity=0.2,
        estimated_input_tokens=2000,
    )
    model = build_model("only-model", latency=0.2, price=0.4)
    selected = select_model([model], classification, "balanced", NamedFakeScorer([0.1]))
    assert selected.name == "only-model"


def test_selector_uses_deterministic_tie_breakers() -> None:
    classification = RequestClassification(
        task_type="general",
        complexity=0.3,
        estimated_input_tokens=1200,
    )
    slower = build_model("b-model", latency=0.3, price=0.2, task_fit=0.8)
    faster = build_model("a-model", latency=0.2, price=0.2, task_fit=0.8)
    selected = select_model(
        [slower, faster],
        classification,
        "balanced",
        NamedFakeScorer([0.7, 0.7]),
    )
    assert selected.name == "a-model"
