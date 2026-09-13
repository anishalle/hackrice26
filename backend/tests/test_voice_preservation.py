import httpx
import pytest
from cryptography.fernet import Fernet
from pydantic import SecretStr

from app.core.config import settings
from app.services.voice_preservation import (
    ElevenLabsProviderError,
    VoiceSampleEncryptionError,
    _decrypt_voice_sample,
    _raise_for_elevenlabs_error,
    _voice_sample_cipher,
)


def test_voice_sample_encryption_round_trip(monkeypatch) -> None:
    monkeypatch.setattr(
        settings,
        "VOICE_SAMPLE_ENCRYPTION_KEY",
        SecretStr(Fernet.generate_key().decode()),
    )

    original_audio = b"a small test recording"
    encrypted_audio = _voice_sample_cipher().encrypt(original_audio)

    assert encrypted_audio != original_audio
    assert _decrypt_voice_sample(encrypted_audio) == original_audio


def test_voice_sample_encryption_requires_configured_key(monkeypatch) -> None:
    monkeypatch.setattr(settings, "VOICE_SAMPLE_ENCRYPTION_KEY", None)

    with pytest.raises(VoiceSampleEncryptionError, match="required"):
        _voice_sample_cipher()


def test_elevenlabs_error_includes_safe_provider_message() -> None:
    response = httpx.Response(
        422,
        json={"detail": {"message": "Voice cloning is unavailable on this plan."}},
        request=httpx.Request("POST", "https://api.elevenlabs.io/v1/voices/add"),
    )

    with pytest.raises(
        ElevenLabsProviderError,
        match=r"ElevenLabs rejected this request \(HTTP 422\): Voice cloning",
    ):
        _raise_for_elevenlabs_error(response)
