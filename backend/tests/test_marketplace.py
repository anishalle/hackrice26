"""Marketplace: request validation without a database, and the full round trip
against an embedded PostgreSQL when `pgserver` is installed.

Run the integration half with:

    uv run --with pgserver pytest backend/tests/test_marketplace.py
"""

import pytest
from fastapi.testclient import TestClient

from app.api.deps import get_db
from app.core import db as core_db
from app.core.config import settings
from app.main import app
from app.services.marketplace import slugify

HANDLE = {"X-Owner-Subject": "@jordan"}
NEW_SKILL = {
    "title": "Pill Box Checker",
    "description": "Photographs the weekly pill box and flags a missed dose.",
    "tags": ["Care", "Daily"],
}


def test_slugify() -> None:
    assert slugify("Voice Bank Builder") == "voice-bank-builder"
    assert slugify("  Éye-Gaze  Tune-Up!! ") == "eye-gaze-tune-up"
    assert slugify("!!!") == "skill"
    assert len(slugify("x" * 200)) <= 48


@pytest.fixture
def client_without_db(monkeypatch):
    monkeypatch.setattr(settings, "DATABASE_URL", None)
    app.dependency_overrides[get_db] = lambda: None
    with TestClient(app) as client:
        yield client
    app.dependency_overrides.pop(get_db, None)


@pytest.mark.parametrize(
    "body",
    [
        {**NEW_SKILL, "title": "ab"},
        {**NEW_SKILL, "tags": []},
        {**NEW_SKILL, "tags": ["Care", "Daily", "Speech"]},
        {**NEW_SKILL, "tags": ["Cooking"]},
        {**NEW_SKILL, "description": "short"},
    ],
)
def test_share_rejects_bad_input(client_without_db, body) -> None:
    response = client_without_db.post("/api/v1/skills", json=body, headers=HANDLE)
    assert response.status_code == 422


def test_share_requires_owner_header(client_without_db) -> None:
    assert client_without_db.post("/api/v1/skills", json=NEW_SKILL).status_code == 422
    assert client_without_db.delete("/api/v1/skills/voice-bank").status_code == 422


@pytest.fixture(scope="module")
def migrated_database_url(tmp_path_factory):
    pgserver = pytest.importorskip("pgserver")
    from alembic import command
    from alembic.config import Config

    server = pgserver.get_server(str(tmp_path_factory.mktemp("pg")))
    # A unix-socket URL, which the strict DSN type rejects; the settings object
    # does not validate on assignment, and the app only ever stringifies it.
    url = server.get_uri()
    previous = settings.DATABASE_URL
    settings.DATABASE_URL = url
    try:
        command.upgrade(Config("alembic.ini"), "head")
        yield url
    finally:
        settings.DATABASE_URL = previous
        core_db.dispose_database()
        server.cleanup()


@pytest.fixture
def client(migrated_database_url, monkeypatch):
    monkeypatch.setattr(settings, "DATABASE_URL", migrated_database_url)
    with TestClient(app) as client:
        yield client


def test_seeded_catalogue(client) -> None:
    listing = client.get("/api/v1/skills").json()
    slugs = [s["slug"] for s in listing]
    assert len(slugs) >= 13
    assert slugs[0] == "voice-bank"  # highest karma first
    assert all(not s["mine"] for s in listing)

    detail = client.get("/api/v1/skills/voice-bank").json()
    assert detail["author"] == "@sunay"
    assert detail["featured"] is True
    assert len(detail["docs"]["forum"]) == 3
    assert client.get("/api/v1/skills/nope").status_code == 404


def test_share_then_remove_own_skill(client) -> None:
    created = client.post("/api/v1/skills", json=NEW_SKILL, headers=HANDLE)
    assert created.status_code == 201, created.text
    skill = created.json()
    assert skill["slug"] == "pill-box-checker"
    assert skill["author"] == "@jordan"
    assert skill["karma"] == 0 and skill["featured"] is False
    assert skill["mine"] is True

    # Same title again gets a distinct slug rather than a conflict.
    again = client.post("/api/v1/skills", json=NEW_SKILL, headers=HANDLE).json()
    assert again["slug"] == "pill-box-checker-2"

    listed = {s["slug"]: s for s in client.get("/api/v1/skills", headers=HANDLE).json()}
    assert listed["pill-box-checker"]["mine"] is True
    assert listed["voice-bank"]["mine"] is False

    # Seeded skills belong to nobody; another handle cannot remove yours.
    assert client.delete("/api/v1/skills/voice-bank", headers=HANDLE).status_code == 403
    assert (
        client.delete(
            "/api/v1/skills/pill-box-checker", headers={"X-Owner-Subject": "@sahas"}
        ).status_code
        == 403
    )

    assert (
        client.delete("/api/v1/skills/pill-box-checker", headers=HANDLE).status_code
        == 204
    )
    assert client.get("/api/v1/skills/pill-box-checker").status_code == 404
    assert (
        client.delete("/api/v1/skills/pill-box-checker", headers=HANDLE).status_code
        == 404
    )
    client.delete("/api/v1/skills/pill-box-checker-2", headers=HANDLE)


def test_migration_downgrade_and_upgrade_again(migrated_database_url) -> None:
    from alembic import command
    from alembic.config import Config

    config = Config("alembic.ini")
    command.downgrade(config, "20260913_0002")
    command.upgrade(config, "head")
