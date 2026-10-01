from typing import Optional

from fastapi import APIRouter, Depends, File, Form, Header, Query, Response, UploadFile, status
from fastapi.responses import JSONResponse
from sqlalchemy.ext.asyncio import AsyncSession

from core.database import get_db
from models.user import User
from schemas.common import Page, PageParams, page_params
from schemas.voice import VoiceAskOut, VoiceLogSaleOut, VoiceSessionDetail, VoiceSessionListItem
from services import idempotency, voice_service
from services.audio import read_audio
from services.auth_service import get_current_user

router = APIRouter(prefix="/voice", tags=["Voice"])


@router.post("/log-sale", response_model=VoiceLogSaleOut, responses={201: {"model": VoiceLogSaleOut}})
async def log_sale(
    audio: UploadFile = File(...),
    dry_run: bool = Query(False, description="true = parse only, save nothing"),
    dry_run_form: Optional[bool] = Form(None, alias="dry_run"),
    idempotency_key: Optional[str] = Header(None, alias="Idempotency-Key"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    # dry_run may arrive as a query param (?dry_run=true) or as a multipart field
    dry = dry_run or bool(dry_run_form)
    key = idempotency.validate_key(idempotency_key)
    info = await read_audio(audio)
    status_code, body = await voice_service.log_sale(db, current_user, info, dry, key)
    return JSONResponse(status_code=status_code, content=VoiceLogSaleOut.model_validate(body).model_dump(mode="json", exclude_none=False))


@router.post("/ask", response_model=VoiceAskOut)
async def ask_voice_question(
    audio: UploadFile = File(...),
    session_id: Optional[str] = Form(None),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    info = await read_audio(audio)
    return await voice_service.ask(db, current_user, info, session_id or None)


@router.get("/sessions", response_model=Page[VoiceSessionListItem])
async def list_sessions(
    page: PageParams = Depends(page_params),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    return await voice_service.list_sessions(db, current_user, page)


@router.get("/sessions/{session_id}", response_model=VoiceSessionDetail)
async def get_session(session_id: str, current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    return await voice_service.get_session(db, current_user, session_id)


@router.delete("/sessions/{session_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_session(session_id: str, current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    await voice_service.delete_session(db, current_user, session_id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)
