from __future__ import annotations

from app.core.classifier import classify_text


def test_classify_code_prompt() -> None:
    result = classify_text("Help me debug this Python function and refactor the SQL query")
    assert result.task_type == "code"
    assert 0 <= result.complexity <= 1
    assert result.estimated_input_tokens > 0


def test_classify_math_prompt() -> None:
    result = classify_text("Solve this calculus equation and show the matrix steps")
    assert result.task_type == "math"


def test_classify_analysis_prompt() -> None:
    result = classify_text("Compare these architectures and explain the tradeoff benchmark")
    assert result.task_type == "analysis"
