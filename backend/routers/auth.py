from typing import Optional

from fastapi import APIRouter, Body, Depends, Request, Response, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.ext.asyncio import AsyncSession

from core import ratelimit
from core.database import get_db
from models.user import User
from schemas.auth import (
    ChangePasswordIn, ForgotPasswordIn, LogoutIn, MeUpdate, RefreshIn, RegisterIn, RegisterOut,
    ResetPasswordIn, TokenOut, UserOut,
)
from schemas.common import Message
from services import auth_service

router = APIRouter(prefix="/auth", tags=["Auth"])


@router.post("/register", status_code=status.HTTP_201_CREATED, response_model=RegisterOut)
async def register(user_in: RegisterIn, request: Request, db: AsyncSession = Depends(get_db)):
    ratelimit.enforce("register_ip", ratelimit.client_ip(request), limit=5, window=3600)
    return await auth_service.register(db, user_in)


@router.post("/login", response_model=TokenOut)
async def login(
    request: Request,
    # Use OAuth2 form data instead of a JSON body (Swagger's Authorize depends on it)
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: AsyncSession = Depends(get_db),
):
    # Map the form's 'username' field to the email
    return await auth_service.login(db, form_data.username, form_data.password, ratelimit.client_ip(request))


@router.post("/logout", response_model=Message)
async def logout(
    body: Optional[LogoutIn] = Body(None),
    token: Optional[str] = Depends(auth_service.oauth2_scheme),
    db: AsyncSession = Depends(get_db),
):
    return await auth_service.logout(db, token, body.refresh_token if body else None)


@router.post("/refresh", response_model=TokenOut)
async def refresh(body: RefreshIn, db: AsyncSession = Depends(get_db)):
    return await auth_service.refresh(db, body.refresh_token)


@router.get("/me", response_model=UserOut)
async def me(current_user: User = Depends(auth_service.get_current_user)):
    return auth_service.user_out(current_user)


@router.patch("/me", response_model=UserOut)
async def update_me(
    body: MeUpdate,
    current_user: User = Depends(auth_service.get_current_user),
    db: AsyncSession = Depends(get_db),
):
    user = await auth_service.update_me(db, current_user, body.model_dump(exclude_unset=True))
    return auth_service.user_out(user)


@router.delete("/me", status_code=status.HTTP_204_NO_CONTENT)
async def delete_me(
    current_user: User = Depends(auth_service.get_current_user),
    token: Optional[str] = Depends(auth_service.oauth2_scheme),
    db: AsyncSession = Depends(get_db),
):
    await auth_service.delete_account(db, current_user, token)
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.post("/change-password", status_code=status.HTTP_204_NO_CONTENT)
async def change_password(
    body: ChangePasswordIn,
    current_user: User = Depends(auth_service.get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await auth_service.change_password(db, current_user, body.current_password, body.new_password)
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.post("/forgot-password", status_code=status.HTTP_202_ACCEPTED, response_model=Message)
async def forgot_password(body: ForgotPasswordIn, request: Request, db: AsyncSession = Depends(get_db)):
    ratelimit.enforce("forgot_ip", ratelimit.client_ip(request), limit=5, window=3600)
    await auth_service.forgot_password(db, body.email)
    return {"message": "If an account exists for that email, a reset link has been sent."}


@router.post("/reset-password", status_code=status.HTTP_204_NO_CONTENT)
async def reset_password(body: ResetPasswordIn, db: AsyncSession = Depends(get_db)):
    await auth_service.reset_password(db, body.token, body.new_password)
    return Response(status_code=status.HTTP_204_NO_CONTENT)
