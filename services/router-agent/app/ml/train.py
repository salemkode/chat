from __future__ import annotations

import json
import random
import sys
from pathlib import Path

import joblib
from sklearn.linear_model import LogisticRegression
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import StandardScaler

SERVICE_ROOT = Path(__file__).resolve().parents[2]
if str(SERVICE_ROOT) not in sys.path:
    sys.path.insert(0, str(SERVICE_ROOT))

from app.core.features import FEATURE_NAMES, build_feature_vector
from app.core.types import RequestClassification, RouterModel

SEED_PATH = Path(__file__).resolve().with_name("seed_dataset.jsonl")
OUTPUT_PATH = Path(__file__).resolve().with_name("model.pkl")


def clamp01(value: float) -> float:
    return max(0.0, min(1.0, value))


def load_scenarios() -> list[dict[str, object]]:
    scenarios: list[dict[str, object]] = []
    with SEED_PATH.open("r", encoding="utf-8") as handle:
        for line in handle:
            line = line.strip()
            if not line:
                continue
            scenarios.append(json.loads(line))
    return scenarios


def build_samples() -> tuple[list[list[float]], list[int]]:
    features: list[list[float]] = []
    labels: list[int] = []
    randomizer = random.Random(42)

    for scenario in load_scenarios():
        request = scenario["request"]
        winner = scenario["winner"]
        models = scenario["models"]

        for _ in range(20):
            classification = RequestClassification(
                task_type=request["task_type"],
                complexity=clamp01(request["complexity"] + randomizer.uniform(-0.05, 0.05)),
                estimated_input_tokens=max(
                    1,
                    int(request["estimated_input_tokens"] * randomizer.uniform(0.92, 1.08)),
                ),
                needs_tools=bool(request.get("needs_tools", False)),
            )

            for raw_model in models:
                model = RouterModel(
                    name=raw_model["name"],
                    intelligence=clamp01(
                        raw_model["intelligence"] + randomizer.uniform(-0.03, 0.03)
                    ),
                    price=clamp01(raw_model["price"] + randomizer.uniform(-0.03, 0.03)),
                    speed=clamp01(raw_model["speed"] + randomizer.uniform(-0.03, 0.03)),
                    latency=clamp01(raw_model["latency"] + randomizer.uniform(-0.03, 0.03)),
                    task_scores={
                        task: clamp01(score + randomizer.uniform(-0.03, 0.03))
                        for task, score in raw_model["task_scores"].items()
                    },
                    max_context_tokens=raw_model.get("max_context_tokens"),
                    supports_tools=bool(raw_model.get("supports_tools", False)),
                )
                features.append(
                    build_feature_vector(
                        classification=classification,
                        model=model,
                        preference=request["preference"],
                    )
                )
                labels.append(1 if raw_model["name"] == winner else 0)

    return features, labels


def train_model() -> None:
    features, labels = build_samples()
    pipeline = Pipeline(
        steps=[
            ("scale", StandardScaler()),
            ("logreg", LogisticRegression(max_iter=2000, random_state=42)),
        ]
    )
    pipeline.fit(features, labels)
    joblib.dump(pipeline, OUTPUT_PATH)
    print(f"Trained router scorer with {len(FEATURE_NAMES)} features at {OUTPUT_PATH}")


if __name__ == "__main__":
    train_model()
