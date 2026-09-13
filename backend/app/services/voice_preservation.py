"""Consent-backed voice-sample storage and server-side ElevenLabs integration."""

from __future__ import annotations

import hashlib
import struct
from datetime import UTC, datetime
from typing import Any
from uuid import UUID

import httpx
from cryptography.fernet import Fernet, InvalidToken
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.config import settings
from app.db_models import User, VoiceProfile, VoiceSample

_ALLOWED_AUDIO_TYPES = {
    "audio/m4a",
    "audio/mp4",
    "audio/mp3",
    "audio/mpeg",
    "audio/ogg",
    "audio/wav",
    "audio/webm",
    "audio/x-m4a",
    "audio/x-wav",
}

# Platform spellings of the same formats. iOS derives a file's type from its
# extension through UTType, whose preferred name for WAV is audio/vnd.wave, and
# browsers label MediaRecorder output video/webm even when it is audio only.
_AUDIO_TYPE_ALIASES = {
    "audio/vnd.wave": "audio/wav",
    "audio/wave": "audio/wav",
    "audio/x-pn-wav": "audio/wav",
    "audio/aac": "audio/m4a",
    "audio/x-mp4": "audio/mp4",
    "video/webm": "audio/webm",
}


class ElevenLabsNotConfiguredError(RuntimeError):
    pass


class ElevenLabsProviderError(RuntimeError):
    """A safe, actionable rejection returned by the ElevenLabs API."""

    def __init__(self, *, status_code: int, message: str) -> None:
        self.status_code = status_code
        super().__init__(message)


class VoiceProfileNotFoundError(RuntimeError):
    pass


class VoiceSampleEncryptionError(RuntimeError):
    pass


def get_voice_profile(session: Session, owner_subject: str) -> VoiceProfile | None:
    """Look up the current user's voice profile without exposing other profiles."""
    return session.scalar(
        select(VoiceProfile)
        .join(User, VoiceProfile.user_id == User.id)
        .where(User.subject == owner_subject)
    )


def setup_voice_profile(
    session: Session,
    *,
    owner_subject: str,
    display_name: str,
    consent_version: str,
) -> VoiceProfile:
    """Create or refresh a profile only after explicit user consent."""
    subject = _validated_owner_subject(owner_subject)
    user = session.scalar(select(User).where(User.subject == subject))
    if user is None:
        user = User(subject=subject)
        session.add(user)
        session.flush()

    profile = session.scalar(
        select(VoiceProfile).where(VoiceProfile.user_id == user.id)
    )
    if profile is None:
        profile = VoiceProfile(
            user_id=user.id,
            display_name=display_name.strip(),
            consent_granted_at=datetime.now(UTC),
            consent_version=consent_version,
            provider_status="collecting",
        )
        session.add(profile)
    else:
        profile.display_name = display_name.strip()
        profile.consent_granted_at = datetime.now(UTC)
        profile.consent_version = consent_version

    session.commit()
    session.refresh(profile)
    return profile


def add_voice_sample(
    session: Session,
    *,
    owner_subject: str,
    original_filename: str,
    content_type: str | None,
    audio_data: bytes,
    phrase_hint: str | None,
) -> VoiceSample:
    """Store an original audio recording in PostgreSQL bytea after validation."""
    profile = _required_profile(session, owner_subject)
    normalized_type = _validated_audio_type(content_type)
    if not audio_data:
        raise ValueError("The audio recording is empty")
    if len(audio_data) > settings.VOICE_SAMPLE_MAX_BYTES:
        raise ValueError(
            f"Each recording must be at most {settings.VOICE_SAMPLE_MAX_BYTES} bytes"
        )

    digest = hashlib.sha256(audio_data).hexdigest()
    duplicate = session.scalar(
        select(VoiceSample).where(
            VoiceSample.voice_profile_id == profile.id, VoiceSample.sha256 == digest
        )
    )
    if duplicate is not None:
        raise ValueError("This recording has already been saved")

    sample = VoiceSample(
        voice_profile_id=profile.id,
        original_filename=_safe_filename(original_filename),
        content_type=normalized_type,
        byte_size=len(audio_data),
        sha256=digest,
        phrase_hint=(
            phrase_hint.strip() if phrase_hint and phrase_hint.strip() else None
        ),
        duration_seconds=audio_duration_seconds(audio_data, normalized_type),
        audio_data=_voice_sample_cipher().encrypt(audio_data),
    )
    session.add(sample)
    session.commit()
    session.refresh(sample)
    return sample


