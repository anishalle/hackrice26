"""API schemas live here; add SQLModel table models when persistence is needed."""

from typing import Literal

from pydantic import BaseModel


class HealthResponse(BaseModel):
    status: Literal["ok"]


class BrowserLiveViewResponse(BaseModel):
    """A safe subset of a Browser Use cloud-browser session."""

    active: bool
    session_id: str | None = None
    live_url: str | None = None
    started_at: str | None = None
