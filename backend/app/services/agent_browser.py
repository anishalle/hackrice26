"""Per-chat browser ownership and one-shot approvals for Axl's tool boundary."""

import asyncio
import ipaddress
import re
import secrets
from dataclasses import dataclass, field
from typing import Literal
from urllib.parse import urlsplit

import httpx
from fastapi import HTTPException
from playwright.async_api import async_playwright
from pydantic import BaseModel, ConfigDict, Field

from app.core.config import settings

Mode = Literal["guide", "together", "aide", "full"]
SENSITIVE = re.compile(
    r"login|log-in|signin|sign-in|auth|oauth|password|checkout|payment|purchase|delete|logout|submit|confirm|unsubscribe",
    re.I,
)


def browser_key():
    return settings.BROWSER_USE_API_KEY.get_secret_value()


class BrowserAction(BaseModel):
    model_config = ConfigDict(extra="forbid")
    action: Literal["navigate", "snapshot", "click", "type", "scroll"]
    url: str = Field(default="", max_length=2048)
    target: str = Field(default="", pattern=r"^(?:e[0-9]+)?$", max_length=16)
    text: str = Field(default="", max_length=4000)
    amount: int = Field(default=500, ge=-1000, le=1000)


def public_url(url: str) -> str:
    parts = urlsplit(url)
    if (
        parts.scheme not in {"http", "https"}
        or not parts.hostname
        or parts.username
        or parts.password
    ):
        raise ValueError("Use a public http or https website")
    host = parts.hostname.lower()
    if host == "localhost" or "." not in host or host.endswith((".local", ".internal")):
        raise ValueError("Local network addresses are not supported")
    try:
        address = ipaddress.ip_address(host)
    except ValueError:
        pass
    else:
        if not address.is_global:
            raise ValueError("Local network addresses are not supported")
    return url


def needs_approval(mode: Mode, action: BrowserAction) -> bool:
    if mode == "full":
        return False
    if mode == "guide":
        raise ValueError("Guide me does not operate the browser")
    if mode == "together":
        return True
    if action.action in {"snapshot", "scroll"}:
        return False
    if action.action == "navigate":
        public_url(action.url)
        # Unknown query parameters may encode state changes; review those too.
        return bool(SENSITIVE.search(action.url) or urlsplit(action.url).query)
    return True  # click and typing are never silently treated as navigation


