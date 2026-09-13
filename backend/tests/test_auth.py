import pytest
from fastapi.testclient import TestClient
from pydantic import SecretStr

from app.core.config import settings
from app.main import app

KEY = "test-key-" + "x" * 40


@pytest.fixture
def client(monkeypatch):
    monkeypatch.setattr(settings, "DATABASE_URL", None)
    monkeypatch.setattr(settings, "BACKEND_API_KEY", SecretStr(KEY))
    monkeypatch.setattr(settings, "FASTAPI_ENV", "production")
    with TestClient(app) as client:
        yield client


@pytest.mark.parametrize(
    "path",
    [
        "/docs",
        "/api/v1/openapi.json",
        "/api/v1/voice/profile",
        "/api/v1/agents/sessions",
        "/api/v1/agents/responses",
        "/api/v1/browser/sessions",
    ],
)
def test_protected_before_body_validation(client, path):
    for method in (client.get, client.post):
        assert method(path).status_code == 401
        assert method(path, headers={"X-API-Key": "wrong"}).status_code == 401


def test_valid_key_and_public_health(client):
    assert client.get("/api/v1/health").status_code == 200
    assert (
        client.get("/api/v1/openapi.json", headers={"X-API-Key": KEY}).status_code
        == 200
    )
    response = client.post(
        "/api/v1/agents/sessions",
        json={"mode": "guide"},
        headers={"X-API-Key": KEY},
    )
    assert response.status_code == 201
    client.delete(
        "/api/v1/agents/sessions/" + response.json()["id"],
        headers={"X-API-Key": KEY},
    )


def test_cors_preflight_and_unauthorized_response(client):
    headers = {"Origin": settings.FRONTEND_HOST}
    response = client.options(
        "/api/v1/agents/responses",
        headers={
            **headers,
            "Access-Control-Request-Method": "POST",
            "Access-Control-Request-Headers": "x-api-key,content-type",
        },
    )
    assert response.status_code == 200
    response = client.post("/api/v1/agents/responses", headers=headers)
    assert response.status_code == 401
    assert response.headers["access-control-allow-origin"] == settings.FRONTEND_HOST


@pytest.mark.parametrize("key", [None, SecretStr("short")])
def test_production_refuses_missing_or_short_key(monkeypatch, key):
    monkeypatch.setattr(settings, "FASTAPI_ENV", "production")
    monkeypatch.setattr(settings, "BACKEND_API_KEY", key)
    with pytest.raises(RuntimeError, match="BACKEND_API_KEY"):
        with TestClient(app):
            pass
