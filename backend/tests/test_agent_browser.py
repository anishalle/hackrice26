import asyncio
from unittest.mock import AsyncMock

import pytest
from fastapi import HTTPException

from app.services.agent_browser import (
    BrowserAction,
    BrowserSession,
    needs_approval,
    public_url,
)


@pytest.mark.parametrize(
    "mode,action,expected",
    [
        ("together", {"action": "snapshot"}, True),
        ("together", {"action": "navigate", "url": "https://example.com"}, True),
        ("aide", {"action": "navigate", "url": "https://example.com"}, False),
        ("aide", {"action": "navigate", "url": "https://example.com/login"}, True),
        (
            "aide",
            {"action": "navigate", "url": "https://example.com/?action=buy"},
            True,
        ),
        ("aide", {"action": "snapshot"}, False),
        ("aide", {"action": "scroll"}, False),
        ("aide", {"action": "click", "target": "e1"}, True),
        ("aide", {"action": "type", "target": "e1", "text": "hello"}, True),
    ],
)
def test_mode_policy(mode, action, expected):
    assert needs_approval(mode, BrowserAction(**action)) is expected


@pytest.mark.parametrize(
    "url",
    [
        "file:///etc/passwd",
        "javascript:alert(1)",
        "http://localhost",
        "http://127.0.0.1",
        "http://169.254.169.254",
        "https://user:secret@example.com",
    ],
)
def test_non_web_destinations_rejected(url):
    with pytest.raises(ValueError):
        public_url(url)


def test_guide_cannot_execute_even_with_hallucinated_tool():
    async def check():
        session = BrowserSession(mode="guide")
        session.ensure_browser = AsyncMock()
        result = await session.execute(
            {"action": "navigate", "url": "https://example.com"}
        )
        assert "error" in result
        session.ensure_browser.assert_not_called()

    asyncio.run(check())


def test_approval_is_exact_one_shot_and_no_browser_before_decision():
    async def check():
        session = BrowserSession(mode="together")
        session.ensure_browser = AsyncMock()
        work = asyncio.create_task(session.execute({"action": "snapshot"}))
        await asyncio.sleep(0)
        assert session.pending
        session.ensure_browser.assert_not_called()
        with pytest.raises(HTTPException):
            session.resolve("wrong-id", True)
        session.resolve(session.pending["id"], False)
        with pytest.raises(HTTPException):
            session.resolve(session.pending["id"], True)
        result = await work
        assert "declined" in result["error"]
        session.ensure_browser.assert_not_called()

    asyncio.run(check())


def test_close_revokes_pending_approval():
    async def check():
        session = BrowserSession(mode="together")
        work = asyncio.create_task(session.execute({"action": "snapshot"}))
        await asyncio.sleep(0)
        await session.close()
        assert "error" in await work
        assert session.closed and session.pending is None

    asyncio.run(check())


@pytest.mark.parametrize(
    "action",
    [
        {"action": "navigate", "url": "https://example.com/login"},
        {"action": "navigate", "url": "https://example.com/checkout?step=confirm"},
        {"action": "snapshot"},
        {"action": "scroll"},
        {"action": "click", "target": "e1"},
        {"action": "type", "target": "e1", "text": "hello"},
    ],
)
def test_full_access_never_requests_approval(action):
    assert needs_approval("full", BrowserAction(**action)) is False
