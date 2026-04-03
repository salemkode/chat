from __future__ import annotations

from pathlib import Path
from typing import Protocol

import joblib

from app.core.errors import ScorerNotReadyError


class ProbabilityModel(Protocol):
    def predict_proba(self, values: list[list[float]]) -> list[list[float]]:
        ...


class SklearnModelScorer:
    def __init__(self, model: ProbabilityModel) -> None:
        self._model = model

    def predict_probability(self, features: list[float]) -> float:
        probabilities = self._model.predict_proba([features])
        if len(probabilities) == 0:
            raise ScorerNotReadyError("Loaded scorer returned no probabilities")

        first_row = probabilities[0]
        if len(first_row) < 2:
            raise ScorerNotReadyError("Loaded scorer did not return binary probabilities")
        return float(first_row[1])


def load_scorer(path: Path) -> SklearnModelScorer:
    try:
        model = joblib.load(path)
    except Exception as exc:  # pragma: no cover - exercised by startup failure path
        raise ScorerNotReadyError(f"Failed to load scorer artifact from {path}") from exc
    return SklearnModelScorer(model)
