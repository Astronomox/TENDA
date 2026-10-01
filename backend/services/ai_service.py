import hashlib
import json
import time
from datetime import timedelta

from sqlalchemy import delete, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from core import clock, ratelimit
from core.errors import not_found
from models import AIConversation, AIMessage, User
from schemas.chat import ChatRequest, SummaryRequest
from schemas.common import PageParams
from services.ai_context import SYSTEM_PROMPT, context_block
from services.gemini import gemini_service
from services.userdata import load_user_data

MAX_TURNS = 20
MAX_HISTORY_CHARS = 16_000
SUMMARY_TTL = 15 * 60
SUMMARY_MIN_GAP = 5 * 60

# user_id -> {cache_key: (generated_at_monotonic, generated_at_utc, text)}
_summary_cache: dict[int, dict[str, tuple[float, object, str]]] = {}


def trim_history(turns: list[dict]) -> list[dict]:
    """Keep the last 20 turns, then drop oldest until ≤ 16,000 chars (§15.1)."""
    turns = turns[-MAX_TURNS:]
    while turns and sum(len(t["content"]) for t in turns) > MAX_HISTORY_CHARS:
        turns = turns[1:]
    return turns


def _to_contents(history: list[dict], question: str, context: str) -> list[dict]:
    contents = []
    for t in history:
        role = "model" if t["role"] in ("model", "assistant") else "user"
        contents.append({"role": role, "parts": [{"text": t["content"]}]})
    contents.append({"role": "user", "parts": [{"text": f"{context}\n\nQUESTION: {question}"}]})
    return contents


async def _owned_conversation(db: AsyncSession, user: User, conversation_id: str) -> AIConversation:
    conv = await db.get(AIConversation, conversation_id)
    if conv is None or conv.user_id != user.id:
        raise not_found("Conversation")
    return conv


async def _messages(db: AsyncSession, conversation_id: str) -> list[AIMessage]:
    return list((await db.execute(
        select(AIMessage)
        .where(AIMessage.conversation_id == conversation_id, AIMessage.error.is_(False))
        .order_by(AIMessage.created_at, AIMessage.id)
    )).scalars().all())


async def chat(db: AsyncSession, user: User, req: ChatRequest) -> dict:
    ratelimit.enforce("ai_10min", str(user.id), limit=30, window=600)
    ratelimit.enforce("ai_day", str(user.id), limit=300, window=86400)

    conv = None
    regen_target = None
    if req.conversation_id:
        conv = await _owned_conversation(db, user, req.conversation_id)
        msgs = await _messages(db, conv.id)
        if req.regenerate_message_id:
            idx = next((i for i, m in enumerate(msgs) if m.id == req.regenerate_message_id and m.role == "assistant"), None)
            if idx is None:
                raise not_found("Message")
            regen_target = msgs[idx]
            msgs = msgs[: max(idx - 1, 0)]  # history before the question being regenerated
        history = [{"role": m.role, "content": m.content} for m in msgs]
    else:
        history = [{"role": m.role, "content": m.content} for m in req.history]

    data = await load_user_data(db, user)
    contents = _to_contents(trim_history(history), req.question, context_block(data))
    # Failures raise here, before anything is persisted (§15.2).
    answer = await gemini_service.generate_text(SYSTEM_PROMPT, contents, "chat", user.id)

    now = clock.now()
    if conv is None:
        conv = AIConversation(user_id=user.id, title=req.question[:60], created_at=now, updated_at=now)
        db.add(conv)
        await db.flush()
    conv.updated_at = now
    if regen_target is not None:
        regen_target.content = answer
        message = regen_target
    else:
        db.add(AIMessage(conversation_id=conv.id, role="user", content=req.question, created_at=now))
        # +1 ms keeps the answer ordered after its question
        message = AIMessage(conversation_id=conv.id, role="assistant", content=answer,
                            created_at=now + timedelta(milliseconds=1))
        db.add(message)
    await db.commit()
    return {"answer": answer, "conversation_id": conv.id, "message_id": message.id, "created_at": message.created_at}


