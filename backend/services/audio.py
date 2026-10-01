"""Audio intake checks done *before* any AI call (§11.1).

- size ≤ 10 MB, duration ≤ 120 s  -> else 413
- container sniffed from the bytes (the filename/extension is not trusted) -> else 415
- empty / < 0.3 s / silent WAV -> 422 NO_SPEECH (silence in other formats is
  detected by Gemini in the same call that transcribes the audio)
"""
import io
import sys
import wave
from array import array
from dataclasses import dataclass

from fastapi import UploadFile

from core.errors import AppError

MAX_BYTES = 10 * 1024 * 1024
MAX_SECONDS = 120
MIN_SECONDS = 0.3
SILENCE_PEAK = 300  # out of 32767 for 16-bit PCM (~ -40 dBFS)

MIME = {
    "webm": "audio/webm",
    "ogg": "audio/ogg",
    "wav": "audio/wav",
    "mp4": "audio/mp4",
    "mp3": "audio/mpeg",
    "flac": "audio/flac",
    "aac": "audio/aac",
}
SUFFIX = {"webm": ".webm", "ogg": ".ogg", "wav": ".wav", "mp4": ".m4a", "mp3": ".mp3", "flac": ".flac", "aac": ".aac"}


def no_speech() -> AppError:
    return AppError(422, "NO_SPEECH", "I couldn't hear anything. Please try again closer to the microphone.")


def too_large(detail: str = "Recordings must be 10 MB and 2 minutes or shorter.") -> AppError:
    return AppError(413, "PAYLOAD_TOO_LARGE", detail)


def unsupported() -> AppError:
    return AppError(415, "UNSUPPORTED_MEDIA_TYPE", "This audio format isn't supported. Please record again (webm, ogg, m4a, wav or mp3).")


@dataclass
class AudioInfo:
    data: bytes
    container: str
    mime_type: str
    suffix: str
    duration: float | None


def sniff(b: bytes) -> str | None:
    if b[:4] == b"\x1aE\xdf\xa3":
        return "webm"
    if b[:4] == b"OggS":
        return "ogg"
    if b[:4] == b"RIFF" and b[8:12] == b"WAVE":
        return "wav"
    if b[4:8] == b"ftyp":
        return "mp4"
    if b[:4] == b"fLaC":
        return "flac"
    if b[:3] == b"ID3":
        return "mp3"
    if len(b) > 1 and b[0] == 0xFF:
        if b[1] & 0xF6 == 0xF0:
            return "aac"
        if b[1] & 0xE0 == 0xE0:
            return "mp3"
    return None


def probe_duration(data: bytes, container: str) -> float | None:
    if container == "wav":
        try:
            with wave.open(io.BytesIO(data)) as w:
                return w.getnframes() / float(w.getframerate())
        except (wave.Error, EOFError, ZeroDivisionError):
            pass
    try:
        import mutagen

        f = mutagen.File(io.BytesIO(data))
        if f is not None and getattr(f, "info", None) is not None and f.info.length:
            return float(f.info.length)
    except Exception:
        return None
    return None  # e.g. webm: Gemini reports the duration in the same call


def is_silent_wav(data: bytes) -> bool:
    try:
        with wave.open(io.BytesIO(data)) as w:
            if w.getsampwidth() != 2:
                return False
            frames = w.readframes(w.getframerate() * MAX_SECONDS)
    except (wave.Error, EOFError):
        return False
    samples = array("h")
    samples.frombytes(frames[: len(frames) - len(frames) % 2])
    if sys.byteorder == "big":
        samples.byteswap()
    if not samples:
        return True
    return max(abs(x) for x in samples) < SILENCE_PEAK


async def read_audio(upload: UploadFile) -> AudioInfo:
    data = await upload.read(MAX_BYTES + 1)
    if len(data) > MAX_BYTES:
        raise too_large("Recordings must be 10 MB or smaller.")
    if not data:
        raise no_speech()
    container = sniff(data)
    if container is None:
        raise unsupported()
    duration = probe_duration(data, container)
    if duration is not None:
        if duration > MAX_SECONDS:
            raise too_large("Recordings must be 2 minutes or shorter.")
        if duration < MIN_SECONDS:
            raise no_speech()
    if container == "wav" and is_silent_wav(data):
        raise no_speech()
    return AudioInfo(data, container, MIME[container], SUFFIX[container], duration)
