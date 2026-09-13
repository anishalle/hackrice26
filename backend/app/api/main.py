from fastapi import APIRouter

from app.api.routes import browser, home, patients, voice

api_router = APIRouter()
api_router.include_router(home.router)
api_router.include_router(browser.router)
api_router.include_router(voice.router)
api_router.include_router(patients.router)
