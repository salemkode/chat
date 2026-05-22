from __future__ import annotations

from app.core.types import Preference, RouterModel, StudioCategory, StudioProfile

FAST_HINTS = ("fast", "flash", "mini", "nano", "haiku", "instant", "turbo", "groq")
BUDGET_HINTS = ("free", "cheap", "mini", "nano", "flash", "haiku", "lite", "budget")
QUALITY_HINTS = ("pro", "opus", "sonnet", "max", "reasoning", "thinking", "o3", "o4")
CODE_HINTS = ("code", "coding", "programming", "developer", "dev")
VISION_HINTS = ("vision", "image", "multimodal", "multi-modal", "camera")
REASONING_HINTS = ("reasoning", "thinking", "analysis")


def _clamp100(value: float) -> int:
    return max(0, min(100, round(value)))


def _normalize(values: tuple[str, ...]) -> tuple[str, ...]:
    seen: set[str] = set()
    result: list[str] = []
    for value in values:
        normalized = value.strip().lower()
        if not normalized or normalized in seen:
            continue
        seen.add(normalized)
        result.append(normalized)
    return tuple(result)


def _has_hint(signals: tuple[str, ...], hints: tuple[str, ...]) -> bool:
    return any(hint in signal for signal in signals for hint in hints)


def _context_score(max_context_tokens: int | None) -> int:
    if max_context_tokens is None:
        return 38
    if max_context_tokens >= 1_000_000:
        return 100
    if max_context_tokens >= 512_000:
        return 94
    if max_context_tokens >= 200_000:
        return 86
    if max_context_tokens >= 128_000:
        return 78
    if max_context_tokens >= 64_000:
        return 66
    if max_context_tokens >= 32_000:
        return 54
    if max_context_tokens >= 8_000:
        return 42
    return 30


def _infer_category(
    *,
    auto_score: int,
    quality_score: int,
    speed_score: int,
    cost_score: int,
    context_score: int,
    has_code: bool,
    has_vision: bool,
    has_reasoning: bool,
    has_metadata: bool,
) -> StudioCategory:
    if not has_metadata:
        return "Needs metadata"
    if has_code and quality_score >= 68:
        return "Coding"
    if has_vision:
        return "Vision"
    if context_score >= 86:
        return "Long context"
    if has_reasoning and quality_score >= 72:
        return "Reasoning"
    if speed_score >= 82 and quality_score >= 52:
        return "Fast"
    if cost_score >= 82:
        return "Budget"
    if auto_score >= 76:
        return "Best default"
    return "Needs metadata"


def build_studio_profile(model: RouterModel, preference: Preference = "balanced") -> StudioProfile:
    signals = _normalize((model.name, *model.tags))
    context_score = _context_score(model.max_context_tokens)
    has_code = _has_hint(signals, CODE_HINTS) or model.task_score("code") >= 0.82
    has_vision = _has_hint(signals, VISION_HINTS)
    has_tools = model.supports_tools or "tools" in signals or "tool_calling" in signals
    has_fast = _has_hint(signals, FAST_HINTS) or model.speed >= 0.82 or model.latency <= 0.15
    has_budget = _has_hint(signals, BUDGET_HINTS) or model.price <= 0.2
    has_reasoning = (
        _has_hint(signals, REASONING_HINTS)
        or _has_hint(signals, QUALITY_HINTS)
        or model.intelligence >= 0.82
        or model.task_score("analysis") >= 0.84
    )
    has_metadata = model.max_context_tokens is not None and len(signals) > 1

    quality_score = _clamp100(
        48
        + model.intelligence * 22
        + model.task_score("analysis") * 10
        + model.task_score("code") * 8
        + (8 if has_reasoning else 0)
        + (6 if has_tools else 0)
        + (6 if has_vision else 0)
    )
    speed_score = _clamp100(42 + model.speed * 38 + (1 - model.latency) * 20 + (8 if has_fast else 0))
    cost_score = _clamp100(42 + (1 - model.price) * 46 + (12 if has_budget else 0))

    if preference == "quality":
        auto_score = _clamp100(
            quality_score * 0.56 + speed_score * 0.1 + cost_score * 0.04 + context_score * 0.24 + (6 if has_tools else 0)
        )
    elif preference == "speed":
        auto_score = _clamp100(
            quality_score * 0.22 + speed_score * 0.42 + cost_score * 0.14 + context_score * 0.12 + (10 if has_tools else 0)
        )
    elif preference == "cost":
        auto_score = _clamp100(
            quality_score * 0.2 + speed_score * 0.12 + cost_score * 0.42 + context_score * 0.12 + (8 if has_tools else 0)
        )
    else:
        auto_score = _clamp100(
            quality_score * 0.42 + speed_score * 0.18 + cost_score * 0.16 + context_score * 0.18 + (6 if has_tools else 0)
        )

    category = _infer_category(
        auto_score=auto_score,
        quality_score=quality_score,
        speed_score=speed_score,
        cost_score=cost_score,
        context_score=context_score,
        has_code=has_code,
        has_vision=has_vision,
        has_reasoning=has_reasoning,
        has_metadata=has_metadata,
    )

    routing_tags = _normalize(
        (
            *signals,
            category.lower().replace(" ", "-"),
            "tools" if has_tools else "",
            "reasoning" if has_reasoning else "",
            "budget" if has_budget else "",
            "fast" if has_fast else "",
            "long-context" if context_score >= 78 else "",
        )
    )[:8]

    reasons = tuple(
        reason
        for reason in (
            "Has routing metadata" if has_metadata else "Missing tags or context window",
            "Reasoning signal" if has_reasoning else "",
            "Tool-ready" if has_tools else "",
            "Vision-ready" if has_vision else "",
            "Large context" if context_score >= 78 else "",
            "Cost-friendly" if has_budget else "",
            "Speed-friendly" if has_fast else "",
        )
        if reason
    )

    return StudioProfile(
        auto_score=auto_score,
        category=category,
        quality_score=quality_score,
        speed_score=speed_score,
        cost_score=cost_score,
        context_score=context_score,
        routing_tags=routing_tags,
        reasons=reasons,
    )
