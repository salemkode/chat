from __future__ import annotations


def update_models(client, auth_headers, payload) -> None:
    response = client.post("/models/update", headers=auth_headers, json=payload)
    assert response.status_code == 200


def route(client, auth_headers, content: str, preference: str = "balanced") -> str:
    response = client.post(
        "/route",
        headers=auth_headers,
        json={
            "messages": [{"role": "user", "content": content}],
            "user": {"preference": preference},
        },
    )
    assert response.status_code == 200, response.text
    return response.json()["model"]


def test_route_returns_503_with_empty_registry(client, auth_headers) -> None:
    response = client.post(
        "/route",
        headers=auth_headers,
        json={"messages": [{"role": "user", "content": "hello"}]},
    )
    assert response.status_code == 503


def test_cost_preference_favors_cheaper_model(
    client,
    auth_headers,
    baseline_models_payload,
) -> None:
    update_models(client, auth_headers, baseline_models_payload)
    assert route(client, auth_headers, "Give me a short answer about email etiquette", "cost") == (
        "cheap-fast"
    )


def test_speed_preference_favors_lower_latency_model(
    client,
    auth_headers,
    baseline_models_payload,
) -> None:
    update_models(client, auth_headers, baseline_models_payload)
    assert route(client, auth_headers, "Summarize this note quickly", "speed") == "cheap-fast"


def test_quality_preference_favors_higher_quality_model(
    client,
    auth_headers,
    baseline_models_payload,
) -> None:
    update_models(client, auth_headers, baseline_models_payload)
    assert route(client, auth_headers, "Write a polished product announcement", "quality") == (
        "premium-smart"
    )


def test_code_prompt_prefers_code_strong_model(
    client,
    auth_headers,
    baseline_models_payload,
) -> None:
    update_models(client, auth_headers, baseline_models_payload)
    prompt = "Help me optimize this Python function, debug the traceback, and refactor the SQL."
    assert route(client, auth_headers, prompt, "balanced") == "code-pro"


def test_math_prompt_prefers_math_strong_model(
    client,
    auth_headers,
    baseline_models_payload,
) -> None:
    update_models(client, auth_headers, baseline_models_payload)
    prompt = "Solve this calculus equation and explain the matrix algebra step by step."
    assert route(client, auth_headers, prompt, "balanced") == "math-brain"


def test_long_prompt_excludes_small_context_model(client, auth_headers) -> None:
    update_models(
        client,
        auth_headers,
        {
            "models": [
                {
                    "name": "small-context-fast",
                    "intelligence": 0.82,
                    "price": 0.2,
                    "speed": 0.9,
                    "latency": 0.08,
                    "task_scores": {
                        "general": 0.8,
                        "code": 0.75,
                        "math": 0.74,
                        "analysis": 0.82,
                    },
                    "max_context_tokens": 500,
                    "supports_tools": False,
                },
                {
                    "name": "analyst-long",
                    "intelligence": 0.9,
                    "price": 0.58,
                    "speed": 0.64,
                    "latency": 0.3,
                    "task_scores": {
                        "general": 0.84,
                        "code": 0.74,
                        "math": 0.7,
                        "analysis": 0.97,
                    },
                    "max_context_tokens": 256000,
                    "supports_tools": True,
                },
            ]
        },
    )
    prompt = "Compare these architectures and benchmark the tradeoffs. " * 120
    assert route(client, auth_headers, prompt, "quality") == "analyst-long"
