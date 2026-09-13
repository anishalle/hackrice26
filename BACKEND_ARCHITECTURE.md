# Backend architecture

## Purpose

This project is a browser-guidance agent for people with disabilities. It helps
someone reach a page, understand what is on it, and complete a browser-based
task using their preferred input and output methods. Community-contributed
skills teach the agent how a particular website, workflow, and accessibility
setup works.

The backend is the source of truth for:

- user accessibility preferences and consent boundaries;
- reusable, versioned marketplace skills;
- retrieval of relevant skills with PostgreSQL + pgvector;
- agent runs, browser observations, and user approvals;
- audit records for consequential actions.

It does **not** hold browser credentials, silently submit irreversible actions,
or claim control of a browser that the user has not explicitly connected.

## Existing foundation

The current backend already provides the right minimal FastAPI shape:

```text
backend/app/
  main.py                 FastAPI setup, CORS, router registration
  api/main.py             API router collector
  api/routes/home.py      health endpoint
  api/deps.py             future shared dependencies
  core/config.py          Pydantic environment settings
  core/db.py              database placeholder
  models.py               Pydantic schemas placeholder
  crud.py                 persistence placeholder
```

The implementation should extend this structure rather than replace it. The
existing `/api/v1/health` route remains the first dependency-free health check.

## System shape

```text
Next.js accessible web app ─── HTTPS / SSE ───> FastAPI API
                                                    │
                                                    ├── PostgreSQL (Tiger Data)
                                                    │     ├── relational data
                                                    │     └── pgvector embeddings
                                                    │
                                                    ├── retrieval + policy service
                                                    │
                                                    └── hosted Hermes Agent
                                                          ├── browser session
                                                          ├── text-to-speech
                                                          └── structured step events
```

### Hermes is the hosted agent runtime

A normal web page cannot reliably read, click, or inspect arbitrary websites:
browser same-origin rules prevent it, and many destinations forbid embedding in
an iframe. Hermes runs the isolated browser session on infrastructure we host,
while the user sees accessible guidance and controls in our Next.js app.

Hermes receives the goal, accessibility preferences, current run state, and
only the skill versions selected by RAG. It navigates, reads the page's
accessibility tree, and proposes bounded browser actions. FastAPI remains the
policy and data authority: Hermes does not own marketplace skills, user
profiles, approval records, or long-term sensitive data.

For the hackathon, start a fresh Hermes browser session for each run and destroy
it when the run ends. A later product can offer an explicit connection to a
person's own browser for sites requiring an existing signed-in session.

## Core concepts

### Accessibility profile

An accessibility profile is a set of interaction preferences, not a diagnosis.
It tells the agent which input and output forms to prioritize.

```text
input:  text | speech | keyboard | switch | screen_reader
output: text | speech | captions | simplified_steps | screen_reader
preferences: target size, step-by-step pacing, reduced motion, confirmation level
```

Every agent response is returned as structured content plus optional rendering
hints. Text is always available; speech and captions are alternate renderings,
not exclusive channels.

### Marketplace skill

A skill is a reusable guide for a browser task. It is not arbitrary executable
code. It contains a destination pattern, preconditions, clear steps, known
limitations, compatibility metadata, and a safety classification.

Examples of compatibility metadata:

- site/domain and URL pattern;
- platform and browser;
- screen-reader, keyboard, voice, switch, or visual interaction method;
- author-supplied confidence and community verification count;
- whether the instructions are current for the site version.

### Agent run

An agent run is a bounded session: one user, one browser tab/session, one goal.
It stores the selected skills, page observations, generated guidance, and every
approval. It must be resumable and explainable.

### Interaction modes

The user chooses a mode when starting a run and can change it at any time.
The mode is a server-enforced policy sent to Hermes with every task; it is not
merely a frontend label.

| Mode | Agent behavior | User experience |
| --- | --- | --- |
| **Guide me** | Inspects the page and explains the next action, but never clicks, types, or changes the destination site. | The user performs each action; the app offers **Repeat**, **Back**, and **Next instruction**. |
| **Assist me** | Opens pages and performs safe, reversible navigation. It pauses before entering data, choosing a meaningful option, or changing page state. | One clear instruction/action at a time, with **Continue**, **Explain**, **Take control**, and **Stop**. |
| **Do it with me** | Performs routine actions one at a time and reports the result after each action. It still pauses at every approval boundary. | The user sees/hears “I found the refill page. Shall I open it?” before every step. |

All modes adapt presentation to the accessibility profile: speech always has a
text transcript, captions carry audio content, screen-reader output has semantic
text, and cognitive-support profiles see one decision at a time.

