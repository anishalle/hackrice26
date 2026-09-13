# Web frontend

Imported from `origin/sahas/frontend` at `289b6c954f9c3e62c9a43f6a42b5d90b76c27d54`.
This Next.js app is independent of the Expo app at the repository root and has its own package lock and container. Only the branch's `frontend/` directory was imported; its backend was not merged. Backend integration is deferred: existing web fixtures, authentication, and health client are retained, but this app is not wired to the root app's agent or voice APIs.

## Local development

From this directory, using Node.js 22:

```sh
npm ci
npm run dev
```

Open http://localhost:3000. Use `npm run build` for a production build and `npm run lint` for lint checks.

## Container

From the repository root:

```sh
docker compose -f frontend/compose.yaml up --build -d
```

Open http://localhost:3000. Stop with:

```sh
docker compose -f frontend/compose.yaml down
```

The multi-stage image runs Next's standalone server as the non-root `node` user. Compose binds to localhost and runs this frontend only. Set `FRONTEND_PORT` to change the host port.

Public configuration is baked into the browser bundle at build time. Supply these variables in your shell before building, or in `frontend/.env` with `docker compose --env-file frontend/.env -f frontend/compose.yaml up --build -d`:

- `NEXT_PUBLIC_API_BASE` (default `http://localhost:8000`): browser-reachable backend URL, not a Docker service hostname.
- `NEXT_PUBLIC_APPWRITE_ENDPOINT`, `NEXT_PUBLIC_APPWRITE_PROJECT_ID`, `NEXT_PUBLIC_APPWRITE_PROJECT_NAME`: public Appwrite configuration; defaults preserve the imported app's project.

Rebuild after changing public configuration. Local `next dev` also reads `frontend/.env.local`. Keep secrets out of public variables. When integrating later, configure backend CORS for the frontend origin and register the frontend hostname in Appwrite.
