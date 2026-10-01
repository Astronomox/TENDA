from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from core.database import get_db
from models.user import User
from schemas.business import BusinessProfileOut, BusinessProfileUpdate
from services import business_service
from services.auth_service import get_current_user

router = APIRouter(prefix="/business", tags=["Business profile"])


@router.get("/profile", response_model=BusinessProfileOut)
async def get_profile(current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    return business_service.profile_out(await business_service.get_profile(db, current_user))


@router.put("/profile", response_model=BusinessProfileOut)
async def put_profile(
    body: BusinessProfileUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    return business_service.profile_out(await business_service.update_profile(db, current_user, body))
