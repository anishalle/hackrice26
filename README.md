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
