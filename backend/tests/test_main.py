from fastapi.testclient import TestClient

from app.core.config import settings
from app.main import app


def test_health_and_openapi(monkeypatch) -> None:
    # Unit tests do not depend on a developer's configured remote database.
    monkeypatch.setattr(settings, "DATABASE_URL", None)
    with TestClient(app) as client:
        response = client.get("/api/v1/health")
        assert response.status_code == 200
        assert response.json() == {"status": "ok"}
        schema = client.get("/api/v1/openapi.json")
        assert schema.status_code == 200
        assert "/api/v1/health" in schema.json()["paths"]
        assert "/api/v1/voice/profile" in schema.json()["paths"]
