# Frontend/backend integration

Merged `origin/sahas/frontend` at `289b6c9` into `backend/sunay` based on
`324cb09`. All incoming frontend routes and assets are retained. The existing
FastAPI services, migrations, database models, and voice/browser endpoints are
unchanged.

- `/` retains the Aide landing page and canyon animation.
- `/clinician`, `/profile`, `/records`, `/identity`, `/consent`, and `/avatar`
  retain the clinician, capability, verification, consent, and avatar flows.
- `/feed`, `/marketplace`, `/wall`, and `/agent` retain the patient app UI.
- `/agent` uses Hermes for live chat and exposes guided browsing and modes.
  Its original fixture response is available using **Demo responses**; switching
  this option starts a fresh conversation so fixture claims are not sent to Hermes.
- `/voice` exposes the existing encrypted recording, cloning, and rebuild flow
  for the signed-in Appwrite account. Clinician preview patients remain fixtures;
  they are not used as owners of real voice recordings.
- `/home`, `/settings`, `/signup`, `/login`, and `/verify` retain the backend
  branch's account/accessibility and agent workspace functionality.

Both AuthProvider and SessionProvider are mounted: Appwrite identifies the real
account; the Aide session controls demo patient selection and adaptive rendering.
Clinician records, trends, and marketplace fixtures retain their existing local
behavior; this merge does not implement new persistence APIs for those screens.

Keep server credentials in the root `.env`. The existing frontend variables
`NEXT_PUBLIC_BACKEND_URL`, `NEXT_PUBLIC_HERMES_URL`,
`NEXT_PUBLIC_HERMES_API_KEY`, and Appwrite settings continue to work.
The frontend health client also accepts the incoming `NEXT_PUBLIC_API_BASE` alias.

Shared styling follows the incoming Aide light/dark palette. Backend components'
Tailwind color names map to that palette. All incoming package dependencies are
retained, with `cn` and `jose` retained for existing backend-branch UI code.
