import re
from typing import Optional

from fastapi import APIRouter, Depends, Response, status
from pydantic import BaseModel, BeforeValidator, Field, StrictBool, field_validator, model_validator
from sqlalchemy import func, select, update
from sqlalchemy.ext.asyncio import AsyncSession
from typing_extensions import Annotated

from core.database import get_db
from core.errors import not_found
from models import MessageTemplate
from models.user import User
from schemas.common import Name60, Page, PageParams, UTCDateTime, page_params
from services.auth_service import get_current_user
from services.followup_service import PLACEHOLDERS

router = APIRouter(prefix="/templates", tags=["Message templates"])


def _strip(v):
    return v.strip() if isinstance(v, str) else v


Body1000 = Annotated[str, BeforeValidator(_strip), Field(min_length=1, max_length=1000)]


def _check_placeholders(body: str) -> str:
    unknown = sorted(set(re.findall(r"\{([^{}]*)\}", body)) - PLACEHOLDERS)
    if unknown:
        raise ValueError(
            f"Unknown placeholder {{{unknown[0]}}}. Use: " + ", ".join(f"{{{p}}}" for p in sorted(PLACEHOLDERS))
        )
    return body


class TemplateIn(BaseModel):
    name: Name60
    body: Body1000
    is_default: StrictBool = False

    @field_validator("body")
    @classmethod
    def _body(cls, v):
        return _check_placeholders(v)


class TemplateUpdate(BaseModel):
    name: Optional[Name60] = None
    body: Optional[Body1000] = None
    is_default: Optional[StrictBool] = None

    @field_validator("body")
    @classmethod
    def _body(cls, v):
        return _check_placeholders(v) if v is not None else v

    @model_validator(mode="after")
    def _not_null(self):
        for field in ("name", "body", "is_default"):
            if field in self.model_fields_set and getattr(self, field) is None:
                raise ValueError(f"{field.replace('_', ' ').capitalize()} can't be empty")
        return self


class TemplateOut(BaseModel):
    id: str
    name: str
    body: str
    is_default: bool
    created_at: UTCDateTime
    updated_at: UTCDateTime


def _out(t: MessageTemplate) -> dict:
    return {"id": t.id, "name": t.name, "body": t.body, "is_default": t.is_default,
            "created_at": t.created_at, "updated_at": t.updated_at}


async def _owned(db: AsyncSession, user: User, template_id: str) -> MessageTemplate:
    t = await db.get(MessageTemplate, template_id)
    if t is None or t.user_id != user.id:
        raise not_found("Template")
    return t


async def _clear_default(db: AsyncSession, user: User, except_id: str | None = None) -> None:
    q = update(MessageTemplate).where(MessageTemplate.user_id == user.id, MessageTemplate.is_default.is_(True))
    if except_id:
        q = q.where(MessageTemplate.id != except_id)
    await db.execute(q.values(is_default=False))


@router.get("", response_model=Page[TemplateOut])
async def list_templates(page: PageParams = Depends(page_params), current_user: User = Depends(get_current_user),
                         db: AsyncSession = Depends(get_db)):
    query = select(MessageTemplate).where(MessageTemplate.user_id == current_user.id)
    if page.q:
        query = query.where(func.lower(MessageTemplate.name).contains(page.q.lower(), autoescape=True))
    total = (await db.execute(select(func.count()).select_from(query.subquery()))).scalar_one()
    rows = (await db.execute(
        query.order_by(MessageTemplate.is_default.desc(), MessageTemplate.name).limit(page.limit).offset(page.offset)
    )).scalars().all()
    return {"items": [_out(t) for t in rows], "total": total, "limit": page.limit, "offset": page.offset}


@router.post("", response_model=TemplateOut, status_code=status.HTTP_201_CREATED)
async def create_template(body: TemplateIn, current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    if body.is_default:
        await _clear_default(db, current_user)
    t = MessageTemplate(user_id=current_user.id, name=body.name, body=body.body, is_default=body.is_default)
    db.add(t)
    await db.commit()
    await db.refresh(t)
    return _out(t)


@router.patch("/{template_id}", response_model=TemplateOut)
async def update_template(template_id: str, body: TemplateUpdate, current_user: User = Depends(get_current_user),
                          db: AsyncSession = Depends(get_db)):
    t = await _owned(db, current_user, template_id)
    changes = body.model_dump(exclude_unset=True)
    if changes.get("is_default"):
        await _clear_default(db, current_user, except_id=t.id)
    for field, value in changes.items():
        setattr(t, field, value)
    await db.commit()
    await db.refresh(t)
    return _out(t)


@router.delete("/{template_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_template(template_id: str, current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    t = await _owned(db, current_user, template_id)
    await db.delete(t)
    await db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)
