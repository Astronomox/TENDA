from typing import Literal, Optional

from pydantic import BaseModel, model_validator

from schemas.common import Name80, UTCDateTime

Goal = Literal["grow_revenue", "repeat_customers", "move_inventory", "stabilize"]
CustomerStyle = Literal["one_time", "repeat_heavy", "relationship_based"]
BusinessType = Literal["fashion_clothing", "food_consumables", "beauty_personal_care", "services", "general_retail", "other"]
SalesRhythm = Literal["weekly", "every_2_weeks", "monthly", "irregular", "custom"]
SalesChannel = Literal["whatsapp", "phone", "in_person", "mixed"]
CommunicationTone = Literal["friendly", "professional", "warm"]
PriceRange = Literal["low", "medium", "high"]

RHYTHM_DAYS = {"weekly": 7, "every_2_weeks": 14, "monthly": 30}


class BusinessProfileOut(BaseModel):
    business_name: Optional[str]
    currency: str
    goal: Optional[Goal]
    customer_style: Optional[CustomerStyle]
    business_type: Optional[BusinessType]
    sales_rhythm: Optional[SalesRhythm]
    custom_rhythm_days: Optional[int]
    sales_channel: Optional[SalesChannel]
    communication_tone: Optional[CommunicationTone]
    price_range: Optional[PriceRange]
    updated_at: UTCDateTime


class BusinessProfileUpdate(BaseModel):
    """PATCH semantics: omitted keys unchanged, explicit null clears (§7.2)."""
    business_name: Optional[Name80] = None
    currency: Optional[Literal["NGN"]] = None
    goal: Optional[Goal] = None
    customer_style: Optional[CustomerStyle] = None
    business_type: Optional[BusinessType] = None
    sales_rhythm: Optional[SalesRhythm] = None
    custom_rhythm_days: Optional[int] = None
    sales_channel: Optional[SalesChannel] = None
    communication_tone: Optional[CommunicationTone] = None
    price_range: Optional[PriceRange] = None

    @model_validator(mode="after")
    def _currency_not_null(self):
        if "currency" in self.model_fields_set and self.currency is None:
            raise ValueError("Currency can't be empty")
        return self


def validate_rhythm(sales_rhythm: str | None, custom_days) -> None:
    """Checked against the *merged* profile, so partial updates stay consistent."""
    from core.errors import field_error

    if custom_days is not None and (isinstance(custom_days, bool) or not isinstance(custom_days, int)):
        raise field_error(["body", "custom_rhythm_days"], "Custom rhythm days must be a whole number")
    if sales_rhythm == "custom":
        if custom_days is None:
            raise field_error(["body", "custom_rhythm_days"], "Enter the number of days for a custom rhythm")
        if not 1 <= custom_days <= 365:
            raise field_error(["body", "custom_rhythm_days"], "Custom rhythm days must be between 1 and 365")
    elif custom_days is not None:
        raise field_error(["body", "custom_rhythm_days"], "Custom rhythm days can only be set when the rhythm is custom")
