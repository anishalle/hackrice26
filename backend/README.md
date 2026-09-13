# HackRice 26 backend

Minimal FastAPI backend structured after the
[official template](https://github.com/fastapi/full-stack-fastapi-template/tree/master/backend).
Runs without a database, secrets, or frontend build.

## Run

Install Python 3.12+ and [uv](https://docs.astral.sh/uv/), then run from the repository root:

```sh
uv sync
uv run uvicorn app.main:app --reload
```

- Health: http://localhost:8000/api/v1/health
- API docs: http://localhost:8000/docs
- OpenAPI: http://localhost:8000/api/v1/openapi.json

Optionally copy `.env.example` to `.env`. Environment variables override `.env`.
Sentry is enabled outside development only when `SENTRY_DSN` is supplied.

## PostgreSQL and pgvector

The backend is ready for PostgreSQL/Tiger Data and uses `pgvector` for semantic
retrieval of marketplace-skill chunks. Copy `.env.example` to `.env`, set the
provided PostgreSQL URL as `DATABASE_URL`, and run the migration:

```sh
uv run alembic upgrade head
```

The migration enables the `vector` extension and creates relational tables for
accessibility profiles, versioned skills, skill embeddings, agent runs, hosted
Hermes sessions, and approval requests. It also creates a cosine-distance HNSW
index on skill embeddings. `EMBEDDING_DIMENSIONS` defaults to 1536 and must
match the embedding model before the first migration; changing dimensions later
requires a new migration and re-indexing.

## Marketplace

The marketplace catalogue lives in the `skills` table. Migration `0003` adds
the marketplace columns (`slug`, `author_handle`, `tags`, `karma`, `featured`,
`docs`) and seeds the thirteen launch skills, each with a published version 1,
so `uv run alembic upgrade head` is the whole setup. The seed is idempotent:
re-running it against a database that already has the rows changes nothing.

| Method | Path | Purpose |
| --- | --- | --- |
| `GET` | `/api/v1/skills` | Published skills, highest karma first |
| `GET` | `/api/v1/skills/{slug}` | One skill with its long-form docs |
| `POST` | `/api/v1/skills` | Share a skill: title, description, one or two tags, optional summary |
| `DELETE` | `/api/v1/skills/{slug}` | Remove a skill you shared |

Writes name the current person in an `X-Owner-Subject` header, the same demo
identity bridge the voice endpoints use. Reads may send it too, in which case
each skill carries `mine: true` when that person shared it. Seeded skills have
no owner and cannot be removed through the API. Tags must come from the six
app categories; the first tag picks the icon in the apps.

The integration tests run the migration and the endpoints against an embedded
PostgreSQL with pgvector when `pgserver` is available, and skip otherwise:

```sh
uv run --with pgserver pytest backend/tests/test_marketplace.py
```

## Guided browser

Set `BROWSER_USE_API_KEY` in `.env` to enable the user-approved guided browser.
The backend creates a short-lived Browser Use cloud browser, opens the approved
landing page through a private CDP connection, and returns only its interactive
live-view URL to the frontend. The CDP URL and API key remain server-side.

## Voice preservation

The voice-preservation flow lets a user explicitly consent, record several short
audio samples in the web app, and save them in PostgreSQL. Each sample is
encrypted by the backend before it is stored in the `voice_samples.audio_data`
`bytea` column. When the user presses **Create my voice**, the backend decrypts
the samples only in memory and sends them to ElevenLabs' Instant Voice Cloning
endpoint. A ready cloned voice can then be used through the speech endpoint.

Add these settings to `.env` before recording:

```sh
ELEVENLABS_API_KEY=your_elevenlabs_key
# Generate this once, save it somewhere safe, and do not rotate it casually.
VOICE_SAMPLE_ENCRYPTION_KEY=your_fernet_key
```

Generate the Fernet key from the repository root:

```sh
uv run python -c 'from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())'
```

If this encryption key is lost or replaced, existing recordings cannot be
decrypted for cloning. ElevenLabs can accept a single sample, but record a
collection of clear, varied speech (at least about one minute total is a useful
starting point) for a better clone. The UI deliberately requires explicit
consent before microphone access or storage and does not contact ElevenLabs
until the user asks to create their voice.

The current `X-Voice-Owner-Subject` request header is a local demo identity
bridge supplied by the authenticated frontend. Before public deployment,
replace it with backend-verified Appwrite/JWT authentication; an unverified
header must not be used to protect personal voice recordings in production.

## Layout

```text
backend/app/
  main.py          # App setup, middleware, router registration, DB lifecycle
  models.py        # API request and response schemas
  db_models.py     # SQLAlchemy marketplace, profile, run, and approval models
  crud.py          # Stub for database operations
  api/
    main.py        # Collect feature routers
    deps.py        # Shared database-session dependency
    routes/        # Health, browser, voice-preservation, and marketplace routes
  core/
    config.py      # Typed environment settings
    db.py          # PostgreSQL engine, pgvector registration, request sessions
  services/
    browser_use.py # Guided cloud-browser lifecycle and CDP controls
    voice_preservation.py # Encrypted samples and server-side ElevenLabs calls
    marketplace.py # Catalogue reads, sharing a skill, removing your own
    retrieval.py   # pgvector skill-chunk retrieval
alembic/           # Versioned PostgreSQL/pgvector schema migrations
backend/tests/     # API smoke tests
```

For a new feature, add schemas to `models.py`, a router under `backend/app/api/routes/`, and
register it in `backend/app/api/main.py`. Keep route handlers focused on HTTP behavior.
Database-backed routes should use the `get_db` dependency in
`backend/app/api/deps.py`; schema changes belong in new Alembic migrations.

## Checks

```sh
uv run pytest
uv run ruff check .
uv run ruff format --check .
```

## Docker

See [the deployment guide](../deploy/README.md) for the personal-server Compose
stack, dedicated Azure SSH tunnel, API-key authentication, push/management commands,
and a native phone build that works without Metro. Docker builds use `uv.lock` and
include Alembic migrations. Production requires `BACKEND_API_KEY`; Expo sends the
matching `EXPO_PUBLIC_BACKEND_API_KEY` as `X-API-Key`.
