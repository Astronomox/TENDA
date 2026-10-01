import logging
from datetime import datetime, timedelta, timezone

from fastapi import Depends
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy import delete, select, update
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from core import clock, ratelimit
from core.config import settings
from core.database import get_db
from core.errors import AppError, unauthenticated
from core.security import (
    create_access_token,
    get_password_hash,
    hash_token,
    new_opaque_token,
    verify_password,
    verify_token,
)
from models import (
    AIConversation, AIMessage, VoiceTurn, BusinessProfile, Customer, FollowUpAction, IdempotencyKey, MessageTemplate,
    Notification, PasswordResetToken, Product, RefreshToken, RevokedToken, Sale, Transaction, User,
    VoiceSession,
)
from models.common import new_id
from schemas.auth import RegisterIn

logger = logging.getLogger("tenda")

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login", auto_error=False)

INVALID_CREDENTIALS = AppError(
    401, "INVALID_CREDENTIALS", "Incorrect email or password", headers={"WWW-Authenticate": "Bearer"}
)


def normalize_email(email: str) -> str:
    return (email or "").strip().lower()


def user_out(user: User) -> dict:
    return {
        "id": user.public_id,
        "email": user.email,
        "full_name": user.full_name,
        "created_at": user.created_at,
        "timezone": user.timezone,
    }


def user_brief(user: User) -> dict:
    return {"id": user.public_id, "email": user.email, "full_name": user.full_name}


async def get_user_by_email(db: AsyncSession, email: str) -> User | None:
    result = await db.execute(select(User).where(User.email == normalize_email(email)))
    return result.scalars().first()


async def _issue_refresh_token(db: AsyncSession, user: User, family_id: str | None = None) -> tuple[str, RefreshToken]:
    raw = new_opaque_token("rt_")
    row = RefreshToken(
        user_id=user.id,
        token_hash=hash_token(raw),
        family_id=family_id or new_id(),
        expires_at=clock.now() + timedelta(days=settings.refresh_token_expire_days),
    )
    db.add(row)
    await db.flush()
    return raw, row


async def issue_tokens(db: AsyncSession, user: User, family_id: str | None = None) -> dict:
    access, _, _ = create_access_token(user.email, user.public_id)
    refresh, _ = await _issue_refresh_token(db, user, family_id)
    return {
        "access_token": access,
        "token_type": "bearer",
        "expires_in": settings.access_token_expire_minutes * 60,
        "refresh_token": refresh,
    }


async def register(db: AsyncSession, user_in: RegisterIn) -> dict:
    if await get_user_by_email(db, user_in.email):
        raise AppError(400, "EMAIL_TAKEN", "An account with this email already exists")

    user = User(
        email=user_in.email,
        hashed_password=get_password_hash(user_in.password),
        full_name=user_in.full_name,
    )
    db.add(user)
    try:
        await db.flush()
    except IntegrityError:
        await db.rollback()
        raise AppError(400, "EMAIL_TAKEN", "An account with this email already exists")

    db.add(BusinessProfile(user_id=user.id, business_name=user_in.business_name))
    tokens = await issue_tokens(db, user)
    await db.commit()
    await db.refresh(user)
    return {**tokens, "user": user_out(user)}


async def login(db: AsyncSession, email: str, password: str, ip: str) -> dict:
    email = normalize_email(email)
    # §4.2: > 10 failed attempts / 15 min per email or per IP -> 429
    for bucket, key in (("login_email", email), ("login_ip", ip)):
        retry = ratelimit.check(bucket, key, limit=10, window=15 * 60)
        if retry is not None:
            raise AppError(429, "RATE_LIMITED", "Too many login attempts. Please wait and try again.",
                           headers={"Retry-After": str(retry)})

    user = await get_user_by_email(db, email)
    if not user or not verify_password(password, user.hashed_password):
        ratelimit.hit("login_email", email, limit=10, window=15 * 60)
        ratelimit.hit("login_ip", ip, limit=10, window=15 * 60)
        raise INVALID_CREDENTIALS

    tokens = await issue_tokens(db, user)
    await db.commit()
    return {**tokens, "user": user_brief(user)}


async def get_current_user(
    token: str | None = Depends(oauth2_scheme), db: AsyncSession = Depends(get_db)
) -> User:
    if not token:
        raise unauthenticated("Not authenticated. Please log in.")
    payload = verify_token(token)
    if payload is None:
        raise unauthenticated("Your session is invalid or has expired. Please log in again.")
    email, uid, jti = payload.get("sub"), payload.get("uid"), payload.get("jti")
    if not email or not uid or not jti:
        raise unauthenticated("Invalid token payload")

    if await db.get(RevokedToken, jti) is not None:
        raise unauthenticated("Your session has ended. Please log in again.")

    user = await get_user_by_email(db, email)
    if user is None or user.public_id != uid:
        raise unauthenticated("User not found")
    return user


async def revoke_access_token(db: AsyncSession, token: str | None) -> None:
    if not token:
        return
    payload = verify_token(token, verify_exp=False)
    if not payload or not payload.get("jti") or not payload.get("exp"):
        return
    expires_at = clock.to_utc_naive(datetime.fromtimestamp(payload["exp"], timezone.utc))
    if expires_at <= clock.now():
        return
    if await db.get(RevokedToken, payload["jti"]) is None:
        db.add(RevokedToken(jti=payload["jti"], expires_at=expires_at))


