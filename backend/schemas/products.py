from typing import Optional

from pydantic import BaseModel, StrictBool, field_validator, model_validator

from schemas.common import Name80, Price, RepurchaseDays, UTCDateTime


class ProductStats(BaseModel):
    units_sold: int
    revenue: float
    last_sold_at: Optional[UTCDateTime]


class ProductOut(BaseModel):
    id: str
    name: str
    price: float
    repurchase_days: Optional[int]
    is_replenishable: Optional[bool]
    created_at: UTCDateTime
    updated_at: UTCDateTime
    stats: Optional[ProductStats] = None


class ProductIn(BaseModel):
    name: Name80
    price: Price
    repurchase_days: Optional[RepurchaseDays] = None
    is_replenishable: Optional[StrictBool] = None


class ProductUpdate(BaseModel):
    name: Optional[Name80] = None
    price: Optional[Price] = None
    repurchase_days: Optional[RepurchaseDays] = None
    is_replenishable: Optional[StrictBool] = None

    @model_validator(mode="after")
    def _not_null(self):
        for field in ("name", "price"):
            if field in self.model_fields_set and getattr(self, field) is None:
                raise ValueError(f"{field.capitalize()} can't be empty")
        return self


class BulkProductRow(ProductIn):
    id: Optional[str] = None  # present -> update that product, absent -> create


class BulkProductsIn(BaseModel):
    products: list[BulkProductRow]

    @field_validator("products")
    @classmethod
    def _size(cls, v):
        if not v:
            raise ValueError("Add at least one product")
        if len(v) > 200:
            raise ValueError("You can save at most 200 products at once")
        return v


class BulkProductsOut(BaseModel):
    items: list[ProductOut]
