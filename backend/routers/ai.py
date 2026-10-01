from typing import Optional

from fastapi import APIRouter, Body, Depends, Response, status
from sqlalchemy.ext.asyncio import AsyncSession

from core.database import get_db
from models.user import User
from schemas.chat import (
    ChatRequest, ChatResponse, ConversationDetail, ConversationListItem, ConversationUpdate,
    SummaryRequest, SummaryResponse,
)
from schemas.common import Page, PageParams, page_params
from services import ai_service
from services.auth_service import get_current_user

router = APIRouter(prefix="/ai", tags=["AI"])

@router.post("/generate-summary", response_model=SummaryResponse)
async def generate_summary(
    request: Optional[SummaryRequest] = Body(None),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    return await ai_service.generate_summary(db, current_user, request or SummaryRequest())

@router.post("/chat", response_model=ChatResponse)
async def chat(
    request: ChatRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    return await ai_service.chat(db, current_user, request)


@router.get("/conversations", response_model=Page[ConversationListItem])
async def list_conversations(
    page: PageParams = Depends(page_params),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    return await ai_service.list_conversations(db, current_user, page)


@router.get("/conversations/{conversation_id}", response_model=ConversationDetail)
async def get_conversation(conversation_id: str, current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    return await ai_service.get_conversation(db, current_user, conversation_id)


@router.patch("/conversations/{conversation_id}", response_model=ConversationDetail)
async def rename_conversation(
    conversation_id: str, body: ConversationUpdate,
    current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db),
):
    return await ai_service.rename_conversation(db, current_user, conversation_id, body.title)


@router.delete("/conversations/{conversation_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_conversation(conversation_id: str, current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    await ai_service.delete_conversation(db, current_user, conversation_id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)