async def logout(db: AsyncSession, token: str | None, refresh_token: str | None) -> dict:
    """Idempotent: always succeeds, even with an already-invalid token (§4.5)."""
    payload = verify_token(token, verify_exp=False) if token else None
    await revoke_access_token(db, token)
    if refresh_token:
        await db.execute(
            update(RefreshToken)
            .where(RefreshToken.token_hash == hash_token(refresh_token), RefreshToken.revoked_at.is_(None))
            .values(revoked_at=clock.now())
        )
    await db.commit()
    if payload and payload.get("sub"):
        return {"message": f"User {payload['sub']} logged out successfully"}
    return {"message": "Logged out"}


async def refresh(db: AsyncSession, raw_token: str) -> dict:
    row = (await db.execute(select(RefreshToken).where(RefreshToken.token_hash == hash_token(raw_token)))).scalar_one_or_none()
    if row is None:
        raise unauthenticated("Invalid refresh token")
    now = clock.now()
    if row.revoked_at is not None:
        if row.replaced_by is not None:
            # Reuse of a rotated token: likely theft -> revoke the whole family (§4.6)
            await db.execute(
                update(RefreshToken)
                .where(RefreshToken.family_id == row.family_id, RefreshToken.revoked_at.is_(None))
                .values(revoked_at=now)
            )
            await db.commit()
            logger.warning("Refresh token reuse detected; family revoked", extra={"user_id": row.user_id})
        raise unauthenticated("Refresh token has been revoked")
    if row.expires_at <= now:
        raise unauthenticated("Refresh token has expired")

    user = await db.get(User, row.user_id)
    if user is None:
        raise unauthenticated("User not found")

    tokens = await issue_tokens(db, user, family_id=row.family_id)
    new_row = (await db.execute(
        select(RefreshToken).where(RefreshToken.token_hash == hash_token(tokens["refresh_token"]))
    )).scalar_one()
    row.revoked_at = now
    row.replaced_by = new_row.id
    await db.commit()
    return {**tokens, "user": user_brief(user)}


async def revoke_all_refresh_tokens(db: AsyncSession, user_id: int) -> None:
    await db.execute(
        update(RefreshToken)
        .where(RefreshToken.user_id == user_id, RefreshToken.revoked_at.is_(None))
        .values(revoked_at=clock.now())
    )


async def change_password(db: AsyncSession, user: User, current: str, new: str) -> None:
    if not verify_password(current, user.hashed_password):
        raise INVALID_CREDENTIALS
    user.hashed_password = get_password_hash(new)
    await revoke_all_refresh_tokens(db, user.id)
    await db.commit()


async def forgot_password(db: AsyncSession, email: str) -> None:
    user = await get_user_by_email(db, email)
    if user is None:
        return  # same response either way: no user enumeration
    raw = new_opaque_token("pr_")
    db.add(PasswordResetToken(
        user_id=user.id,
        token_hash=hash_token(raw),
        expires_at=clock.now() + timedelta(minutes=settings.password_reset_expire_minutes),
    ))
    await db.commit()
    # TODO: send by email once an email provider is configured.
    if settings.log_password_reset_links:
        logger.info("Password reset link for %s: %s?token=%s", user.email, settings.password_reset_url, raw)


async def reset_password(db: AsyncSession, raw_token: str, new_password: str) -> None:
    row = (await db.execute(
        select(PasswordResetToken).where(PasswordResetToken.token_hash == hash_token(raw_token))
    )).scalar_one_or_none()
    if row is None or row.used_at is not None or row.expires_at <= clock.now():
        raise AppError(400, "BAD_REQUEST", "This reset link is invalid or has expired. Please request a new one.")
    user = await db.get(User, row.user_id)
    if user is None:
        raise AppError(400, "BAD_REQUEST", "This reset link is invalid or has expired. Please request a new one.")
    user.hashed_password = get_password_hash(new_password)
    row.used_at = clock.now()
    await revoke_all_refresh_tokens(db, user.id)
    await db.commit()


async def update_me(db: AsyncSession, user: User, fields: dict) -> User:
    if "full_name" in fields:
        user.full_name = fields["full_name"]
    await db.commit()
    await db.refresh(user)
    return user


async def delete_account(db: AsyncSession, user: User, token: str | None) -> None:
    """NDPR right to erasure (§4.9): remove every row belonging to the user."""
    uid = user.id
    await revoke_access_token(db, token)
    conv_ids = select(AIConversation.id).where(AIConversation.user_id == uid)
    session_ids = select(VoiceSession.id).where(VoiceSession.user_id == uid)
    await db.execute(delete(AIMessage).where(AIMessage.conversation_id.in_(conv_ids)))
    await db.execute(delete(VoiceTurn).where(VoiceTurn.session_id.in_(session_ids)))
    for model in (AIConversation, VoiceSession, Notification, MessageTemplate, FollowUpAction, IdempotencyKey,
                  Sale, Customer, Product, RefreshToken, PasswordResetToken, BusinessProfile, Transaction):
        await db.execute(delete(model).where(model.user_id == uid))
    await db.delete(user)
    await db.commit()