def list_voice_samples(session: Session, profile: VoiceProfile) -> list[VoiceSample]:
    return list(
        session.scalars(
            select(VoiceSample)
            .where(VoiceSample.voice_profile_id == profile.id)
            .order_by(VoiceSample.created_at.desc())
        )
    )


def sample_is_usable(sample: VoiceSample) -> bool:
    """Whether the provider will accept this take. Unmeasured takes are tried."""
    return (
        sample.duration_seconds is None
        or sample.duration_seconds >= settings.VOICE_SAMPLE_MIN_SECONDS
    )


def delete_all_voice_samples(session: Session, *, owner_subject: str) -> int:
    """Empty the owner's recording bank. The profile and any built voice stay."""
    profile = _required_profile(session, owner_subject)
    samples = list_voice_samples(session, profile)
    for sample in samples:
        session.delete(sample)
    session.commit()
    return len(samples)


def delete_voice_sample(
    session: Session, *, owner_subject: str, sample_id: UUID
) -> None:
    """Permanently delete one original recording from PostgreSQL."""
    profile = _required_profile(session, owner_subject)
    sample = session.scalar(
        select(VoiceSample).where(
            VoiceSample.id == sample_id, VoiceSample.voice_profile_id == profile.id
        )
    )
    if sample is None:
        raise VoiceProfileNotFoundError("Voice sample not found")
    session.delete(sample)
    session.commit()


async def create_elevenlabs_clone(
    session: Session,
    *,
    owner_subject: str,
    description: str | None,
    remove_background_noise: bool,
    replace_existing: bool = False,
) -> tuple[str, bool]:
    """Send the user's saved recordings to ElevenLabs only after explicit action."""
    if settings.ELEVENLABS_API_KEY is None:
        raise ElevenLabsNotConfiguredError("ELEVENLABS_API_KEY is not configured")

    profile = _required_profile(session, owner_subject)
    samples = list_voice_samples(session, profile)
    if not samples:
        raise ValueError("Save at least one recording before creating a voice")
    samples = [sample for sample in samples if sample_is_usable(sample)]
    if not samples:
        raise ValueError(
            "Every saved recording is shorter than "
            f"{settings.VOICE_SAMPLE_MIN_SECONDS:g} seconds; record a longer line"
        )
    if profile.provider_voice_id is not None:
        if not replace_existing:
            raise ValueError("A voice has already been created for this profile")
        # Rebuilding: free the provider slot first so the new clone can be
        # made from every recording saved since the last one.
        await _delete_provider_voice(profile.provider_voice_id)
        profile.provider_voice_id = None
        profile.provider_status = "collecting"
        profile.cloned_at = None
        session.commit()

    files = [
        (
            "files",
            (
                sample.original_filename,
                _decrypt_voice_sample(sample.audio_data),
                sample.content_type,
            ),
        )
        for sample in samples
    ]
    data: dict[str, str] = {
        "name": profile.display_name,
        "remove_background_noise": str(remove_background_noise).lower(),
    }
    if description:
        data["description"] = description

    url = f"{str(settings.ELEVENLABS_API_BASE_URL).rstrip('/')}/voices/add"
    headers = {"xi-api-key": settings.ELEVENLABS_API_KEY.get_secret_value()}
    async with httpx.AsyncClient(timeout=90) as client:
        response = await client.post(url, headers=headers, data=data, files=files)
        _raise_for_elevenlabs_error(response)

    provider_response: dict[str, Any] = response.json()
    voice_id = provider_response.get("voice_id")
    if not voice_id:
        raise RuntimeError("ElevenLabs did not return a voice ID")

    requires_verification = bool(provider_response.get("requires_verification"))
    profile.provider_voice_id = str(voice_id)
    profile.provider_status = (
        "verification_required" if requires_verification else "ready"
    )
    profile.cloned_at = datetime.now(UTC)
    session.commit()
    return str(voice_id), requires_verification


