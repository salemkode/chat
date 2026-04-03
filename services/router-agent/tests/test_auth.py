from __future__ import annotations


def test_healthz_is_public(client) -> None:
    response = client.get("/healthz")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


def test_models_requires_auth(client) -> None:
    response = client.get("/models")
    assert response.status_code == 401


def test_route_requires_auth(client) -> None:
    response = client.post(
        "/route",
        json={"messages": [{"role": "user", "content": "route me"}]},
    )
    assert response.status_code == 401