async def generate_summary(db: AsyncSession, user: User, req: SummaryRequest) -> dict:
    if req.business_data:
        data_text = "BUSINESS DATA (JSON):\n" + json.dumps(req.business_data, ensure_ascii=False, default=str)
    else:
        data_text = context_block(await load_user_data(db, user))
    cache_key = hashlib.sha256(f"{req.focus}|{data_text}".encode()).hexdigest()

    now_mono = time.monotonic()
    cache = _summary_cache.setdefault(user.id, {})
    hit = cache.get(cache_key)
    if hit and now_mono - hit[0] < SUMMARY_TTL:
        return {"summary": hit[2], "generated_at": hit[1]}
    latest = max(cache.values(), key=lambda v: v[0], default=None)
    if latest and now_mono - latest[0] < SUMMARY_MIN_GAP:
        # 1 generation / 5 min: serve the most recent briefing instead of calling the model again
        return {"summary": latest[2], "generated_at": latest[1]}

    period = {"today": "today", "week": "this week", "month": "this month"}[req.focus]
    prompt = (
        f"{data_text}\n\nWrite the owner's briefing for {period}: 2–4 short sentences, plain text (no markdown), "
        "at most 500 characters, using only the numbers above, and end with exactly one concrete action they can take."
    )
    text = await gemini_service.generate_text(SYSTEM_PROMPT, prompt, "summary", user.id)
    text = text.replace("**", "")[:500]
    generated_at = clock.now()
    cache.clear()
    cache[cache_key] = (now_mono, generated_at, text)
    return {"summary": text, "generated_at": generated_at}


async def list_conversations(db: AsyncSession, user: User, page: PageParams) -> dict:
    counts = (
        select(AIMessage.conversation_id.label("cid"), func.count(AIMessage.id).label("n"))
        .where(AIMessage.error.is_(False))
        .group_by(AIMessage.conversation_id)
        .subquery()
    )
    query = (
        select(AIConversation, func.coalesce(counts.c.n, 0))
        .outerjoin(counts, counts.c.cid == AIConversation.id)
        .where(AIConversation.user_id == user.id)
    )
    if page.q:
        query = query.where(func.lower(AIConversation.title).contains(page.q.lower(), autoescape=True))
    total = (await db.execute(select(func.count()).select_from(query.subquery()))).scalar_one()
    rows = (await db.execute(
        query.order_by(AIConversation.updated_at.desc(), AIConversation.id).limit(page.limit).offset(page.offset)
    )).all()
    return {
        "items": [
            {"id": c.id, "title": c.title, "created_at": c.created_at, "updated_at": c.updated_at, "message_count": n}
            for c, n in rows
        ],
        "total": total, "limit": page.limit, "offset": page.offset,
    }


async def get_conversation(db: AsyncSession, user: User, conversation_id: str) -> dict:
    conv = await _owned_conversation(db, user, conversation_id)
    msgs = await _messages(db, conv.id)
    return {
        "id": conv.id, "title": conv.title, "created_at": conv.created_at, "updated_at": conv.updated_at,
        "messages": [{"id": m.id, "role": m.role, "content": m.content, "created_at": m.created_at} for m in msgs],
    }


async def rename_conversation(db: AsyncSession, user: User, conversation_id: str, title: str) -> dict:
    conv = await _owned_conversation(db, user, conversation_id)
    conv.title = title
    await db.commit()
    return await get_conversation(db, user, conversation_id)


async def delete_conversation(db: AsyncSession, user: User, conversation_id: str) -> None:
    conv = await _owned_conversation(db, user, conversation_id)
    await db.execute(delete(AIMessage).where(AIMessage.conversation_id == conv.id))
    await db.delete(conv)
    await db.commit()


def clear_caches() -> None:
    _summary_cache.clear()
