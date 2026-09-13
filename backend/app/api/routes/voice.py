"""Voice-preservation endpoints for ALS-focused accessibility support."""

from uuid import UUID

import httpx
from fastapi import (
    APIRouter,
    Depends,
    File,
    Form,
    Header,
    HTTPException,
    Response,
    UploadFile,
)
from sqlalchemy.orm import Session

from app.api.deps import get_db
from app.core.config import settings
from app.models import (
    CreateVoiceCloneRequest,
    CreateVoiceCloneResponse,
    VoiceProfileResponse,
    VoiceProfileSetupRequest,
    VoiceSampleResponse,
    VoiceSpeechRequest,
)
from app.services.voice_preservation import (
    ElevenLabsNotConfiguredError,
    ElevenLabsProviderError,
    VoiceProfileNotFoundError,
    VoiceSampleEncryptionError,
    add_voice_sample,
    create_elevenlabs_clone,
    delete_voice_sample,
    get_voice_profile,
    list_voice_samples,
    read_voice_sample,
    rebuild_elevenlabs_clone,
    setup_voice_profile,
    synthesize_elevenlabs_speech,
)

router = APIRouter(prefix="/voice", tags=["voice"])


@router.get("/profile", response_model=VoiceProfileResponse)
def voice_profile(
    owner_subject: str = Header(alias="X-Voice-Owner-Subject"),
    session: Session = Depends(get_db),
) -> VoiceProfileResponse:
    """Return only the current owner's voice-profile metadata and sample list."""
    profile = get_voice_profile(session, owner_subject)
    if profile is None:
        raise HTTPException(status_code=404, detail="Voice profile not found")
    return _profile_response(session, profile)


@router.post("/profile", response_model=VoiceProfileResponse, status_code=201)
def create_voice_profile(
    request: VoiceProfileSetupRequest,
    owner_subject: str = Header(alias="X-Voice-Owner-Subject"),
    session: Session = Depends(get_db),
) -> VoiceProfileResponse:
    """Record consent before accepting any voice sample."""
    try:
        profile = setup_voice_profile(
            session,
            owner_subject=owner_subject,
            display_name=request.display_name,
            consent_version=request.consent_version,
        )
    except ValueError as error:
        raise HTTPException(status_code=422, detail=str(error)) from error
    return _profile_response(session, profile)


@router.post("/profile/samples", response_model=VoiceSampleResponse, status_code=201)
async def upload_voice_sample(
    file: UploadFile = File(...),
    phrase_hint: str | None = Form(default=None),
    owner_subject: str = Header(alias="X-Voice-Owner-Subject"),
    session: Session = Depends(get_db),
) -> VoiceSampleResponse:
    """Store one user-recorded audio sample as PostgreSQL bytea data."""
    audio_data = await file.read(settings.VOICE_SAMPLE_MAX_BYTES + 1)
    try:
        sample = add_voice_sample(
            session,
            owner_subject=owner_subject,
            original_filename=file.filename or "voice-sample",
            content_type=file.content_type,
            audio_data=audio_data,
            phrase_hint=phrase_hint,
        )
    except VoiceProfileNotFoundError as error:
        raise HTTPException(status_code=404, detail=str(error)) from error
    except VoiceSampleEncryptionError as error:
        raise HTTPException(status_code=503, detail=str(error)) from error
    except ValueError as error:
        raise HTTPException(status_code=422, detail=str(error)) from error
    finally:
        await file.close()
    return _sample_response(sample)


@router.get("/profile/samples/{sample_id}/audio")
def recording_audio(
    sample_id: UUID,
    owner_subject: str = Header(alias="X-Voice-Owner-Subject"),
    session: Session = Depends(get_db),
) -> Response:
    try:
        audio, content_type = read_voice_sample(
            session, owner_subject=owner_subject, sample_id=sample_id
        )
    except VoiceProfileNotFoundError as error:
        raise HTTPException(status_code=404, detail=str(error)) from error
    except VoiceSampleEncryptionError as error:
        raise HTTPException(status_code=503, detail=str(error)) from error
    except ValueError as error:
        raise HTTPException(status_code=422, detail=str(error)) from error
    return Response(
        content=audio,
        media_type=content_type,
        headers={"Cache-Control": "private, no-store"},
    )


@router.delete("/profile/samples/{sample_id}", status_code=204)
def remove_voice_sample(
    sample_id: UUID,
    owner_subject: str = Header(alias="X-Voice-Owner-Subject"),
    session: Session = Depends(get_db),
) -> None:
    """Permanently remove one original recording owned by the current user."""
    try:
        delete_voice_sample(session, owner_subject=owner_subject, sample_id=sample_id)
    except VoiceProfileNotFoundError as error:
        raise HTTPException(status_code=404, detail=str(error)) from error


