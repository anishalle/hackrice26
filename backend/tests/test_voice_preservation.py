import httpx
import pytest
from cryptography.fernet import Fernet
from pydantic import SecretStr

from app.core.config import settings
from app.db_models import VoiceSample
from app.services.voice_preservation import (
    ElevenLabsProviderError,
    VoiceSampleEncryptionError,
    _decrypt_voice_sample,
    _raise_for_elevenlabs_error,
    _validated_audio_type,
    _voice_sample_cipher,
    audio_duration_seconds,
    sample_is_usable,
)


def _wav(seconds: float, *, rate: int = 16_000, data_size: int | None = None) -> bytes:
    import io
    import wave

    buffer = io.BytesIO()
    with wave.open(buffer, "wb") as handle:
        handle.setnchannels(1)
        handle.setsampwidth(2)
        handle.setframerate(rate)
        handle.writeframes(b"\0\0" * int(seconds * rate))
    audio = bytearray(buffer.getvalue())
    if data_size is not None:
        # Overwrite the data chunk size the way a streaming writer leaves it.
        offset = audio.index(b"data") + 4
        audio[offset : offset + 4] = data_size.to_bytes(4, "little")
    return bytes(audio)


def test_wav_duration_is_read_from_the_header() -> None:
    assert audio_duration_seconds(_wav(5.0), "audio/wav") == 5.0
    assert audio_duration_seconds(_wav(1.25, rate=44_100), "audio/wav") == 1.25


def test_wav_duration_tolerates_unset_data_size() -> None:
    assert audio_duration_seconds(_wav(3.0, data_size=0), "audio/wav") == 3.0
    assert audio_duration_seconds(_wav(3.0, data_size=0xFFFFFFFF), "audio/wav") == 3.0


def test_non_wav_and_malformed_audio_are_unmeasured() -> None:
    assert audio_duration_seconds(b"not audio", "audio/wav") is None
    assert audio_duration_seconds(_wav(5.0), "audio/webm") is None


def test_short_takes_are_kept_but_not_usable(monkeypatch) -> None:
    monkeypatch.setattr(settings, "VOICE_SAMPLE_MIN_SECONDS", 4.6)
    assert not sample_is_usable(VoiceSample(duration_seconds=2.0))
    assert sample_is_usable(VoiceSample(duration_seconds=4.6))
    assert sample_is_usable(VoiceSample(duration_seconds=None))


@pytest.mark.parametrize(
    ("content_type", "expected"),
    [
        ("audio/wav", "audio/wav"),
        # iOS names WAV files after Apple's preferred UTType MIME type.
        ("audio/vnd.wave", "audio/wav"),
        ("audio/webm;codecs=opus", "audio/webm"),
        ("video/webm", "audio/webm"),
        ("AUDIO/X-M4A", "audio/x-m4a"),
    ],
)
def test_audio_type_accepts_platform_spellings(content_type, expected) -> None:
    assert _validated_audio_type(content_type) == expected


def test_audio_type_rejects_non_audio() -> None:
    with pytest.raises(ValueError, match="WAV, M4A"):
        _validated_audio_type("image/png")


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
