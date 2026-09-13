"""API request and response schemas."""

from datetime import datetime
from typing import Any, Literal
from uuid import UUID

from pydantic import BaseModel, Field, HttpUrl


class HealthResponse(BaseModel):
    status: Literal["ok"]


SkillCategory = Literal["Speech", "Voice", "Mobility", "Daily", "Care", "Automation"]


class CreateSkillRequest(BaseModel):
    """What a person fills in to share a skill. The first tag picks the icon."""

    title: str = Field(min_length=3, max_length=80)
    description: str = Field(min_length=10, max_length=280)
    tags: list[SkillCategory] = Field(min_length=1, max_length=2)
    summary: str | None = Field(default=None, max_length=2_000)


class SkillResponse(BaseModel):
    id: UUID
    slug: str
    title: str
    author: str
    tags: list[str]
    karma: int
    featured: bool
    description: str
    docs: dict[str, Any] | None
    # True when the caller named in X-Owner-Subject shared this skill.
    mine: bool
    created_at: datetime


class BrowserLiveViewResponse(BaseModel):
    """A safe subset of a Browser Use cloud-browser session."""

    active: bool
    session_id: str | None = None
    live_url: str | None = None
    started_at: str | None = None
    status: str | None = None
    last_step_summary: str | None = None


class StartGuidedBrowserRequest(BaseModel):
    website_url: HttpUrl
    mode: Literal["assist", "together"]


class GuidedBrowserScrollRequest(BaseModel):
    amount: int = Field(ge=-600, le=600)


class VoiceProfileSetupRequest(BaseModel):
    display_name: str = Field(min_length=1, max_length=255)
    consent_confirmed: Literal[True]
    consent_version: str = Field(default="voice-preservation-v1", max_length=64)


class VoiceSampleResponse(BaseModel):
    id: UUID
    original_filename: str
    content_type: str
    byte_size: int
    phrase_hint: str | None
    created_at: datetime


class VoiceProfileResponse(BaseModel):
    id: UUID
    display_name: str
    consent_granted_at: datetime
    consent_version: str
    provider_voice_id: str | None
    provider_status: str
    sample_count: int
    samples: list[VoiceSampleResponse]


class CreateVoiceCloneRequest(BaseModel):
    description: str | None = Field(default=None, max_length=500)
    remove_background_noise: bool = False


class CreateVoiceCloneResponse(BaseModel):
    provider_voice_id: str
    provider_status: Literal["ready", "verification_required"]
    requires_verification: bool


class VoiceSpeechRequest(BaseModel):
    text: str = Field(min_length=1, max_length=2_000)