@router.post("/profile/clone", response_model=CreateVoiceCloneResponse)
async def create_voice_clone(
    request: CreateVoiceCloneRequest,
    owner_subject: str = Header(alias="X-Voice-Owner-Subject"),
    session: Session = Depends(get_db),
) -> CreateVoiceCloneResponse:
    """Explicitly send saved samples to ElevenLabs to create an IVC voice."""
    try:
        voice_id, requires_verification = await create_elevenlabs_clone(
            session,
            owner_subject=owner_subject,
            description=request.description,
            remove_background_noise=request.remove_background_noise,
        )
    except ElevenLabsNotConfiguredError as error:
        raise HTTPException(status_code=503, detail=str(error)) from error
    except ElevenLabsProviderError as error:
        raise HTTPException(
            status_code=_provider_response_status(error.status_code), detail=str(error)
        ) from error
    except VoiceProfileNotFoundError as error:
        raise HTTPException(status_code=404, detail=str(error)) from error
    except ValueError as error:
        raise HTTPException(status_code=409, detail=str(error)) from error
    except VoiceSampleEncryptionError as error:
        raise HTTPException(status_code=503, detail=str(error)) from error
    except httpx.HTTPError as error:
        raise HTTPException(
            status_code=502, detail="ElevenLabs could not create the voice"
        ) from error
    except RuntimeError as error:
        raise HTTPException(status_code=502, detail=str(error)) from error

    return CreateVoiceCloneResponse(
        provider_voice_id=voice_id,
        provider_status=("verification_required" if requires_verification else "ready"),
        requires_verification=requires_verification,
    )


@router.post("/profile/rebuild", response_model=CreateVoiceCloneResponse)
async def rebuild_voice_clone(
    request: CreateVoiceCloneRequest,
    owner_subject: str = Header(alias="X-Voice-Owner-Subject"),
    session: Session = Depends(get_db),
) -> CreateVoiceCloneResponse:
    """Create a replacement clone from every recording currently saved by the user."""
    try:
        voice_id, requires_verification = await rebuild_elevenlabs_clone(
            session,
            owner_subject=owner_subject,
            description=request.description,
            remove_background_noise=request.remove_background_noise,
        )
    except ElevenLabsNotConfiguredError as error:
        raise HTTPException(status_code=503, detail=str(error)) from error
    except ElevenLabsProviderError as error:
        raise HTTPException(
            status_code=_provider_response_status(error.status_code), detail=str(error)
        ) from error
    except VoiceProfileNotFoundError as error:
        raise HTTPException(status_code=404, detail=str(error)) from error
    except ValueError as error:
        raise HTTPException(status_code=409, detail=str(error)) from error
    except VoiceSampleEncryptionError as error:
        raise HTTPException(status_code=503, detail=str(error)) from error
    except httpx.HTTPError as error:
        raise HTTPException(
            status_code=502, detail="ElevenLabs could not rebuild the voice"
        ) from error
    except RuntimeError as error:
        raise HTTPException(status_code=502, detail=str(error)) from error

    return CreateVoiceCloneResponse(
        provider_voice_id=voice_id,
        provider_status=("verification_required" if requires_verification else "ready"),
        requires_verification=requires_verification,
    )


@router.post("/profile/speech")
async def generate_voice_speech(
    request: VoiceSpeechRequest,
    owner_subject: str = Header(alias="X-Voice-Owner-Subject"),
    session: Session = Depends(get_db),
) -> Response:
    """Return generated MP3 audio from the current user's ready voice."""
    try:
        audio = await synthesize_elevenlabs_speech(
            session, owner_subject=owner_subject, text=request.text
        )
    except ElevenLabsNotConfiguredError as error:
        raise HTTPException(status_code=503, detail=str(error)) from error
    except ElevenLabsProviderError as error:
        raise HTTPException(
            status_code=_provider_response_status(error.status_code), detail=str(error)
        ) from error
    except VoiceProfileNotFoundError as error:
        raise HTTPException(status_code=404, detail=str(error)) from error
    except ValueError as error:
        raise HTTPException(status_code=409, detail=str(error)) from error
    except VoiceSampleEncryptionError as error:
        raise HTTPException(status_code=503, detail=str(error)) from error
    except httpx.HTTPError as error:
        raise HTTPException(
            status_code=502, detail="ElevenLabs could not generate speech"
        ) from error

    return Response(content=audio, media_type="audio/mpeg")


def _profile_response(session: Session, profile) -> VoiceProfileResponse:
    samples = list_voice_samples(session, profile)
    return VoiceProfileResponse(
        id=profile.id,
        display_name=profile.display_name,
        consent_granted_at=profile.consent_granted_at,
        consent_version=profile.consent_version,
        provider_voice_id=profile.provider_voice_id,
        provider_status=profile.provider_status,
        sample_count=len(samples),
        samples=[_sample_response(sample) for sample in samples],
    )


def _sample_response(sample) -> VoiceSampleResponse:
    return VoiceSampleResponse(
        id=sample.id,
        original_filename=sample.original_filename,
        content_type=sample.content_type,
        byte_size=sample.byte_size,
        phrase_hint=sample.phrase_hint,
        created_at=sample.created_at,
    )


def _provider_response_status(provider_status: int) -> int:
    """Preserve actionable client errors while hiding unexpected provider failures."""
    return provider_status if 400 <= provider_status < 500 else 502
