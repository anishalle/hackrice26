from typing import Any

import httpx
from playwright.async_api import Error as PlaywrightError
from playwright.async_api import TimeoutError as PlaywrightTimeoutError
from playwright.async_api import async_playwright

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
    """Launch an interactive browser and open the approved landing page."""
    if settings.BROWSER_USE_API_KEY is None:
        raise BrowserUseNotConfiguredError(
            "BROWSER_USE_API_KEY is not configured on the backend"
        )

    headers = {
        "Content-Type": "application/json",
        "X-Browser-Use-API-Key": settings.BROWSER_USE_API_KEY.get_secret_value(),
    }
    payload = {
        "proxyCountryCode": "us",
        "timeout": 15,
        "browserScreenWidth": 1280,
        "browserScreenHeight": 720,
    }
    url = "https://api.browser-use.com/api/v4/browsers"

    async with httpx.AsyncClient(timeout=30) as client:
        response = await client.post(url, headers=headers, json=payload)
        response.raise_for_status()

    session_data: dict[str, Any] = response.json()
    live_url = session_data.get("liveUrl")
    session_id = session_data.get("id")
    cdp_url = session_data.get("cdpUrl")
    if not live_url or not session_id or not cdp_url:
        raise RuntimeError(
            "Browser Use created a browser without its live-control URLs"
        )

    navigation_summary = await _open_landing_page(str(cdp_url), website_url)

    return {
        "session_id": str(session_id),
        "live_url": str(live_url),
        "started_at": str(session_data.get("startedAt") or ""),
        "status": str(session_data.get("status") or "active"),
        "last_step_summary": navigation_summary,
    }


async def get_guided_browser_session(session_id: str) -> dict[str, str]:
    """Return the user-visible status for a session we created."""
    if settings.BROWSER_USE_API_KEY is None:
        raise BrowserUseNotConfiguredError(
            "BROWSER_USE_API_KEY is not configured on the backend"
        )

    headers = {"X-Browser-Use-API-Key": settings.BROWSER_USE_API_KEY.get_secret_value()}
    url = f"https://api.browser-use.com/api/v4/browsers/{session_id}"
    async with httpx.AsyncClient(timeout=15) as client:
        response = await client.get(url, headers=headers)
        response.raise_for_status()

    session_data: dict[str, Any] = response.json()
    return {
        "session_id": str(session_data["id"]),
        "live_url": str(session_data.get("liveUrl") or ""),
        "started_at": str(session_data.get("startedAt") or ""),
        "status": str(session_data.get("status") or "unknown"),
        "last_step_summary": "",
    }


async def stop_guided_browser(session_id: str) -> None:
    """End a browser session when the user is done with its guided view."""
    if settings.BROWSER_USE_API_KEY is None:
        raise BrowserUseNotConfiguredError(
            "BROWSER_USE_API_KEY is not configured on the backend"
        )

    headers = {
        "Content-Type": "application/json",
        "X-Browser-Use-API-Key": settings.BROWSER_USE_API_KEY.get_secret_value(),
    }
    url = f"https://api.browser-use.com/api/v4/browsers/{session_id}"
    async with httpx.AsyncClient(timeout=15) as client:
        response = await client.patch(url, headers=headers, json={"action": "stop"})
        response.raise_for_status()


async def scroll_guided_browser(session_id: str, amount: int) -> None:
    """Move the remote page a small, predictable number of pixels."""
    if settings.BROWSER_USE_API_KEY is None:
        raise BrowserUseNotConfiguredError(
            "BROWSER_USE_API_KEY is not configured on the backend"
        )

    headers = {"X-Browser-Use-API-Key": settings.BROWSER_USE_API_KEY.get_secret_value()}
    url = f"https://api.browser-use.com/api/v4/browsers/{session_id}"
    async with httpx.AsyncClient(timeout=15) as client:
        response = await client.get(url, headers=headers)
        response.raise_for_status()

    session_data: dict[str, Any] = response.json()
    cdp_url = session_data.get("cdpUrl")
    if not cdp_url:
        raise RuntimeError("The guided browser is no longer available")

    try:
        async with async_playwright() as playwright:
            browser = await playwright.chromium.connect_over_cdp(
                str(cdp_url), timeout=15_000
            )
            try:
                if not browser.contexts:
                    raise RuntimeError("The guided browser has no available page")
                context = browser.contexts[0]
                page = context.pages[0] if context.pages else await context.new_page()
                await page.mouse.wheel(0, amount)
            finally:
                await browser.close()
    except PlaywrightError as error:
        raise RuntimeError("The guided browser could not scroll") from error


async def _open_landing_page(cdp_url: str, website_url: str) -> str:
    """Navigate through CDP without exposing the privileged CDP URL to the client."""
    try:
        async with async_playwright() as playwright:
            browser = await playwright.chromium.connect_over_cdp(
                cdp_url, timeout=15_000
            )
            try:
                if not browser.contexts:
                    raise RuntimeError(
                        "The Browser Use browser has no available context"
                    )

                context = browser.contexts[0]
                page = context.pages[0] if context.pages else await context.new_page()
                try:
                    await page.goto(
                        website_url, wait_until="domcontentloaded", timeout=30_000
                    )
                    return f"Opened {website_url}. You can now control this browser."
                except PlaywrightTimeoutError:
                    return "Browser is loading the website. You can control it now."
            finally:
                await browser.close()
    except (PlaywrightError, RuntimeError):
        # The cloud browser is already live even when CDP navigation is unavailable.
        return (
            "Browser started. Open the website yourself using the browser address bar."
        )
