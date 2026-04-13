from __future__ import annotations


def test_healthz_is_public(client) -> None:
    response = client.get("/healthz")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


def test_models_requires_auth(client) -> None:
    response = client.get("/models")
    assert response.status_code == 401


def test_capabilities_requires_auth(client) -> None:
    response = client.get("/capabilities")
    assert response.status_code == 401


def test_capabilities_returns_router_contract(client, auth_headers) -> None:
    response = client.get("/capabilities", headers=auth_headers)
    assert response.status_code == 200
    payload = response.json()
    assert payload["service"] == "router-agent"
    assert payload["contract"] == "auto-model-router-v1"
    assert payload["auth"] == "bearer"
    assert payload["endpoints"]["route"] == "/route"


def test_route_requires_auth(client) -> None:
    response = client.post(
        "/route",
        json={"messages": [{"role": "user", "content": "route me"}]},
    )
    assert response.status_code == 401
