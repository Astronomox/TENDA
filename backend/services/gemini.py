"""Single entry point for every Gemini call (see Readme: "Centralised AI service").

Audio goes to Gemini natively via files.upload() — there is no separate
speech-to-text step. For voice, ONE generate_content call returns the
transcript, the "is there speech?" check and the structured answer/draft.
"""
import asyncio
import json
import logging
import os
import random
import tempfile
import time
from typing import Optional

from google import genai
from google.genai import errors as genai_errors
from google.genai import types
from pydantic import BaseModel, Field, ValidationError

from core.config import settings
from core.errors import AppError

logger = logging.getLogger("tenda.ai")

RETRYABLE = {429, 500, 502, 503, 504}
BACKOFF = (0.5, 1.5)
REFUSAL = "Sorry, I can't help with that request. I can answer questions about your sales, customers and products."


def ai_unavailable() -> AppError:
    return AppError(
        503, "AI_UNAVAILABLE", "TENDA AI is busy right now. Please try again in a moment.",
        headers={"Retry-After": "10"},
    )


class AIRejectedInput(Exception):
    """The provider refused the input itself (HTTP 400), e.g. an unreadable audio file."""


# --- structured outputs ---------------------------------------------------

class VoiceSaleExtraction(BaseModel):
    has_speech: bool = Field(description="false if the audio is silent, only noise, or has no intelligible speech")
    transcript: str = Field(description="verbatim transcript of what was said; empty string if no speech")
    audio_duration_sec: Optional[float] = Field(None, description="approximate length of the recording in seconds")
    product_name: Optional[str] = Field(None, description="product sold; use the exact catalogue name when it clearly matches")
    quantity: Optional[int] = Field(None, description="units sold; null if not said")
    unit_price: Optional[float] = Field(None, description="price per unit in naira if said")
    amount: Optional[float] = Field(None, description="total price in naira if said")
    customer_name: Optional[str] = Field(None, description="buyer's name if said; use the exact known customer name when it clearly matches")
    days_ago: Optional[int] = Field(None, description="0 for today, 1 for yesterday, etc. if the speaker says when; else null")
    product_count: int = Field(1, description="number of different products mentioned")
    confidence: float = Field(description="0 to 1: how sure you are about the extracted fields")


class VoiceAnswer(BaseModel):
    has_speech: bool = Field(description="false if the audio is silent, only noise, or has no intelligible speech")
    question: str = Field(description="verbatim transcript of the user's question; empty string if no speech")
    answer: str = Field(description="the spoken-style answer; empty string if no speech")
    audio_duration_sec: Optional[float] = Field(None, description="approximate length of the recording in seconds")


