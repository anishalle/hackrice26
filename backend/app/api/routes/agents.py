"""Responses transport. Hermes owns tool execution, including delegated agents."""

import asyncio
import contextlib
import json
import uuid
from typing import Annotated

import httpx
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, ConfigDict, StringConstraints
from starlette.responses import StreamingResponse

from app.core.config import settings
from app.services.agent_browser import SESSIONS, BrowserSession, Mode, get_session

router = APIRouter(prefix="/agents", tags=["agents"])
Prompt = Annotated[
    str, StringConstraints(strip_whitespace=True, min_length=1, max_length=32000)
]

INSTRUCTIONS = """You are Axl, the user's accessible personal assistant.
Use clear, concise language. Use available tools when needed and report their results
honestly. Never claim to have read check-ins, measured speech, or completed actions
without actual data or tool evidence. Explain limitations when data is unavailable.
Follow the selected execution mode.
"""


class AgentRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")
    session_id: str
    input: Prompt
    previous_response_id: (
        Annotated[
            str, StringConstraints(pattern=r"^resp_[a-zA-Z0-9_-]+$", max_length=128)
        ]
        | None
    ) = None
    stream: bool = True


def hermes_client() -> httpx.AsyncClient:
    return httpx.AsyncClient(
        base_url=str(settings.HERMES_BASE_URL).rstrip("/") + "/",
        headers={
            "Authorization": f"Bearer {settings.HERMES_API_KEY.get_secret_value()}"
        },
        timeout=httpx.Timeout(settings.HERMES_TIMEOUT_SECONDS, connect=10),
    )


class SessionRequest(BaseModel):
    mode: Mode = "guide"


class ApprovalRequest(BaseModel):
    approval_id: str
    allow: bool


@router.post("/sessions", status_code=201)
async def create_session(body: SessionRequest):
    session = BrowserSession(mode=body.mode)
    SESSIONS[session.id] = session
    return session.public()


@router.get("/sessions/{session_id}")
async def session_state(session_id: str):
    return get_session(session_id).public()


@router.post("/sessions/{session_id}/approval")
async def approve(session_id: str, body: ApprovalRequest):
    get_session(session_id).resolve(body.approval_id, body.allow)
    return {"ok": True}


@router.delete("/sessions/{session_id}", status_code=204)
async def close_session(session_id: str):
    session = get_session(session_id)
    try:
        await session.close()
    finally:
        SESSIONS.pop(session_id, None)


MODE_INSTRUCTIONS = {
    "full": (
        "Full Access: carry out the user's browser task autonomously with axl_browser. "
        "All supported browser actions are authorized without confirmation prompts. "
        "Do not pause to ask permission. Ask only for information you genuinely lack."
    ),
    "guide": (
        "Guide me: explain what the user should do. You have no tools "
        "and must not claim to operate a browser."
    ),
    "together": (
        "Do it with me: use axl_browser for one action at a time. Each action "
        "waits for user approval in the app. Never bundle actions. "
        "Read the returned page before choosing the next action."
    ),
    "aide": (
        "Aide me: use axl_browser for routine navigation and page reading. "
        "The app reviews clicks, typing and sensitive destinations with the user. "
        "Never bypass review. Let the user enter credentials in the live browser."
    ),
}


async def pump_tools(client, run_id, session):
    handled = set()
    while True:
        response = await client.get(f"v1/axl/{run_id}/calls", timeout=10)
        response.raise_for_status()
        for call in response.json().get("calls", []):
            call_id = call["call_id"]
            if call_id in handled:
                continue
            handled.add(call_id)
            result = await session.execute(call["arguments"])
            response = await client.post(
                f"v1/axl/{run_id}/calls/{call_id}", json=result, timeout=10
            )
            response.raise_for_status()
        await asyncio.sleep(0.25)


@router.post("/responses")
async def create_response(body: AgentRequest):
    if settings.HERMES_API_KEY is None:
        raise HTTPException(503, "Set HERMES_API_KEY in the backend .env")
    session = get_session(body.session_id)
    if session.running:
        raise HTTPException(409, "This chat already has a running response")
    if body.previous_response_id != session.previous_response_id:
        raise HTTPException(409, "Conversation changed. Start a new chat.")
    session.running = True
    session.error = None
    client = hermes_client()
    upstream = None
    pump = None
    transferred = False
    run_id = uuid.uuid4().hex

    async def cleanup():
        if pump:
            pump.cancel()
            with contextlib.suppress(asyncio.CancelledError, Exception):
                await pump
        if session.approval and not session.approval.done():
            session.approval.set_result(False)
        session.pending = None
        session.approval = None
        if upstream is not None:
            await upstream.aclose()
        await client.aclose()
        session.running = False

    try:
        # Fail closed: never send a protected run to an unpatched gateway.
        capability = await client.get("v1/axl/capabilities", timeout=10)
        if capability.status_code != 200 or capability.json().get("version") != 1:
            raise HTTPException(503, "Hermes browser controls are not installed")
        control = "AXL_CONTROL_V1 " + json.dumps(
            {"run_id": run_id, "mode": session.mode}
        )
        request = client.build_request(
            "POST",
            "v1/responses",
            json={
                **body.model_dump(exclude_none=True, exclude={"session_id"}),
                "model": settings.HERMES_MODEL,
                "instructions": control
                + "\n"
                + INSTRUCTIONS
                + MODE_INSTRUCTIONS[session.mode],
                "store": True,
            },
        )
        # Needed before the first byte for non-streaming Responses as well.
        pump = asyncio.create_task(pump_tools(client, run_id, session))
        upstream = await client.send(request, stream=True)
        if upstream.is_error:
            status = upstream.status_code
            detail = "Hermes rejected the request"
            if status == 404:
                detail = "Hermes response or endpoint not found; start a new chat"
            if status in (401, 403):
                detail, status = (
                    "Hermes authentication failed; check the backend credentials",
                    502,
                )
            raise HTTPException(status, detail)
        if not body.stream:
            await upstream.aread()
            result = upstream.json()
            if result.get("status") == "completed":
                session.previous_response_id = result["id"]
            return result
        if "text/event-stream" not in upstream.headers.get("content-type", ""):
            raise HTTPException(502, "Hermes did not return a Responses event stream")
        transferred = True
    except httpx.TimeoutException as error:
        raise HTTPException(504, "Hermes timed out") from error
    except (httpx.HTTPError, ValueError) as error:
        raise HTTPException(
            502, "Hermes could not be reached or returned invalid data"
        ) from error
    finally:
        if not transferred:
            await cleanup()

    async def events():
        try:
            data_lines = []
            async for line in upstream.aiter_lines():
                if pump.done():
                    pump.result()  # Propagate a failed controller instead of hanging.
                if line.startswith("data:"):
                    data_lines.append(line[5:].lstrip())
                if not line and data_lines:
                    raw = "\n".join(data_lines)
                    data_lines = []
                    if raw != "[DONE]":
                        event = json.loads(raw)
                        if event.get("type") == "response.completed":
                            session.previous_response_id = event["response"]["id"]
                yield (line + "\n").encode()
        except (httpx.HTTPError, ValueError):
            payload = json.dumps(
                {"type": "error", "message": "Hermes browser connection interrupted"}
            )
            yield f"\n\nevent: error\ndata: {payload}\n\n".encode()
        finally:
            await cleanup()

    return StreamingResponse(
        events(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
        },
    )
