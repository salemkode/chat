from __future__ import annotations

import math
import re
from collections.abc import Sequence

from app.core.types import RequestClassification, TaskType

CODE_PATTERNS = (
    r"```",
    r"\bpython\b",
    r"\btypescript\b",
    r"\bjavascript\b",
    r"\bjava\b",
    r"\bsql\b",
    r"\bdef\b",
    r"\bclass\b",
    r"\bfunction\b",
    r"\bbug\b",
    r"\bdebug\b",
    r"\brefactor\b",
    r"\btraceback\b",
    r"\bapi\b",
)

MATH_PATTERNS = (
    r"\bmath\b",
    r"\balgebra\b",
    r"\bcalculus\b",
    r"\bprobability\b",
    r"\bstatistics\b",
    r"\bmatrix\b",
    r"\bsolve\b",
    r"\bequation\b",
    r"[=+\-/*^]",
    r"[∑∫√π]",
)

ANALYSIS_PATTERNS = (
    r"\banalysis\b",
    r"\banalyze\b",
    r"\bcompare\b",
    r"\btradeoff\b",
    r"\barchitecture\b",
    r"\bbenchmark\b",
    r"\bdesign\b",
    r"\bevaluate\b",
    r"\bstrategy\b",
    r"\boptimi[sz]e\b",
)

TOOLS_PATTERNS = (
    r"\btool\b",
    r"\btools\b",
    r"\bsearch\b",
    r"\bbrowse\b",
    r"\bfunction call\b",
    r"\bwebhook\b",
    r"\bapi call\b",
)

COMPLEXITY_PATTERNS = (
    r"\bmulti-step\b",
    r"\bproduction\b",
    r"\bscalable\b",
    r"\boptimi[sz]e\b",
    r"\barchitecture\b",
    r"\bbenchmark\b",
    r"\btradeoff\b",
)


def merge_messages(messages: Sequence[object]) -> str:
    parts: list[str] = []
    for message in messages:
        content = getattr(message, "content", None)
        if content is None and isinstance(message, dict):
            content = message.get("content")
        if isinstance(content, str) and content.strip():
            parts.append(content.strip())
    return "\n".join(parts)


def _pattern_score(text: str, patterns: tuple[str, ...]) -> int:
    return sum(len(re.findall(pattern, text, flags=re.IGNORECASE)) for pattern in patterns)


def estimate_input_tokens(text: str) -> int:
    stripped = text.strip()
    if not stripped:
        return 1
    return max(1, math.ceil(len(stripped) / 4))


def classify_text(text: str) -> RequestClassification:
    normalized = text.lower()
    estimated_input_tokens = estimate_input_tokens(text)

    code_score = _pattern_score(normalized, CODE_PATTERNS)
    math_score = _pattern_score(normalized, MATH_PATTERNS)
    analysis_score = _pattern_score(normalized, ANALYSIS_PATTERNS)

    task_scores: dict[TaskType, int] = {
        "general": 0,
        "code": code_score,
        "math": math_score,
        "analysis": analysis_score,
    }
    task_type = max(task_scores.items(), key=lambda item: (item[1], item[0] == "general"))[0]
    if task_scores[task_type] == 0:
        task_type = "general"

    complexity = 0.15
    complexity += min(estimated_input_tokens / 4000, 0.35)
    complexity += min(_pattern_score(normalized, COMPLEXITY_PATTERNS) * 0.08, 0.24)
    if "```" in text:
        complexity += 0.12
    if len(re.findall(r"\d", normalized)) >= 10:
        complexity += 0.08
    if task_type in {"code", "math", "analysis"}:
        complexity += 0.1

    needs_tools = _pattern_score(normalized, TOOLS_PATTERNS) > 0

    return RequestClassification(
        task_type=task_type,
        complexity=max(0.0, min(1.0, complexity)),
        estimated_input_tokens=estimated_input_tokens,
        needs_tools=needs_tools,
    )


def classify_messages(messages: Sequence[object]) -> RequestClassification:
    return classify_text(merge_messages(messages))
