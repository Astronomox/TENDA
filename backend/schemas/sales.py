from datetime import datetime
from typing import Literal, Optional

from pydantic import BaseModel, Field, model_validator

from schemas.common import Amount, Name80, Price, Quantity, UTCDateTime


class SaleOut(BaseModel):
    id: str
    customer_id: Optional[str]
    customer_name: Optional[str]
    product_id: Optional[str]
    product_name: str
    quantity: int
    unit_price: float
    amount: float
    source: Literal["manual", "voice"]
    transcript: Optional[str]
    note: Optional[str]
    sold_at: UTCDateTime
    created_at: UTCDateTime
    updated_at: UTCDateTime


class SaleIn(BaseModel):
    customer_id: Optional[str] = None
    customer_name: Optional[Name80] = None
    product_id: Optional[str] = None
    product_name: Optional[Name80] = None
    quantity: Quantity
    unit_price: Optional[Price] = None
    amount: Optional[Amount] = None
    sold_at: Optional[datetime] = None
    note: Optional[str] = Field(None, max_length=500)
    # Set when a confirmed voice draft is saved through POST /sales (§11.3)
    source: Literal["manual", "voice"] = "manual"
    transcript: Optional[str] = Field(None, max_length=5000)


class SaleUpdate(BaseModel):
    customer_id: Optional[str] = None
    product_id: Optional[str] = None
    product_name: Optional[Name80] = None
    quantity: Optional[Quantity] = None
    unit_price: Optional[Price] = None
    amount: Optional[Amount] = None
    sold_at: Optional[datetime] = None
    note: Optional[str] = Field(None, max_length=500)

    @model_validator(mode="after")
    def _not_null(self):
        for field in ("product_name", "quantity", "unit_price", "amount", "sold_at"):
            if field in self.model_fields_set and getattr(self, field) is None:
                raise ValueError(f"{field.replace('_', ' ').capitalize()} can't be empty")
        return self