async def delete_elevenlabs_clone(session: Session, *, owner_subject: str) -> None:
    """Remove the provider voice and return the profile to collecting samples."""
    if settings.ELEVENLABS_API_KEY is None:
        raise ElevenLabsNotConfiguredError("ELEVENLABS_API_KEY is not configured")

    profile = _required_profile(session, owner_subject)
    if not profile.provider_voice_id:
        raise ValueError("No voice has been created for this profile")

    await _delete_provider_voice(profile.provider_voice_id)
    profile.provider_voice_id = None
    profile.provider_status = "collecting"
    profile.cloned_at = None
    session.commit()


async def _delete_provider_voice(voice_id: str) -> None:
    """Delete a voice at ElevenLabs; a voice already gone there is not an error."""
    url = f"{str(settings.ELEVENLABS_API_BASE_URL).rstrip('/')}/voices/{voice_id}"
    headers = {"xi-api-key": settings.ELEVENLABS_API_KEY.get_secret_value()}
    async with httpx.AsyncClient(timeout=30) as client:
        response = await client.delete(url, headers=headers)
        if response.status_code == 404:
            return
        _raise_for_elevenlabs_error(response)


async def synthesize_elevenlabs_speech(
    session: Session, *, owner_subject: str, text: str
) -> bytes:
    """Generate MP3 speech from a verified user-owned ElevenLabs voice."""
    if settings.ELEVENLABS_API_KEY is None:
        raise ElevenLabsNotConfiguredError("ELEVENLABS_API_KEY is not configured")

    profile = _required_profile(session, owner_subject)
    if not profile.provider_voice_id:
        raise ValueError("Create a voice before generating speech")
    if profile.provider_status != "ready":
        raise ValueError("Voice verification must finish before generating speech")

    url = (
        f"{str(settings.ELEVENLABS_API_BASE_URL).rstrip('/')}/text-to-speech/"
        f"{profile.provider_voice_id}/stream"
    )
    headers = {
        "Content-Type": "application/json",
        "xi-api-key": settings.ELEVENLABS_API_KEY.get_secret_value(),
    }
    payload = {
        "text": text,
        "model_id": settings.ELEVENLABS_TTS_MODEL_ID,
    }
    async with httpx.AsyncClient(timeout=90) as client:
        response = await client.post(
            url,
            headers=headers,
            params={"output_format": "mp3_44100_128"},
            json=payload,
        )
        _raise_for_elevenlabs_error(response)
    return response.content


def audio_duration_seconds(audio_data: bytes, content_type: str) -> float | None:
    """Measure a WAV take from its RIFF header; other containers return None.

    Native check-in takes are WAV, which carries its byte rate and data length
    in plain chunks. Compressed containers would need a decoder, so they are
    left unmeasured rather than guessed, and unmeasured takes remain usable.
    """
    if content_type not in {"audio/wav", "audio/x-wav"}:
        return None
    if len(audio_data) < 12 or audio_data[:4] != b"RIFF" or audio_data[8:12] != b"WAVE":
        return None

    byte_rate: int | None = None
    offset = 12
    while offset + 8 <= len(audio_data):
        chunk_id = audio_data[offset : offset + 4]
        (chunk_size,) = struct.unpack("<I", audio_data[offset + 4 : offset + 8])
        body = offset + 8
        if chunk_id == b"fmt " and chunk_size >= 16:
            (byte_rate,) = struct.unpack("<I", audio_data[body + 8 : body + 12])
        elif chunk_id == b"data":
            if not byte_rate:
                return None
            # A streaming writer may leave the data size unset (0 or 0xFFFFFFFF);
            # everything after the header is audio in that case.
            data_size = chunk_size
            if data_size in (0, 0xFFFFFFFF) or body + data_size > len(audio_data):
                data_size = len(audio_data) - body
            return round(data_size / byte_rate, 3)
        offset = body + chunk_size + (chunk_size & 1)
    return None


