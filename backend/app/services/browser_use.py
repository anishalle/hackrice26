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
