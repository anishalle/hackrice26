from typing import Any

import httpx

from app.core.config import settings


class BrowserUseNotConfiguredError(RuntimeError):
    pass


async def get_active_browser_live_view() -> dict[str, str] | None:
    """Return the newest active Browser Use session without exposing its CDP URL."""
    if settings.BROWSER_USE_API_KEY is None:
        raise BrowserUseNotConfiguredError(
            "BROWSER_USE_API_KEY is not configured on the backend"
        )

    headers = {
        "X-Browser-Use-API-Key": settings.BROWSER_USE_API_KEY.get_secret_value(),
    }
    url = f"{str(settings.BROWSER_USE_API_BASE_URL).rstrip('/')}/browsers"

    async with httpx.AsyncClient(timeout=15) as client:
        response = await client.get(
            url,
            headers=headers,
            params={"filterBy": "active", "pageSize": 20},
        )
        response.raise_for_status()

    payload: dict[str, Any] = response.json()
    active_sessions = [
        item
        for item in payload.get("items", [])
        if isinstance(item, dict)
        and item.get("status") == "active"
        and item.get("liveUrl")
    ]
    if not active_sessions:
        return None

    newest = max(active_sessions, key=lambda item: str(item.get("startedAt", "")))
    return {
        "session_id": str(newest["id"]),
        "live_url": str(newest["liveUrl"]),
        "started_at": str(newest.get("startedAt") or ""),
    }


async def start_guided_browser(website_url: str, mode: str) -> dict[str, str]:
    """Create a Browser Use task with a live-view URL for the current user."""
    if settings.BROWSER_USE_API_KEY is None:
        raise BrowserUseNotConfiguredError(
            "BROWSER_USE_API_KEY is not configured on the backend"
        )

    mode_instruction = (
        "Navigate to the page and inspect only the landing page. Do not type, click, "
        "submit, sign in, or make a selection. Stop after describing the page."
        if mode == "assist"
        else "Navigate to the page only. Do not type, click, submit, sign in, or make "
        "a selection. Stop immediately after the page finishes loading."
    )
    headers = {
        "Content-Type": "application/json",
        "X-Browser-Use-API-Key": settings.BROWSER_USE_API_KEY.get_secret_value(),
    }
    payload = {
        "task": f"Open {website_url}. {mode_instruction}",
        "keepAlive": True,
    }
    url = "https://api.browser-use.com/api/v3/sessions"

    async with httpx.AsyncClient(timeout=30) as client:
        response = await client.post(url, headers=headers, json=payload)
        response.raise_for_status()

    session_data: dict[str, Any] = response.json()
    live_url = session_data.get("liveUrl")
    session_id = session_data.get("id")
    if not live_url or not session_id:
        raise RuntimeError("Browser Use created a session without a live URL")

    return {
        "session_id": str(session_id),
        "live_url": str(live_url),
        "started_at": str(session_data.get("createdAt") or ""),
    }
