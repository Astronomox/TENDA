from typing import Any, Dict, List, Literal, Optional

from pydantic import BaseModel, BeforeValidator, Field
from typing_extensions import Annotated

from schemas.common import Name80, UTCDateTime


def _strip(v):
    return v.strip() if isinstance(v, str) else v


class ChatMessage(BaseModel):
    role: Literal["user", "model", "assistant"]
    content: str = Field(..., max_length=16000)


class ChatRequest(BaseModel):
    question: Annotated[str, BeforeValidator(_strip), Field(min_length=1, max_length=2000)]
    history: List[ChatMessage] = []
    conversation_id: Optional[str] = None
    regenerate_message_id: Optional[str] = None


class ChatResponse(BaseModel):
    answer: str
    conversation_id: Optional[str] = None
    message_id: Optional[str] = None
    created_at: Optional[UTCDateTime] = None


class SummaryRequest(BaseModel):
    business_data: Optional[Dict[str, Any]] = None
    focus: Literal["today", "week", "month"] = "week"


class SummaryResponse(BaseModel):
    summary: str
    generated_at: UTCDateTime


class ConversationListItem(BaseModel):
    id: str
    title: str
    created_at: UTCDateTime
    updated_at: UTCDateTime
    message_count: int


class ConversationMessage(BaseModel):
    id: str
    role: Literal["user", "assistant"]
    content: str
    created_at: UTCDateTime


class ConversationDetail(BaseModel):
    id: str
    title: str
    created_at: UTCDateTime
    updated_at: UTCDateTime
    messages: list[ConversationMessage]


class ConversationUpdate(BaseModel):
    title: Name80
