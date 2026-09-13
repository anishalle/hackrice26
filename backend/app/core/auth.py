"""Single-user API-key gate, including docs and streaming endpoints."""

import secrets

from starlette.datastructures import Headers
from starlette.responses import JSONResponse

from app.core.config import settings


def validate_api_key_config() -> None:
    key = settings.BACKEND_API_KEY
    if settings.FASTAPI_ENV != "development" and (
        key is None or len(key.get_secret_value()) < 32
    ):
        raise RuntimeError("Set BACKEND_API_KEY to at least 32 random characters")


class APIKeyMiddleware:
    def __init__(self, app):
        self.app = app

    async def __call__(self, scope, receive, send):
        if scope["type"] != "http":
            return await self.app(scope, receive, send)
        # The only public endpoint reports process liveness, with no dependencies.
        if scope["method"] == "GET" and scope["path"] == (
            settings.API_V1_STR + "/health"
        ):
            return await self.app(scope, receive, send)
        key = settings.BACKEND_API_KEY
        if key is None and settings.FASTAPI_ENV == "development":
            return await self.app(scope, receive, send)
        provided = Headers(scope=scope).get("x-api-key", "")
        if key is None or not secrets.compare_digest(
            provided.encode(), key.get_secret_value().encode()
        ):
            response = JSONResponse(
                {"detail": "Invalid or missing API key"}, status_code=401
            )
            return await response(scope, receive, send)
        return await self.app(scope, receive, send)
