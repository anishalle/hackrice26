import httpx
from fastapi import APIRouter, HTTPException

from app.models import (
    BrowserLiveViewResponse,
    GuidedBrowserScrollRequest,
    StartGuidedBrowserRequest,
)
from app.services.browser_use import (
    BrowserUseNotConfiguredError,
    get_active_browser_live_view,
    get_guided_browser_session,
    scroll_guided_browser,
    start_guided_browser,
    stop_guided_browser,
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


@router.get("/sessions/{session_id}", response_model=BrowserLiveViewResponse)
async def guided_browser_session(session_id: str) -> BrowserLiveViewResponse:
    """Report task state for a Browser Use session started by this app."""
    try:
        session = await get_guided_browser_session(session_id)
    except BrowserUseNotConfiguredError as error:
        raise HTTPException(status_code=503, detail=str(error)) from error
    except httpx.HTTPError as error:
        raise HTTPException(
            status_code=502, detail="Browser Use could not retrieve the guided browser"
        ) from error

    return BrowserLiveViewResponse(active=True, **session)


@router.delete("/sessions/{session_id}", status_code=204)
async def stop_browser_session(session_id: str) -> None:
    """End a user-approved Browser Use browser session."""
    try:
        await stop_guided_browser(session_id)
    except BrowserUseNotConfiguredError as error:
        raise HTTPException(status_code=503, detail=str(error)) from error
    except httpx.HTTPError as error:
        raise HTTPException(
            status_code=502, detail="Browser Use could not end the guided browser"
        ) from error


@router.post("/sessions/{session_id}/scroll", status_code=204)
async def scroll_browser_session(
    session_id: str, request: GuidedBrowserScrollRequest
) -> None:
    """Scroll a live browser by a small user-selected amount."""
    try:
        await scroll_guided_browser(session_id, request.amount)
    except BrowserUseNotConfiguredError as error:
        raise HTTPException(status_code=503, detail=str(error)) from error
    except httpx.HTTPError as error:
        raise HTTPException(
            status_code=502, detail="Browser Use could not reach the guided browser"
        ) from error
    except RuntimeError as error:
        raise HTTPException(status_code=502, detail=str(error)) from error


@router.post("/sessions", response_model=BrowserLiveViewResponse, status_code=201)
async def start_browser_session(
    request: StartGuidedBrowserRequest,
) -> BrowserLiveViewResponse:
    """Open a safe, visible Browser Use session for an approved destination."""
    try:
        session = await start_guided_browser(str(request.website_url), request.mode)
    except BrowserUseNotConfiguredError as error:
        raise HTTPException(status_code=503, detail=str(error)) from error
    except httpx.HTTPError as error:
        raise HTTPException(
            status_code=502, detail="Browser Use could not start the guided browser"
        ) from error
    except RuntimeError as error:
        raise HTTPException(status_code=502, detail=str(error)) from error

    return BrowserLiveViewResponse(active=True, **session)
