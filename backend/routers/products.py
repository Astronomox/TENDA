from typing import Optional

from fastapi import APIRouter, Depends, Response, status
from sqlalchemy.ext.asyncio import AsyncSession

from core.database import get_db
from core.errors import field_error
from models.user import User
from schemas.common import Page, PageParams, check_sort, page_params
from schemas.products import BulkProductsIn, BulkProductsOut, ProductIn, ProductOut, ProductUpdate
from services import product_service
from services.auth_service import get_current_user

router = APIRouter(prefix="/products", tags=["Products"])


@router.get("", response_model=Page[ProductOut], response_model_exclude_unset=True)
async def list_products(
    sort: Optional[str] = None,
    include: Optional[str] = None,
    page: PageParams = Depends(page_params),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    sort = check_sort(sort, {"name", "-created_at", "-revenue"}, "name")
    if include not in (None, "", "stats"):
        raise field_error(["query", "include"], "Include must be 'stats'")
    return await product_service.list_products(db, current_user, page, sort, include == "stats")


@router.post("", response_model=ProductOut, status_code=status.HTTP_201_CREATED, response_model_exclude_unset=True)
async def create_product(body: ProductIn, current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    return await product_service.create_product(db, current_user, body)


@router.post("/bulk", response_model=BulkProductsOut, response_model_exclude_unset=True)
async def bulk_products(body: BulkProductsIn, current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    return await product_service.bulk_upsert(db, current_user, body)


@router.get("/{product_id}", response_model=ProductOut)
async def get_product(product_id: str, current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    return await product_service.get_product(db, current_user, product_id)


@router.patch("/{product_id}", response_model=ProductOut)
async def update_product(
    product_id: str, body: ProductUpdate,
    current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db),
):
    return await product_service.update_product(db, current_user, product_id, body)


@router.delete("/{product_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_product(product_id: str, current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    await product_service.delete_product(db, current_user, product_id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)
