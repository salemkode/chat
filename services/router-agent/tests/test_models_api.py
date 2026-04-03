from __future__ import annotations


def test_models_update_rejects_duplicate_names(client, auth_headers) -> None:
    response = client.post(
        "/models/update",
        headers=auth_headers,
        json={
            "models": [
                {
                    "name": "dup-model",
                    "intelligence": 0.6,
                    "price": 0.2,
                    "speed": 0.8,
                    "latency": 0.2,
                },
                {
                    "name": "dup-model",
                    "intelligence": 0.7,
                    "price": 0.4,
                    "speed": 0.6,
                    "latency": 0.3,
                },
            ]
        },
    )
    assert response.status_code == 422


def test_models_update_replaces_registry(client, auth_headers, baseline_models_payload) -> None:
    first = client.post("/models/update", headers=auth_headers, json=baseline_models_payload)
    assert first.status_code == 200
    assert first.json() == {"count": 5, "version": 1}

    second = client.post(
        "/models/update",
        headers=auth_headers,
        json={
            "models": [
                {
                    "name": "single-replacement",
                    "intelligence": 0.7,
                    "price": 0.3,
                    "speed": 0.7,
                    "latency": 0.2,
                }
            ]
        },
    )
    assert second.status_code == 200
    assert second.json() == {"count": 1, "version": 2}

    listing = client.get("/models", headers=auth_headers)
    assert listing.status_code == 200
    assert listing.json()["count"] == 1
    assert [model["name"] for model in listing.json()["models"]] == ["single-replacement"]