### Approval boundary

Actions have three classes:

```text
read       inspect or summarize page content; no user confirmation per step
prepare    fill a draft or propose navigation; user reviews the result
commit     submit, send, purchase, share sensitive data, or change an account;
           explicit confirmation immediately before the action is required in
           every mode
```

Hermes must never execute a `commit` action solely because the model requested
it. FastAPI creates an approval request bound to the exact URL and action
payload; Hermes receives the action only after the user approves it.

## PostgreSQL, Tiger Data, and pgvector

Use the supplied PostgreSQL connection URL as `DATABASE_URL`. Tiger Data
(formerly Timescale) is PostgreSQL-compatible, so the transactional schema,
SQLAlchemy/SQLModel access, Alembic migrations, and `pgvector` extension all
live in the same database.

```sql
CREATE EXTENSION IF NOT EXISTS vector;
```

Use ordinary PostgreSQL tables for product data. `pgvector` is specifically for
semantic retrieval of skill content; it is not the source of truth for a skill.

Recommended initial tables:

```text
users
accessibility_profiles
browser_connections
skills
skill_versions
skill_embeddings
skill_verifications
agent_runs
agent_events
approval_requests
```

### Table responsibilities

| Table | Responsibility |
| --- | --- |
| `users` | Account identity; keep minimal for the demo. |
| `accessibility_profiles` | Preferred input/output methods, pacing, reduced-motion and confirmation preferences. |
| `browser_connections` | Opaque extension session ID, current-tab metadata, permission expiry. Never store website passwords or cookies. |
| `skills` | Marketplace identity, title, owner, status, domain, goal, safety class. |
| `skill_versions` | Immutable structured instruction versions and compatibility metadata. |
| `skill_embeddings` | One embedding per searchable skill/version chunk, plus pgvector column and metadata filters. |
| `skill_verifications` | Community reports that a skill worked, failed, or is outdated. |
| `agent_runs` | Goal, profile snapshot, browser connection, run status, selected skill IDs. |
| `agent_events` | Append-only timeline of observations, retrieved skills, guidance, and browser actions. |
| `approval_requests` | Proposed `prepare`/`commit` action, user decision, timestamp, and result. |

### Skill document and embedding strategy

Keep a canonical JSON document in `skill_versions.content`, for example:

```json
{
  "goal": "Find and read comment replies",
  "url_patterns": ["https://example.com/posts/*"],
  "compatibility": {
    "browsers": ["chrome", "edge"],
    "input_methods": ["screen_reader", "keyboard"],
    "output_methods": ["speech", "text"]
  },
  "steps": [
    {"kind": "navigate", "instruction": "Open the post URL."},
    {"kind": "guide", "instruction": "Move to the comments landmark."}
  ],
  "limits": ["The site layout may change."],
  "safety_class": "read"
}
```

Embed a human-readable representation of the title, goal, site, compatibility,
steps, and limits. Chunk longer skills by logical sections/steps, not arbitrary
token counts. Store each chunk with `skill_version_id`, `chunk_index`, and
filterable metadata such as `domain`, `input_methods`, `locale`, and `status`.

Retrieve with a hybrid ranking:

1. Filter to published, non-superseded skills compatible with the destination
   domain and the user's interaction preferences.
2. Run pgvector cosine similarity against the request and sanitized page
   context.
3. Boost current, community-verified skills; penalize stale or repeatedly
   failed skills.
4. Return the top few sources to the model with version IDs and attribution.

The model must receive the selected skill text and current page observation; it
must not invent a skill's steps or claim a skill succeeded without evidence.

## Browser adapter contract

Define a backend-facing adapter contract before writing an extension. A mock
adapter and a real extension both implement it.

```text
POST /browser/connections             pair a user-approved browser session
POST /browser/observations            receive sanitized current-page state
POST /browser/actions/{action_id}/result
                                      receive action completion/failure
GET  /browser/actions/next            extension polls or subscribes for approved action
```

An observation should include only what the agent needs:

```text
URL, title, visible text, semantic landmarks, accessible names/roles,
focused element, selected text, and an optional screenshot reference.
```

Avoid raw HTML when a semantic accessibility tree will do. Redact password
fields, payment fields, authentication codes, and data matching configured
sensitive patterns before leaving the browser.

Allowed action primitives should stay narrow:

```text
open_url, focus_element, activate_element, set_text, scroll, select_option
```

Each action includes its user-visible description, risk class, expiration, and
the page URL it is valid for. The extension rejects actions that do not match
the current allowed tab or have expired.

