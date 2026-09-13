# Aide deployment

Target: `ubuntu@34.200.110.216`, in `~/apps/aide`. No Tailscale. Hermes stays on
`ani@20.112.123.120`, listening on Azure's `127.0.0.1:8642`.

Phone → HTTPS proxy → FastAPI container → SSH tunnel container → Azure Hermes.
The API also contacts the existing hosted PostgreSQL database, Browser Use, and
ElevenLabs directly. Appwrite configuration stays as it is.

## First deployment

Prerequisites: SSH access to both hosts; Docker Engine with Compose 2.30+ on the
personal server; `rsync` on both this computer and the personal server; passwordless
sudo there for ownership of the dedicated tunnel key. Docker runs on the personal
server, not Azure or your PC. Check `ss -lnt` there before using port 18000.

From this checkout:

```sh
uv run python deploy/manage.py init
uv run python deploy/manage.py push
```

Use `--host ubuntu@REACHABLE_ADDRESS` on either command if needed.

`init` reads the existing `.env`, copies only backend settings, preserves an existing
voice-encryption key or generates one when absent, and generates a random backend
API key when absent. It creates a **dedicated** tunnel SSH key, installs its public
key on Azure with shell/PTY access disabled and forwarding restricted to Hermes,
and pins Azure's host key obtained through the authenticated SSH connection.
It does not copy your personal SSH keys. It refuses to overwrite existing server
configuration. If interrupted during initialization, inspect the files before retrying.

Credentials are stored in ignored `deploy/private/` locally and on the server.
Back up this directory securely, especially `backend.env`: losing its
`VOICE_SAMPLE_ENCRYPTION_KEY` makes saved voice samples unreadable. If existing
recordings were encrypted using a key from another environment, restore that key
before initializing. Never generate a replacement for an existing voice bank.

`push` uploads an explicit selection of source files, builds using `uv.lock`, starts
the containers, and checks API authentication and the Hermes bridge. It preserves
server secrets. Migrations are a separate `manage.py migrate` action and must run
before starting against a new database. The current hosted database is already
migrated; see the migration-history note below.

## HTTPS and phone access

The API binds only to `127.0.0.1:18000` on the personal server. The SSH tunnel has
no host port. The domain is `aide.anishalle.com`; its bootstrap NGINX entry is installed at
`/etc/nginx/conf.d/aide.anishalle.com.conf`. HTTPS is live via Certbot (auto-renewing; HTTP redirects to HTTPS). Do not change the API binding to `0.0.0.0`
as a substitute for HTTPS.

If the server already has an HTTPS NGINX virtual host, adapt
`deploy/nginx.conf.example` inside that host. It supports streaming chat and voice
uploads. If port 18000 is occupied, set `AIDE_API_PORT` in `~/apps/aide/.env` and
change the proxy upstream accordingly. For a web client, set `FRONTEND_HOST` in
`~/apps/aide/deploy/private/backend.env` to the exact web origin, then recreate
the API with `docker compose up -d`. Native requests do not require a CORS origin.

After HTTPS is working, set these in the Expo build environment:

```dotenv
EXPO_PUBLIC_BACKEND_URL=https://aide.anishalle.com
EXPO_PUBLIC_BACKEND_API_KEY=THE_VALUE_FROM_DEPLOY_PRIVATE_CLIENT_ENV
```

The URL is the origin, without `/api/v1`. Keep the existing Appwrite variables.
These values are bundled into the app; they are shared single-user credentials,
not Appwrite user authentication. All API endpoints, including docs, require
`X-API-Key`, except `GET /api/v1/health` and CORS preflight. Production refuses to
start without an API key of at least 32 characters. Anyone holding the key has
access to the API, including the demo voice-owner header.

### Native app without Metro

Use a release build with its JavaScript bundled into the app. A development app
that loads JavaScript from your computer still depends on that computer even when
the backend is remote.

For an attached iPhone with signing already configured on this Mac:

```sh
npx expo run:ios --configuration Release --device
```

Alternatively, `eas.json` includes an internal `preview` build (APK on Android;
registered devices and Apple signing required on iOS). Configure the
`EXPO_PUBLIC_*` values in EAS's `preview` environment before running
`npx eas-cli build --profile preview --platform ios` (or `android`). The ignored
local `.env` is not a substitute for EAS build-environment configuration.

An exported JS bundle alone is not an installed or signed phone app. Verify on
the phone with Metro stopped, then with the PC off.

## Routine management

```sh
uv run python deploy/manage.py push     # upload, rebuild, start, verify
uv run python deploy/manage.py status
uv run python deploy/manage.py logs
uv run python deploy/manage.py check    # auth + Hermes, no paid model request
uv run python deploy/manage.py restart
```

The same stack can be managed directly on the server using
`cd ~/apps/aide && docker compose ...`. Containers restart after a reboot if Docker
is enabled at boot. SSH keepalives detect lost connections and Docker restarts
the exited tunnel process. Logs rotate at three 10 MB files per service.

For credential changes, edit the server's `deploy/private/backend.env`, then
`docker compose up -d` to recreate the API. Rotating `BACKEND_API_KEY` also requires
updating/rebuilding the phone app. Do not casually rotate the voice-encryption key.

Keep one API worker: active browser sessions and approvals are in memory and reset
on deployment/restart. Saved voice recordings remain in PostgreSQL. This deployment
does not turn demo fixtures or chat state into database-backed product features.

## Migration history

The hosted database reports Alembic revision `20260913_0003`, but this repository
(including fetched remote branches) only contains migrations through `0002`.
The tables/columns used by this backend are present. Deployment uses that existing
schema without stamping, downgrading, or deleting data. Restore the original
`0003` migration from whoever applied it before using `manage.py migrate` on this
database or making further schema changes. No placeholder migration was invented.

## Verification status

Deployed to `ubuntu@34.200.110.216` in `~/apps/aide`. Both Docker containers are
healthy; API authentication and server-to-Azure Hermes capabilities checks passed.
The NGINX entry is installed and `nginx -t` passed. DNS confirmation, certificate
issuance, and a physical-phone build/test are still pending. The local `.env`
already contains the intended HTTPS URL and matching phone API key.

Local validation: 46 backend tests, 4 streaming-parser tests, and an iOS JavaScript
export passed. Docker images were built on the personal server, not this computer.

References: [Expo SDK 57](https://docs.expo.dev/versions/v57.0.0/),
[local release builds](https://docs.expo.dev/guides/local-app-production/),
[internal distribution](https://docs.expo.dev/build/internal-distribution/),
[Compose startup order](https://docs.docker.com/compose/how-tos/startup-order/).
