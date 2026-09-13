# HackRice 26 — Axis

An interface that reads your capability profile.

```
backend/    FastAPI (uv, Python 3.12) — see BACKEND.md
frontend/   Next.js 16 + React 19 + Tailwind v4 + shadcn
reference/  Measured design tokens from the reference sites
```

## Run

```sh
# backend — http://localhost:8000, docs at /docs
uv sync && uv run uvicorn app.main:app --reload

# frontend — http://localhost:3000
cd frontend && npm install && npm run dev
```

**Set `FRONTEND_HOST=http://localhost:3000` in the backend's `.env`.** It
defaults to `:5173` (a Vite default), and the backend's CORS allows exactly one
origin — browser calls from Next on `:3000` are rejected before reaching a
route otherwise.

## The idea

A **Persona ID** carries a machine-readable capability profile across five
independent axes — vision, hearing, motor control, speech, pace. Two things
read it at runtime:

1. **The verification router** (`/identity`). A standard liveness check asks
   you to turn your head. If your profile says you can't, that check isn't
   offered — and the screen names the exact demand that ruled it out rather
   than hiding it.
2. **The interface renderer.** Type scale, target size, contrast, density,
   motion and the whole interaction model derive from the profile. At
   `vision: 0` the app doesn't get bigger text — it becomes a different
   interface: one item at a time, read aloud, advanced by two targets filling
   half the viewport.

## Routes

| Route | What it is |
|---|---|
| `/` | Landing, with the WebGL duotone canyon |
| `/login` → `/verify` | Appwrite magic-link sign-in and its callback |
| `/profile` | Plot your capability profile; consequences annotate live |
| `/identity` | Which identity checks you can finish, and why not the others |
| `/consent` | Scoped provider authorization (fictional Meridian Health) |
| `/feed` · `/agent` | The social half and the assistive half |

`/verify` belongs to Appwrite's magic link. The capability-based identity
check is `/identity` — they are different things and both are needed.

## Try the adaptation

Start at `/profile`, move an axis, watch the margin. Then visit `/feed`:

| Set this | And the app does this |
|---|---|
| Vision → *I don't use sight to read a screen* | Voice-first surface, one post at a time, read aloud |
| Vision → *heavy magnification* | Type ×1.5, contrast to max, display weight raised |
| Motor → *can't turn my head or hold a device* | Selfie liveness and document scan drop out; targets 56px |
| Speech → *I don't speak aloud* | Voice passphrase drops out; nothing requires voice |
| Pace → *one thing at a time* | One post per screen, motion off |

Hold anywhere — or hold **space** — to talk to the agent.

## Where things live

```
frontend/lib/capability.ts    the five axes and the Profile type
frontend/lib/adaptation.ts    Profile → Adaptation. Every UI difference derives here
frontend/lib/verification.ts  each modality's real requirements, and the router
frontend/lib/meridian.ts      the fictional provider and its FHIR-shaped scopes
frontend/lib/session.tsx      capability profile store
frontend/lib/auth-context.tsx Appwrite account (from the backend scaffold)
frontend/lib/api.ts           FastAPI client
frontend/components/canyon/   the WebGL duotone shader
```

Components never branch on disability — they branch on `Adaptation`. Adding an
axis means editing one file.

## Simulated, deliberately

- **Meridian Health is fictional**, standing in for a real provider
  integration. Its scopes mirror FHIR resource/field pairs so swapping in a
  real one is mechanical.
- **Identity verification is simulated.** No identity service is contacted.
- **Speech synthesis is real** where the browser supports it; recognition is
  simulated and labelled as such on screen.

## Design

Light-first: warm cream paper with deep navy ink, on river.ai's measured
palette, with Persona's `#3f48fd` carrying the primary action. See
[DESIGN.md](DESIGN.md) and [reference/extracted-tokens.md](reference/extracted-tokens.md).

## Integrated backend

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
    routes/        # Health, browser, and voice-preservation route modules
  core/
    config.py      # Typed environment settings
    db.py          # PostgreSQL engine, pgvector registration, request sessions
  services/
    browser_use.py # Guided cloud-browser lifecycle and CDP controls
    voice_preservation.py # Encrypted samples and server-side ElevenLabs calls
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
