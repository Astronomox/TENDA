from typing import Literal, Optional

from fastapi import APIRouter, Body, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from core.database import get_db
from models.user import User
from schemas.followups import DoneIn, FollowUpActionOut, FollowUpList, SnoozeIn
from services import followup_service
from services.auth_service import get_current_user

router = APIRouter(prefix="/follow-ups", tags=["Follow-ups"])


@router.get("", response_model=FollowUpList)
async def list_follow_ups(
    status: Literal["overdue", "due_soon", "upcoming", "all"] = "all",
    limit: int = 50,
    offset: int = 0,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    limit, offset = min(max(limit, 1), 200), max(offset, 0)
    return await followup_service.list_follow_ups(db, current_user, status, limit, offset)


# `key` is "{customer_id}:{product_id | name:<product>}" and may contain encoded
# slashes, hence the :path converter.
@router.post("/{key:path}/done", response_model=FollowUpActionOut)
async def mark_done(
    key: str, body: Optional[DoneIn] = Body(None),
    current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db),
):
    channel = (body or DoneIn()).channel
    return await followup_service.record_action(db, current_user, key, "done", channel=channel)


@router.post("/{key:path}/snooze", response_model=FollowUpActionOut)
async def snooze(
    key: str, body: SnoozeIn,
    current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db),
):
    return await followup_service.record_action(db, current_user, key, "snoozed", days=body.days)


@router.post("/{key:path}/dismiss", response_model=FollowUpActionOut)
async def dismiss(key: str, current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    return await followup_service.record_action(db, current_user, key, "dismissed")
