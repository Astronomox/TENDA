from typing import Literal, Optional

from fastapi import APIRouter, Depends, Response, status
from sqlalchemy.ext.asyncio import AsyncSession

from core.database import get_db
from models.user import User
from schemas.common import Page, PageParams, check_sort, page_params
from schemas.customers import CustomerDetail, CustomerIn, CustomerOut, CustomerUpdate
from schemas.sales import SaleOut
from services import customer_service, sale_service
from services.auth_service import get_current_user

router = APIRouter(prefix="/customers", tags=["Customers"])


@router.get("", response_model=Page[CustomerOut])
async def list_customers(
    status: Optional[Literal["new", "active", "at_risk", "lapsed"]] = None,
    sort: Optional[str] = None,
    page: PageParams = Depends(page_params),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    sort = check_sort(sort, {"name", "-last_purchase_at", "-total_spent", "-created_at"}, "name")
    return await customer_service.list_customers(db, current_user, page, sort, status)


@router.post("", response_model=CustomerDetail, status_code=status.HTTP_201_CREATED)
async def create_customer(body: CustomerIn, current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    return await customer_service.create_customer(db, current_user, body)


@router.get("/{customer_id}", response_model=CustomerDetail)
async def get_customer(customer_id: str, current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    return await customer_service.customer_detail(db, current_user, customer_id)


@router.patch("/{customer_id}", response_model=CustomerDetail)
async def update_customer(
    customer_id: str, body: CustomerUpdate,
    current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db),
):
    return await customer_service.update_customer(db, current_user, customer_id, body)


@router.delete("/{customer_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_customer(customer_id: str, current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    await customer_service.delete_customer(db, current_user, customer_id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.get("/{customer_id}/sales", response_model=Page[SaleOut])
async def customer_sales(
    customer_id: str,
    page: PageParams = Depends(page_params),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await customer_service.get_owned(db, current_user, customer_id)
    page.q = None
    return await sale_service.list_sales(db, current_user, page, "-sold_at", customer_id=customer_id)