def _required_profile(session: Session, owner_subject: str) -> VoiceProfile:
    profile = get_voice_profile(session, _validated_owner_subject(owner_subject))
    if profile is None:
        raise VoiceProfileNotFoundError(
            "Create and consent to a voice-preservation profile first"
        )
    return profile


def _validated_owner_subject(owner_subject: str) -> str:
    subject = owner_subject.strip()
    if not subject or len(subject) > 255:
        raise ValueError("A valid voice-profile owner is required")
    return subject


def _validated_audio_type(content_type: str | None) -> str:
    normalized = (content_type or "").split(";", maxsplit=1)[0].strip().lower()
    normalized = _AUDIO_TYPE_ALIASES.get(normalized, normalized)
    if normalized not in _ALLOWED_AUDIO_TYPES:
        raise ValueError("Use WAV, M4A, MP3, OGG, or WebM audio")
    return normalized


def _safe_filename(original_filename: str) -> str:
    filename = original_filename.rsplit("/", maxsplit=1)[-1].rsplit("\\", maxsplit=1)[
        -1
    ]
    return (filename or "voice-sample").strip()[:255]


def _voice_sample_cipher() -> Fernet:
    if settings.VOICE_SAMPLE_ENCRYPTION_KEY is None:
        raise VoiceSampleEncryptionError(
            "VOICE_SAMPLE_ENCRYPTION_KEY is required to store voice recordings"
        )
    try:
        return Fernet(settings.VOICE_SAMPLE_ENCRYPTION_KEY.get_secret_value().encode())
    except (TypeError, ValueError) as error:
        raise VoiceSampleEncryptionError(
            "VOICE_SAMPLE_ENCRYPTION_KEY must be a valid Fernet key"
        ) from error


def _decrypt_voice_sample(encrypted_audio: bytes) -> bytes:
    try:
        return _voice_sample_cipher().decrypt(encrypted_audio)
    except InvalidToken as error:
        raise VoiceSampleEncryptionError(
            "A saved voice recording could not be decrypted"
        ) from error


def _raise_for_elevenlabs_error(response: httpx.Response) -> None:
    try:
        response.raise_for_status()
    except httpx.HTTPStatusError as error:
        raise ElevenLabsProviderError(
            status_code=response.status_code,
            message=_elevenlabs_error_message(response),
        ) from error


def _elevenlabs_error_message(response: httpx.Response) -> str:
    """Return only the useful provider message, never request headers or keys."""
    try:
        payload = response.json()
    except ValueError:
        payload = None

    detail = payload.get("detail") if isinstance(payload, dict) else None
    if isinstance(detail, dict):
        detail = detail.get("message") or detail.get("status")
    elif isinstance(detail, list):
        # Request-validation errors arrive as a list of {loc, msg} entries.
        detail = "; ".join(
            f"{'.'.join(str(part) for part in item.get('loc', [])[1:])}: "
            f"{item.get('msg')}"
            for item in detail
            if isinstance(item, dict)
        )
    if not isinstance(detail, str) or not detail.strip():
        detail = "The provider did not include an error explanation"

    return (
        f"ElevenLabs rejected this request (HTTP {response.status_code}): "
        f"{detail[:400]}"
    )
