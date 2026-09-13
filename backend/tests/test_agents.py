import json

import httpx
import pytest
from fastapi.testclient import TestClient
from pydantic import SecretStr

from app.api.routes import agents
from app.core.config import settings
from app.main import app
from app.services.agent_browser import SESSIONS


@pytest.fixture
def client(monkeypatch):
    monkeypatch.setattr(settings, "DATABASE_URL", None)
    monkeypatch.setattr(settings, "HERMES_API_KEY", SecretStr("test-secret"))
    with TestClient(app) as client:
        session = client.post("/api/v1/agents/sessions", json={"mode": "guide"}).json()
        original_post = client.post

        def post(url, **kwargs):
            if url == "/api/v1/agents/responses":
                kwargs["json"] = {**kwargs["json"], "session_id": session["id"]}
            return original_post(url, **kwargs)

        client.post = post
        client.axl_session_id = session["id"]
        yield client
        SESSIONS.clear()


def mock_hermes(monkeypatch, handler):
    original = handler

    def handler(request):
        if request.url.path == "/v1/axl/capabilities":
            return httpx.Response(200, json={"version": 1})
        if request.url.path.endswith("/calls"):
            return httpx.Response(200, json={"calls": []})
        return original(request)

    monkeypatch.setattr(
        agents,
        "hermes_client",
        lambda: httpx.AsyncClient(
            base_url="http://hermes/", transport=httpx.MockTransport(handler)
        ),
    )


def test_stream_preserves_tool_events_and_continuation(client, monkeypatch):
    SESSIONS[client.axl_session_id].previous_response_id = "resp_old"
    events = [
        {"type": "response.created", "response": {"id": "resp_new"}},
        {
            "type": "response.output_item.added",
            "item": {
                "type": "function_call",
                "call_id": "call_1",
                "name": "terminal",
                "arguments": '{"command":"pwd"}',
                "status": "in_progress",
            },
        },
        {
            "type": "response.output_item.done",
            "item": {
                "type": "function_call_output",
                "call_id": "call_1",
                "output": [{"type": "input_text", "text": "/home/ani"}],
            },
        },
        {"type": "response.output_text.delta", "delta": "Hello"},
        {"type": "response.completed", "response": {"id": "resp_new"}},
    ]
    wire = "".join(f"event: {e['type']}\ndata: {json.dumps(e)}\n\n" for e in events)

    def handler(request):
        assert request.url.path == "/v1/responses"
        payload = json.loads(request.content)
        assert payload["previous_response_id"] == "resp_old"
        assert payload["input"] == "hello"
        assert payload["stream"] is True
        assert payload["store"] is True
        assert "messages" not in payload
        return httpx.Response(
            200, text=wire, headers={"Content-Type": "text/event-stream"}
        )

    mock_hermes(monkeypatch, handler)
    response = client.post(
        "/api/v1/agents/responses",
        json={"input": "hello", "previous_response_id": "resp_old"},
    )
    assert response.status_code == 200
    assert response.text == wire


def test_nonstream_retains_output(client, monkeypatch):
    result = {
        "id": "resp_1",
        "output": [{"type": "function_call", "call_id": "call_1"}],
    }
    mock_hermes(monkeypatch, lambda _: httpx.Response(200, json=result))
    response = client.post(
        "/api/v1/agents/responses", json={"input": "hi", "stream": False}
    )
    assert response.json() == result


@pytest.mark.parametrize(
    "upstream,status", [(401, 502), (404, 404), (429, 429), (500, 500)]
)
def test_upstream_error_redaction(client, monkeypatch, upstream, status):
    mock_hermes(monkeypatch, lambda _: httpx.Response(upstream, text="private-key"))
    response = client.post("/api/v1/agents/responses", json={"input": "hi"})
    assert response.status_code == status
    assert "private-key" not in response.text


def test_missing_config_and_empty_input(client, monkeypatch):
    assert (
        client.post("/api/v1/agents/responses", json={"input": " "}).status_code == 422
    )
    monkeypatch.setattr(settings, "HERMES_API_KEY", None)
    assert (
        client.post("/api/v1/agents/responses", json={"input": "hi"}).status_code == 503
    )


def test_timeout(client, monkeypatch):
    def handler(request):
        raise httpx.ReadTimeout("private details", request=request)

    mock_hermes(monkeypatch, handler)
    assert (
        client.post("/api/v1/agents/responses", json={"input": "hi"}).status_code == 504
    )
