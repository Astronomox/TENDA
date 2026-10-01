from typing import Literal, Optional

from pydantic import BaseModel

from schemas.common import UTCDateTime
from schemas.sales import SaleOut


class VoiceDraft(BaseModel):
    product_name: Optional[str]
    product_id: Optional[str]
    quantity: int
    unit_price: Optional[float]
    amount: Optional[float]
    customer_name: Optional[str]
    customer_id: Optional[str]
    sold_at: UTCDateTime


class Candidate(BaseModel):
    id: str
    name: str


class Candidates(BaseModel):
    customers: list[Candidate]
    products: list[Candidate]


class VoiceLogSaleOut(BaseModel):
    transcript: str
    saved: bool
    draft: VoiceDraft
    confidence: float
    missing_fields: list[str]
    candidates: Candidates
    warnings: list[str]
    sale: Optional[SaleOut]
    # Legacy TransactionOut fields, present only when saved (backward compatibility)
    id: Optional[str] = None
    user_id: Optional[str] = None
    product_name: Optional[str] = None
    quantity: Optional[int] = None
    amount: Optional[float] = None
    created_at: Optional[UTCDateTime] = None


class VoiceAskOut(BaseModel):
    session_id: str
    question: str
    answer: str
    created_at: UTCDateTime


class VoiceSessionListItem(BaseModel):
    id: str
    title: str
    created_at: UTCDateTime
    duration_sec: float
    turn_count: int
    preview: Optional[str]


class VoiceTurnOut(BaseModel):
    role: Literal["user", "assistant"]
    text: str
    created_at: UTCDateTime


class VoiceSessionDetail(BaseModel):
    id: str
    title: str
    created_at: UTCDateTime
    duration_sec: float
    turns: list[VoiceTurnOut]