## API layout

Add feature routers under the existing `backend/app/api/routes/` directory:

```text
routes/
  home.py                  existing health check
  profiles.py              accessibility preferences
  skills.py                publish, browse, version, verify marketplace skills
  retrieval.py             internal/search endpoint for skill retrieval
  browser.py               browser pairing, observations, action results
  runs.py                  create, resume, stream, and inspect agent runs
  approvals.py             approve or reject proposed consequential actions
```

Suggested API surface:

```text
GET    /api/v1/health
GET    /api/v1/profiles/me
PATCH  /api/v1/profiles/me

POST   /api/v1/skills
GET    /api/v1/skills
GET    /api/v1/skills/{skill_id}
POST   /api/v1/skills/{skill_id}/versions
POST   /api/v1/skills/{skill_id}/verifications

POST   /api/v1/runs
POST   /api/v1/runs/{run_id}/message
GET    /api/v1/runs/{run_id}/events

POST   /api/v1/browser/connections
POST   /api/v1/browser/observations
POST   /api/v1/browser/actions/{action_id}/result

POST   /api/v1/approvals/{approval_id}/approve
POST   /api/v1/approvals/{approval_id}/reject
```

For a responsive agent UI, stream run events over Server-Sent Events first.
WebSockets can be added if bidirectional browser streaming becomes necessary.

## Backend module plan

```text
backend/app/
  api/
    deps.py                database session, current-user, browser-session dependencies
    routes/                HTTP-only route handlers
  core/
    config.py              DATABASE_URL, CORS, model/provider keys, environment
    db.py                  engine, session factory, startup extension checks
  models/
    db.py                  SQLAlchemy/SQLModel persistence entities
    schemas.py             request/response Pydantic models
  services/
    retrieval.py           embedding, metadata filtering, pgvector ranking
    skills.py              skill validation/versioning/indexing
    agent.py               bounded run orchestration and tool policy
    browser.py             adapter/action queue and observation sanitization
    approvals.py           commit-action policy and audit creation
  crud/
    skills.py              database queries
    runs.py
    profiles.py
```

The current `models.py` and `crud.py` can become packages when the first real
models are added. Make that change in one focused commit, updating imports and
tests together.

## Configuration

Extend `core/config.py` with typed settings. Do not commit actual credentials.

```text
DATABASE_URL=postgresql+psycopg://...
FRONTEND_HOST=http://localhost:3000
EMBEDDING_MODEL=...
LLM_MODEL=...
LLM_API_KEY=...
BROWSER_EXTENSION_ORIGIN=chrome-extension://<extension-id>
```

The current `FRONTEND_HOST` default is `http://localhost:5173`; change it to
`http://localhost:3000` when connecting the existing Next.js frontend, or make
the allowed origins a validated list. Never use a wildcard origin with
credentialed browser sessions.

Recommended dependencies to add when implementation begins:

```text
sqlalchemy
psycopg[binary]
alembic
pgvector
```

Use the provider's supported embedding client/SDK only after choosing the model
provider. Keep that client behind `services/retrieval.py` so changing providers
does not change routes or data models.

## Privacy and safety requirements

- Browser connection is explicit, per user, and revocable.
- Never persist passwords, session cookies, one-time codes, payment details, or
  raw sensitive form fields.
- Do not send page observations to an LLM until they have been minimized and
  redacted.
- Always show what skill(s) were selected and why they match.
- Every `commit` action requires an immediate explicit confirmation, bound to
  the exact URL and action payload.
- Treat skill instructions as untrusted content. They cannot grant tools,
  override policy, or convert an action from `commit` to `read`.
- Keep an auditable event timeline, but apply retention limits and deletion
  controls for user data.

## Delivery order

Build in this order to keep the hackathon scope credible:

1. Add database engine/session, Alembic, and the core tables (`profiles`,
   `skills`, `skill_versions`, `skill_embeddings`).
2. Implement skill publishing and a seeded skill catalog.
3. Implement embedding/indexing plus pgvector retrieval with metadata filters.
4. Implement `agent_runs` that return structured guidance from retrieved skills
   using a mock browser observation.
5. Add the browser-adapter API and a mock browser client in the frontend.
6. Add a small extension or a controlled demo browser surface using the same
   adapter contract.
7. Add approvals before any action that changes external state.

The smallest convincing vertical slice is: a user profile, a browser page
observation, semantic retrieval of one compatible community skill, adaptive
step-by-step guidance, and an explicit “Open / continue” action.
