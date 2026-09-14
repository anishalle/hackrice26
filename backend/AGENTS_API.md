# Axl / Hermes integration

Imported from `origin/backend/sunay`; the Next.js `frontend/` was reference only.
The Expo app remains at the repository root. Run all commands from that root.

## Local setup

1. Copy `.env.example` to `.env` if you do not already have it. Set
   `HERMES_API_KEY` to the gateway key. `.env` is ignored by Git.
2. Keep the tunnel open: `ssh -N -L 8642:127.0.0.1:8642 hermes.anishalle.com`.
3. Run `uv sync`, then `uv run uvicorn app.main:app --host 0.0.0.0 --port 8000`.
4. Set `EXPO_PUBLIC_BACKEND_URL=http://<your-Mac-LAN-IP>:8000` for a physical
   phone, or `http://127.0.0.1:8000` for an iOS simulator / local web browser.
   Android emulator uses `http://10.0.2.2:8000`. Restart Expo after changing it.
   For Expo web, set `FRONTEND_HOST` to the exact web origin, usually
   `http://localhost:8081`.
5. Send a text prompt in the Agents tab. New chat resets the Responses chain and
   closes any active stream. Leaving the mounted tab alone preserves the chat.

`DATABASE_URL` is optional for agent requests, but when configured the existing
backend checks the database at startup. Database/voice/browser routes retain
Sunay's original requirements. A valid persistent Fernet key is needed for voice
preservation; do not replace a key used to encrypt existing samples.

## Contract

`POST /api/v1/agents/responses`

```json
{"input":"Look up the official Expo website","previous_response_id":null,"stream":true}
```

The backend sends `/v1/responses` to Hermes, with server-configured model and Axl
instructions. Hermes executes its configured tools and subagents; the app does
not run a second tool loop or pretend that client-side functions are registered.
This integration exposes Hermes' existing tools, not arbitrary OpenAI-hosted tools.

With `stream: true`, the response is native SSE. Text comes from
`response.output_text.delta`. `response.output_item.added` / `.done` carry
`function_call` items (name, arguments, call_id, status) and Hermes'
`function_call_output` items (same call_id, output parts). The complete envelope
arrives in `response.completed`. Save its `response.id` and send it as
`previous_response_id` with only the next user message. No shared conversation
name is used. Tool results and final output are also preserved with `stream: false`.

The Expo view shows actual tool names, running/completed status, a result preview,
and streamed answer text. It handles HTTP errors, failure events, interrupted
streams, timeout, and chat reset. Session history is currently in-memory in Expo;
Hermes stores the server-side chain. Voice recording/transcription is still a UI
stub and reports that limitation instead of sending invented audio or an answer.
Check-in history is still seeded data and is not supplied to Hermes as real data.

This is the requested local development setup. These routes inherit the original
backend's lack of application authentication and should stay on the trusted local
network. The browser/voice integrations were imported, not exercised against real
accounts in this change. Hermes dispatch/browser tools appear in the same tool
stream when selected by its agent.

## Validation

- `uv run pytest -q`
- `uv run ruff check backend/app/api/routes/agents.py backend/tests/test_agents.py`
- `node --test tests/agent-events.test.mjs`
- `npx expo export --platform ios --output-dir /tmp/hackrice-expo-export`

Protocol references: [OpenAI Responses streaming](https://developers.openai.com/api/docs/guides/streaming-responses)
and [Expo v57 fetch](https://docs.expo.dev/versions/v57.0.0/sdk/expo/#expofetch-api).
The installed Hermes 0.21.2 gateway source was inspected to verify its concrete
function-call and function-call-output events.

## Browser sessions and execution modes

The Expo chat now creates `POST /api/v1/agents/sessions` with a mode and includes
its returned `id` as `session_id` on every Responses request. Each chat owns its
browser and Responses chain. Modes are immutable per session; changing mode starts
a new chat. GET the session for its browser URL and exact pending approval. POST
`/sessions/{id}/approval` with `approval_id` and `allow` answers only that request.
DELETE the session cancels its pending approval and closes its cloud browser.

- `guide`: no tools; explanations only.
- `together`: explicit approval before each browser action.
- `aide`: automatic page reading, scrolling, and ordinary public navigation;
  clicks, text entry, sensitive destinations and query-bearing URLs require review.
- `full`: all supported browser actions run without approval prompts, including
  clicks and typing. Validation still rejects malformed actions and non-web URLs.

The browser opens at 390 × 780 with a 390 × 700 responsive page viewport.
Browser Use retains its desktop browser identity, so sites that choose layouts
solely from the user agent may still show their desktop version. Start a new chat for these settings to apply
instead of reusing an old desktop browser. The inline preview is taller; Expand
opens a full-screen in-app viewer. Safari opens the same remote browser externally.

This app-scoped mode path exposes the controlled `axl_browser` tool (navigate,
snapshot, click, type, scroll). Arbitrary `browser_exec`, terminal, and delegation
are not exposed in these sessions, so they cannot bypass mode checks. Other Hermes
clients retain their original tools. The gateway bridge is installed on the server:

```bash
scp backend/hermes_bridge/{axl_bridge.py,install.py} hermes.anishalle.com:/tmp/
ssh hermes.anishalle.com 'python3 /tmp/install.py /home/ani/.hermes/hermes-agent && systemctl --user restart hermes-gateway'
```

The installer saves `api_server.py.axl-backup` on first install, checks exact patch
anchors, and only changes app-marked agent instances. Reinstall after a Hermes
update if needed. The backend refuses protected requests without the bridge. No
extra SSH tunnel or process is needed. Sessions are in memory; run one backend
worker and start a new chat after backend restarts.