class GeminiService:
    def __init__(self):
        # The client is created lazily so the server can still start (and serve
        # auth/analytics) when GEMINI_API_KEY has not been configured yet.
        self._client = None
        self.last_error_at: float | None = None
        self.last_ok_at: float | None = None

    @property
    def configured(self) -> bool:
        return bool(settings.gemini_api_key)

    @property
    def async_client(self):
        if self._client is None:
            if not settings.gemini_api_key:
                raise AppError(
                    503, "AI_UNAVAILABLE",
                    "TENDA AI isn't set up on the server yet (GEMINI_API_KEY is missing).",
                    headers={"Retry-After": "60"},
                )
            self._client = genai.Client(api_key=settings.gemini_api_key)
        # Use the .aio property to access the async endpoints natively
        return self._client.aio

    def status(self) -> str:
        """For /health — never calls the provider (§18)."""
        if not self.configured:
            return "not_configured"
        if self.last_error_at and time.monotonic() - self.last_error_at < 60 and (
            self.last_ok_at is None or self.last_ok_at < self.last_error_at
        ):
            return "degraded"
        return "ok"

    # --- core call with retry + fallback ---------------------------------

    async def _generate(self, contents, config: types.GenerateContentConfig, purpose: str, user_id: int | None = None):
        client = self.async_client
        models = [settings.gemini_model]
        if settings.gemini_fallback_model and settings.gemini_fallback_model != settings.gemini_model:
            models.append(settings.gemini_fallback_model)

        for model in models:
            for attempt in range(len(BACKOFF) + 1):
                started = time.perf_counter()
                try:
                    response = await asyncio.wait_for(
                        client.models.generate_content(model=model, contents=contents, config=config),
                        timeout=settings.ai_timeout_seconds,
                    )
                    usage = getattr(response, "usage_metadata", None)
                    logger.info("ai call ok", extra={
                        "purpose": purpose, "user_id": user_id, "model": model,
                        "latency_ms": round((time.perf_counter() - started) * 1000),
                        "prompt_tokens": getattr(usage, "prompt_token_count", None),
                        "output_tokens": getattr(usage, "candidates_token_count", None),
                    })
                    self.last_ok_at = time.monotonic()
                    return response
                except genai_errors.APIError as exc:
                    code = getattr(exc, "code", None)
                    logger.warning("ai call failed", extra={
                        "purpose": purpose, "user_id": user_id, "model": model, "status": code,
                        "error_class": type(exc).__name__, "attempt": attempt,
                    })
                    if code == 400:
                        raise AIRejectedInput() from exc
                    if code in RETRYABLE and attempt < len(BACKOFF):
                        await asyncio.sleep(BACKOFF[attempt] + random.uniform(0, 0.25))
                        continue
                    break  # try the fallback model
                except asyncio.TimeoutError:
                    logger.warning("ai call timed out", extra={"purpose": purpose, "user_id": user_id, "model": model})
                    break
        self.last_error_at = time.monotonic()
        raise ai_unavailable()

    @staticmethod
    def _text(response) -> str | None:
        """Returns None when the model blocked the answer (safety)."""
        try:
            text = response.text
        except Exception:
            text = None
        if text:
            return text
        feedback = getattr(response, "prompt_feedback", None)
        if feedback is not None and getattr(feedback, "block_reason", None):
            return None
        return None

    async def _upload(self, audio: bytes, mime_type: str, suffix: str):
        fd, path = tempfile.mkstemp(prefix="tenda_", suffix=suffix)
        try:
            with os.fdopen(fd, "wb") as fh:
                fh.write(audio)
            try:
                return await self.async_client.files.upload(file=path, config={"mime_type": mime_type})
            except genai_errors.APIError as exc:
                logger.warning("ai upload failed", extra={"status": getattr(exc, "code", None), "error_class": type(exc).__name__})
                if getattr(exc, "code", None) == 400:
                    raise AIRejectedInput() from exc
                self.last_error_at = time.monotonic()
                raise ai_unavailable()
        finally:
            if os.path.exists(path):
                os.remove(path)

    async def _delete(self, uploaded) -> None:
        try:
            await self.async_client.files.delete(name=uploaded.name)
        except Exception:
            logger.warning("could not delete uploaded audio from Gemini")

    # --- public API --------------------------------------------------------

    async def generate_text(self, system_instruction: str, contents, purpose: str, user_id: int | None = None) -> str:
        response = await self._generate(
            contents, types.GenerateContentConfig(system_instruction=system_instruction), purpose, user_id
        )
        text = self._text(response)
        return text.strip() if text else REFUSAL

    async def extract_sale_from_audio(self, audio: bytes, mime_type: str, suffix: str, prompt: str,
                                      user_id: int | None = None) -> VoiceSaleExtraction:
        uploaded = await self._upload(audio, mime_type, suffix)
        try:
            response = await self._generate(
                [uploaded, prompt],
                types.GenerateContentConfig(response_mime_type="application/json", response_schema=VoiceSaleExtraction),
                "voice_log_sale", user_id,
            )
        finally:
            await self._delete(uploaded)
        return self._parse(response, VoiceSaleExtraction)

    async def answer_from_audio(self, audio: bytes, mime_type: str, suffix: str, system_instruction: str, prompt: str,
                                user_id: int | None = None) -> VoiceAnswer:
        uploaded = await self._upload(audio, mime_type, suffix)
        try:
            response = await self._generate(
                [uploaded, prompt],
                types.GenerateContentConfig(
                    system_instruction=system_instruction,
                    response_mime_type="application/json",
                    response_schema=VoiceAnswer,
                ),
                "voice_ask", user_id,
            )
        finally:
            await self._delete(uploaded)
        return self._parse(response, VoiceAnswer)

    def _parse(self, response, model):
        text = self._text(response)
        if text is None:
            return model.model_validate({"has_speech": True, "transcript": "", "question": "", "answer": REFUSAL, "confidence": 0})
        try:
            return model.model_validate(json.loads(text))
        except (ValueError, ValidationError):
            logger.warning("ai returned unparseable JSON", extra={"schema": model.__name__})
            raise ai_unavailable()

# Single shared instance
gemini_service = GeminiService()
