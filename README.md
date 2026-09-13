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

## Guided browser

Set `BROWSER_USE_API_KEY` in `.env` to enable the user-approved guided browser.
The backend creates a short-lived Browser Use cloud browser, opens the approved
landing page through a private CDP connection, and returns only its interactive
live-view URL to the frontend. The CDP URL and API key remain server-side.

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
    routes/        # Health and Browser Use route modules
  core/
    config.py      # Typed environment settings
    db.py          # PostgreSQL engine, pgvector registration, request sessions
  services/
    browser_use.py # Guided cloud-browser lifecycle and CDP controls
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

```sh
docker build -t hackrice26 .
docker run --rm -p 8000:8000 hackrice26
```

Pass `--env-file .env` to `docker run` if you created a configuration file.
