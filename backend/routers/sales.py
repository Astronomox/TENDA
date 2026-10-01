from datetime import date
from typing import Literal, Optional

from fastapi import APIRouter, Depends, Header, Query, Response, status
from fastapi.responses import JSONResponse
from sqlalchemy.ext.asyncio import AsyncSession

from core.database import get_db
from core.errors import field_error
from models.user import User
from schemas.common import Page, PageParams, check_sort, page_params
from schemas.sales import SaleIn, SaleOut, SaleUpdate
from services import idempotency, sale_service
from services.auth_service import get_current_user

router = APIRouter(prefix="/sales", tags=["Sales"])


@router.get("", response_model=Page[SaleOut])
async def list_sales(
    date_from: Optional[date] = Query(None, alias="from"),
    date_to: Optional[date] = Query(None, alias="to"),
    customer_id: Optional[str] = None,
    product_id: Optional[str] = None,
    source: Optional[Literal["manual", "voice"]] = None,
    sort: Optional[str] = None,
    page: PageParams = Depends(page_params),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    sort = check_sort(sort, set(sale_service.SORTS), "-sold_at")
    if date_from and date_to and date_from > date_to:
        raise field_error(["query", "from"], "'from' must be on or before 'to'")
    return await sale_service.list_sales(db, current_user, page, sort, date_from, date_to, customer_id, product_id, source)


@router.post("", response_model=SaleOut, status_code=status.HTTP_201_CREATED)
async def create_sale(
    body: SaleIn,
    idempotency_key: Optional[str] = Header(None, alias="Idempotency-Key"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    key = idempotency.validate_key(idempotency_key)
    status_code, out = await sale_service.create_sale(db, current_user, body, key)
    return JSONResponse(status_code=status_code, content=SaleOut.model_validate(out).model_dump(mode="json"))


@router.get("/{sale_id}", response_model=SaleOut)
async def get_sale(sale_id: str, current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    return await sale_service.get_sale(db, current_user, sale_id)


@router.patch("/{sale_id}", response_model=SaleOut)
async def update_sale(
    sale_id: str, body: SaleUpdate,
    current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db),
):
    return await sale_service.update_sale(db, current_user, sale_id, body)


@router.delete("/{sale_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_sale(sale_id: str, current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    await sale_service.delete_sale(db, current_user, sale_id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)