@dataclass
class BrowserSession:
    mode: Mode
    id: str = field(default_factory=lambda: secrets.token_urlsafe(24))
    running: bool = False
    closed: bool = False
    previous_response_id: str | None = None
    browser_id: str | None = None
    live_url: str | None = None
    page: object = None
    browser: object = None
    cdp: object = None
    playwright: object = None
    pending: dict | None = None
    approval: asyncio.Future | None = None
    lock: asyncio.Lock = field(default_factory=asyncio.Lock)
    error: str | None = None
    refs: dict = field(default_factory=dict)

    def public(self):
        return {
            "id": self.id,
            "mode": self.mode,
            "running": self.running,
            "live_url": self.live_url,
            "browser_open": self.page is not None,
            "url": self.page.url if self.page else None,
            "pending": self.pending,
            "error": self.error,
        }

    async def ensure_browser(self):
        if self.page:
            return
        if settings.BROWSER_USE_API_KEY is None:
            raise ValueError("Browser Use is not configured")
        async with httpx.AsyncClient(timeout=30) as client:
            response = await client.post(
                "https://api.browser-use.com/api/v4/browsers",
                headers={"X-Browser-Use-API-Key": browser_key()},
                json={
                    "timeout": 30,
                    "allowResizing": True,
                    "browserScreenWidth": 390,
                    "browserScreenHeight": 780,
                },
            )
            response.raise_for_status()
            data = response.json()
        self.browser_id = data["id"]
        self.live_url = data.get("liveUrl")
        self.playwright = await async_playwright().start()
        self.browser = await self.playwright.chromium.connect_over_cdp(
            data["cdpUrl"], timeout=30000
        )
        context = self.browser.contexts[0]
        self.page = context.pages[0] if context.pages else await context.new_page()
        self.page.set_default_timeout(15000)
        # A phone-sized responsive viewport; cloud stealth retains its browser identity.
        self.cdp = await context.new_cdp_session(self.page)
        await self.cdp.send(
            "Emulation.setDeviceMetricsOverride",
            {
                "width": 390,
                "height": 700,
                "deviceScaleFactor": 1,
                "mobile": True,
                "screenWidth": 390,
                "screenHeight": 780,
            },
        )
        await self.page.bring_to_front()

    async def snapshot(self):
        # ElementHandles bind to the actual reviewed element, not a selector which
        # could silently pick a different target after a page change.
        for handle in self.refs.values():
            await handle.dispose()
        self.refs.clear()
        elements = []
        handles = await self.page.locator(
            "a, button, input:not([type=hidden]), textarea, select, [role=button]"
        ).element_handles()
        for handle in handles[:80]:
            if not await handle.is_visible():
                await handle.dispose()
                continue
            ref = f"e{len(elements)}"
            details = await handle.evaluate(
                (
                    "e => ({tag:e.tagName.toLowerCase(), label:(e.innerText "
                    "|| e.getAttribute('aria-label') || "
                    "e.getAttribute('placeholder') || e.getAttribute('name')"
                    " || '').slice(0,120), type:e.getAttribute('type') || "
                    "''})"
                )
            )
            self.refs[ref] = handle
            elements.append({"target": ref, **details})
        return {
            "url": self.page.url,
            "title": await self.page.title(),
            "text": (await self.page.locator("body").inner_text())[:16000],
            "elements": elements,
        }

    async def execute(self, raw):
        async with self.lock:
            if self.closed:
                return {"error": "Browser chat has been closed"}
            try:
                action = BrowserAction.model_validate(raw)
                if action.action == "navigate":
                    public_url(action.url)
                review = needs_approval(self.mode, action)
                target = None
                if action.action in {"click", "type"}:
                    target = self.refs.get(action.target)
                    if target is None:
                        raise ValueError(
                            "Read the page again to obtain a current target"
                        )
                    # Guided modes keep credential entry user-operated.
                    if action.action == "type" and self.mode != "full":
                        field_info = await target.evaluate(
                            "e => [e.type,e.autocomplete,e.name,e.id].join(' ')"
                        )
                        if re.search(
                            r"password|one-time|otp|credit|card|cc-|cvc|cvv|ssn",
                            field_info,
                            re.I,
                        ):
                            raise ValueError(
                                (
                                    "Enter credentials or payment details yourself in"
                                    " the live browser"
                                )
                            )
                reviewed_url = self.page.url if self.page else None
                fingerprint_script = (
                    "e => [e.tagName,e.innerText,e.getAttribute('href'),"
                    "e.getAttribute('type'),e.getAttribute('name')].join('|')"
                )
                fingerprint = (
                    await target.evaluate(fingerprint_script) if target else None
                )
                if review:
                    label = {
                        "navigate": "Open website",
                        "snapshot": "Read this page",
                        "click": "Click on page",
                        "type": "Enter text",
                        "scroll": "Scroll page",
                    }[action.action]
                    detail = (
                        action.url
                        if action.action == "navigate"
                        else self.page.url
                        if self.page
                        else "Start a browser"
                    )
                    target_label = (await target.inner_text())[:120] if target else None
                    self.pending = {
                        "id": secrets.token_urlsafe(16),
                        "label": label,
                        "detail": detail,
                        "target": target_label or action.target,
                        "text": action.text if action.action == "type" else None,
                    }
                    self.approval = asyncio.get_running_loop().create_future()
                    try:
                        allowed = await asyncio.wait_for(self.approval, 240)
                    except TimeoutError:
                        allowed = False
                    finally:
                        self.pending = None
                        self.approval = None
                    if not allowed or self.closed:
                        return {
                            "error": (
                                "User declined or the approval expired. "
                                "Stop this action; do not retry it."
                            )
                        }
                if review and self.page and self.page.url != reviewed_url:
                    raise ValueError("The page changed during approval. Read it again.")
                if target and await target.evaluate(fingerprint_script) != fingerprint:
                    raise ValueError(
                        "The target changed during approval. Read it again."
                    )
                await self.ensure_browser()
                if action.action == "navigate":
                    await self.page.goto(
                        action.url, wait_until="domcontentloaded", timeout=30000
                    )
                elif action.action == "click":
                    await target.click()
                elif action.action == "type":
                    await target.fill(action.text)
                elif action.action == "scroll":
                    await self.page.mouse.wheel(0, action.amount)
                await self.page.bring_to_front()
                return {"success": True, **await self.snapshot()}
            except asyncio.CancelledError:
                raise
            except Exception as error:
                # Only validation messages are returned; transport failures can
                # include privileged CDP credentials in their exception strings.
                message = (
                    str(error)
                    if isinstance(error, ValueError)
                    else (
                        "Browser action failed. Read the page again or reopen "
                        "the browser."
                    )
                )
                self.error = message
                return {"error": message}

    def resolve(self, approval_id, allow):
        if (
            not self.pending
            or self.pending["id"] != approval_id
            or not self.approval
            or self.approval.done()
        ):
            raise HTTPException(
                409, "This approval has expired or was already answered"
            )
        self.approval.set_result(allow)

    async def close(self):
        self.closed = True
        if self.approval and not self.approval.done():
            self.approval.set_result(False)
        async with self.lock:
            if self.browser:
                await self.browser.close()
            if self.playwright:
                await self.playwright.stop()
            if self.browser_id and settings.BROWSER_USE_API_KEY:
                async with httpx.AsyncClient(timeout=15) as client:
                    await client.patch(
                        f"https://api.browser-use.com/api/v4/browsers/{self.browser_id}",
                        headers={"X-Browser-Use-API-Key": browser_key()},
                        json={"action": "stop"},
                    )
            self.page = None
            self.live_url = None


SESSIONS: dict[str, BrowserSession] = {}


def get_session(session_id):
    session = SESSIONS.get(session_id)
    if session is None or session.closed:
        raise HTTPException(404, "Chat expired. Start a new chat.")
    return session
