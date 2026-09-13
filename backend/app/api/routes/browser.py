import httpx
from fastapi import APIRouter, HTTPException

from app.models import BrowserLiveViewResponse
from app.services.browser_use import (
    BrowserUseNotConfiguredError,
    get_active_browser_live_view,
)

router = APIRouter(prefix="/browser", tags=["browser"])


@router.get("/live-view", response_model=BrowserLiveViewResponse)
async def browser_live_view() -> BrowserLiveViewResponse:
    """Find the active Browser Use tab that Hermes is controlling."""
    try:
        session = await get_active_browser_live_view()
    except BrowserUseNotConfiguredError as error:
        raise HTTPException(status_code=503, detail=str(error)) from error
    except httpx.HTTPError as error:
        raise HTTPException(
            status_code=502, detail="Browser Use could not be reached"
        ) from error

    if session is None:
        return BrowserLiveViewResponse(active=False)
    return BrowserLiveViewResponse(active=True, **session)
