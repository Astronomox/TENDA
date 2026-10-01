from typing import Optional

from fastapi import APIRouter, Depends, Response, status
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from core.database import get_db
from models.user import User
from schemas.common import UTCDateTime
from services import notification_service
from services.auth_service import get_current_user

router = APIRouter(prefix="/notifications", tags=["Notifications"])


class NotificationOut(BaseModel):
    id: str
    type: str
    title: str
    body: Optional[str]
    link: Optional[str]
    created_at: UTCDateTime
    read: bool


class NotificationList(BaseModel):
    items: list[NotificationOut]
    unread_count: int


class MarkReadIn(BaseModel):
    ids: Optional[list[str]] = None
    all: bool = False


@router.get("", response_model=NotificationList)
async def list_notifications(
    unread_only: bool = False,
    limit: int = 20,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    return await notification_service.list_notifications(db, current_user, unread_only, min(max(limit, 1), 200))


@router.post("/read", status_code=status.HTTP_204_NO_CONTENT)
async def mark_read(body: MarkReadIn, current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    await notification_service.mark_read(db, current_user, body.ids, body.all)
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.delete("/{notification_id}", status_code=status.HTTP_204_NO_CONTENT)
async def dismiss(notification_id: str, current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    await notification_service.dismiss(db, current_user, notification_id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)
