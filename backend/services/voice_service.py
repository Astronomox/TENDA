import hashlib
import re
from datetime import timedelta

from fastapi.encoders import jsonable_encoder

from sqlalchemy import delete, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from core import clock, ratelimit
from core.errors import AppError, not_found
from models import User, VoiceSession, VoiceTurn
from schemas.common import PageParams
from schemas.sales import SaleIn
from services import idempotency
from services.ai_context import SYSTEM_PROMPT, VOICE_RULES, context_block
from services.audio import AudioInfo, MAX_SECONDS, no_speech, too_large, unsupported
from services.gemini import AIRejectedInput, gemini_service
from services.notification_service import notify
from services.sale_service import build_sale, customers_for, sale_out
from services.userdata import load_user_data

MAX_SPOKEN_ANSWER = 600
ONE_PRODUCT_WARNING = "Only one product per recording is supported"


def levenshtein(a: str, b: str) -> int:
    if a == b:
        return 0
    prev = list(range(len(b) + 1))
    for i, ca in enumerate(a, 1):
        cur = [i]
        for j, cb in enumerate(b, 1):
            cur.append(min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (ca != cb)))
        prev = cur
    return prev[-1]


def _key(text: str) -> str:
    return " ".join((text or "").split()).lower()


def match_by_name(spoken: str, rows: list, allow_first_name: bool = False) -> tuple[object | None, list, bool]:
    """Returns (match, candidates, fuzzy). Exact (case-insensitive) beats fuzzy."""
    key = _key(spoken)
    if not key:
        return None, [], False
    exact = [r for r in rows if r.name_key == key]
    if len(exact) == 1:
        return exact[0], [], False
    if len(exact) > 1:
        return None, exact[:3], False

    scored = []
    for r in rows:
        dist = levenshtein(key, r.name_key)
        close = dist <= 2
        if not close and len(key) >= 3:
            close = r.name_key.startswith(key) or key in r.name_key or r.name_key in key
        if not close and allow_first_name:
            close = r.name_key.split()[0] == key.split()[0]
        if close:
            scored.append((dist, r))
    scored.sort(key=lambda x: (x[0], x[1].name_key))
    if len(scored) == 1:
        return scored[0][1], [], True
    return None, [r for _, r in scored[:3]], False


def _extraction_prompt(data, today) -> str:
    products = sorted(data.active_products(), key=lambda p: p.name_key)[:200]
    customers = sorted(data.active_customers(), key=lambda c: c.name_key)[:300]
    catalogue = "\n".join(f"- {p.name} (₦{clock.money(p.price):,.2f})" for p in products) or "(empty)"
    names = "\n".join(f"- {c.name}" for c in customers) or "(none yet)"
    return f"""You are recording a sale for a small Nigerian business. Today is {today.isoformat()} ({today.strftime('%A')}).
Listen to the attached audio. The speaker may use Nigerian English, Pidgin, and Yoruba/Hausa/Igbo words.
Naira slang: "2k" = 2000, "5 thousand naira" = 5000, "N5000" = 5000, "one fifty" in a price = 150, "two packs" = quantity 2.
If no quantity is said, quantity is null (the server defaults it to 1). Only fill prices that were actually said.
"for <money>" after the items is usually the TOTAL amount, not the unit price.
If several different products are mentioned, extract only the first and set product_count accordingly.
Set has_speech=false and leave fields empty if the recording is silent, noise, or unintelligible.

Product catalogue (use the exact name when the speaker clearly means one of these):
{catalogue}

Known customers (use the exact name when the speaker clearly means one of these):
{names}"""


def _resolve(ex, data) -> tuple[dict, list[str], dict, list[str], float]:
    now = clock.now()
    confidence = max(0.0, min(1.0, float(ex.confidence or 0)))
    missing: list[str] = []
    warnings: list[str] = []
    candidates = {"customers": [], "products": []}

    product = None
    product_name = (ex.product_name or "").strip()[:80] or None
    if product_name:
        product, cands, fuzzy = match_by_name(product_name, data.active_products())
        if fuzzy:
            confidence *= 0.85
        if cands:
            candidates["products"] = [{"id": p.id, "name": p.name} for p in cands]
            confidence *= 0.7

    quantity = ex.quantity if ex.quantity and ex.quantity >= 1 else 1
    if quantity > 100_000:
        missing.append("quantity")
        quantity = 1

    unit_price = amount = None
    if ex.amount is not None and ex.amount >= 0:
        amount = clock.money(ex.amount)
        unit_price = clock.money(ex.unit_price) if ex.unit_price is not None and ex.unit_price >= 0 else clock.money(amount / quantity)
    elif ex.unit_price is not None and ex.unit_price >= 0:
        unit_price = clock.money(ex.unit_price)
        amount = clock.money(unit_price * quantity)
    elif product is not None:
        unit_price = clock.money(product.price)
        amount = clock.money(unit_price * quantity)
    else:
        missing.append("amount")

    customer = None
    customer_name = (ex.customer_name or "").strip()[:80] or None
    if customer_name:
        customer, cands, fuzzy = match_by_name(customer_name, data.active_customers(), allow_first_name=True)
        if fuzzy:
            confidence *= 0.85
        if cands:
            candidates["customers"] = [{"id": c.id, "name": c.name} for c in cands]
            confidence *= 0.7

    sold_at = now
    if ex.days_ago and 0 < ex.days_ago <= 730:
        sold_at = now - timedelta(days=ex.days_ago)
    if (ex.product_count or 1) > 1:
        warnings.append(ONE_PRODUCT_WARNING)

    draft = {
        "product_name": product.name if product else product_name,
        "product_id": product.id if product else None,
        "quantity": quantity,
        "unit_price": unit_price,
        "amount": amount,
        "customer_name": customer.name if customer else customer_name,
        "customer_id": customer.id if customer else None,
        "sold_at": sold_at,
    }
    return draft, missing, candidates, warnings, round(confidence, 2)


async def _ai_or_415(coro):
    try:
        return await coro
    except AIRejectedInput:
        raise unsupported()


async def log_sale(db: AsyncSession, user: User, audio: AudioInfo, dry_run: bool, key: str | None) -> tuple[int, dict]:
    ratelimit.enforce("voice_log_sale", str(user.id), limit=60, window=600)
    req_hash = hashlib.sha256(audio.data).hexdigest()
    if key and not dry_run:
        replay = await idempotency.lookup(db, user.id, key, req_hash)
        if replay:
            return replay

    data = await load_user_data(db, user)
    ex = await _ai_or_415(gemini_service.extract_sale_from_audio(
        audio.data, audio.mime_type, audio.suffix, _extraction_prompt(data, data.today), user.id
    ))
    if not ex.has_speech or not (ex.transcript or "").strip():
        raise no_speech()
    if audio.duration is None and ex.audio_duration_sec and ex.audio_duration_sec > MAX_SECONDS:
        raise too_large("Recordings must be 2 minutes or shorter.")

    draft, missing, candidates, warnings, confidence = _resolve(ex, data)
    body = {
        "transcript": ex.transcript.strip(),
        "saved": False,
        "draft": draft,
        "confidence": confidence,
        "missing_fields": missing,
        "candidates": candidates,
        "warnings": warnings,
        "sale": None,
    }
    if not draft["product_name"]:
        raise AppError(422, "SALE_NOT_UNDERSTOOD",
                       "I heard you, but couldn't tell which product was sold. Please try again or type it in.",
                       extra=_jsonable(body))
    if dry_run:
        return 200, body
    if missing:
        raise AppError(422, "SALE_NOT_UNDERSTOOD",
                       "I couldn't hear a price for that sale. Please say the price, or check the draft and save it yourself.",
                       extra=_jsonable(body))

    customer_name = None
    if not draft["customer_id"] and draft["customer_name"]:
        if candidates["customers"]:
            warnings.append("More than one customer matched; the sale was saved without a customer")
        else:
            customer_name = draft["customer_name"]  # R3 creates the customer
    sale = await build_sale(db, user, SaleIn(
        customer_id=draft["customer_id"],
        customer_name=customer_name,
        product_id=draft["product_id"],
        product_name=None if draft["product_id"] else draft["product_name"],
        quantity=draft["quantity"],
        unit_price=draft["unit_price"],
        amount=draft["amount"],
        sold_at=draft["sold_at"],
        source="voice",
        transcript=body["transcript"][:5000],
    ))
    sale.idempotency_key = key
    out = sale_out(sale, await customers_for(db, [sale]))
    body.update({
        "saved": True,
        "sale": out,
        # legacy TransactionOut fields
        "id": out["id"], "user_id": user.public_id, "product_name": out["product_name"],
        "quantity": out["quantity"], "amount": out["amount"], "created_at": out["created_at"],
    })
    await notify(db, user.id, "voice_sale_logged", f"voice_sale:{sale.id}",
                 "Voice sale saved", f"{sale.quantity} × {sale.product_name} for ₦{clock.money(sale.amount):,.0f}", "/sales")
    if key:
        idempotency.store(db, user.id, key, "/voice/log-sale", req_hash, 201, body)
    await db.commit()
    return 201, body


def _jsonable(body: dict) -> dict:
    out = dict(body)
    out["draft"] = {**body["draft"], "sold_at": clock.iso(body["draft"]["sold_at"])}
    return jsonable_encoder(out)


def clean_for_speech(text: str) -> str:
    text = re.sub(r"[*#`|_>]+", "", text or "")
    text = re.sub(r"^\s*[-•]\s+", "", text, flags=re.MULTILINE)
    text = re.sub(r"\s+", " ", text).strip()
    if len(text) <= MAX_SPOKEN_ANSWER:
        return text
    cut = text[:MAX_SPOKEN_ANSWER]
    end = max(cut.rfind(". "), cut.rfind("! "), cut.rfind("? "))
    return cut[: end + 1] if end > 200 else cut[: MAX_SPOKEN_ANSWER - 1].rstrip() + "…"


async def _owned_session(db: AsyncSession, user: User, session_id: str) -> VoiceSession:
    session = await db.get(VoiceSession, session_id)
    if session is None or session.user_id != user.id:
        raise not_found("Voice session")
    return session


async def ask(db: AsyncSession, user: User, audio: AudioInfo, session_id: str | None) -> dict:
    ratelimit.enforce("ai_10min", str(user.id), limit=30, window=600)
    ratelimit.enforce("ai_day", str(user.id), limit=300, window=86400)
    session = await _owned_session(db, user, session_id) if session_id else None

    earlier = ""
    if session is not None:
        turns = (await db.execute(
            select(VoiceTurn).where(VoiceTurn.session_id == session.id).order_by(VoiceTurn.created_at).limit(200)
        )).scalars().all()
        if turns:
            earlier = "\n\nEARLIER IN THIS VOICE SESSION:\n" + "\n".join(f"{t.role}: {t.text}" for t in turns[-10:])

    data = await load_user_data(db, user)
    prompt = (
        f"{context_block(data)}{earlier}\n\nThe owner asked a question in the attached audio. "
        "Transcribe the question into `question`, then answer it in `answer` using only the business data above. "
        "If the recording is silent, noise, or unintelligible, set has_speech=false."
    )
    result = await _ai_or_415(gemini_service.answer_from_audio(
        audio.data, audio.mime_type, audio.suffix, f"{SYSTEM_PROMPT}\n\n{VOICE_RULES}", prompt, user.id
    ))
    question = (result.question or "").strip()
    if not result.has_speech or not question:
        raise no_speech()
    if audio.duration is None and result.audio_duration_sec and result.audio_duration_sec > MAX_SECONDS:
        raise too_large("Recordings must be 2 minutes or shorter.")
    answer = clean_for_speech(result.answer)

    now = clock.now()
    if session is None:
        session = VoiceSession(user_id=user.id, title=question[:60], created_at=now, updated_at=now)
        db.add(session)
        await db.flush()
    session.duration_sec = float(session.duration_sec or 0) + float(audio.duration or result.audio_duration_sec or 0)
    session.updated_at = now
    db.add(VoiceTurn(session_id=session.id, role="user", text=question, created_at=now))
    answer_at = now + timedelta(milliseconds=1)
    db.add(VoiceTurn(session_id=session.id, role="assistant", text=answer, created_at=answer_at))
    await db.commit()
    return {"session_id": session.id, "question": question, "answer": answer, "created_at": answer_at}


async def list_sessions(db: AsyncSession, user: User, page: PageParams) -> dict:
    turn_counts = (
        select(VoiceTurn.session_id.label("sid"), func.count(VoiceTurn.id).label("n"))
        .group_by(VoiceTurn.session_id).subquery()
    )
    query = (
        select(VoiceSession, func.coalesce(turn_counts.c.n, 0))
        .outerjoin(turn_counts, turn_counts.c.sid == VoiceSession.id)
        .where(VoiceSession.user_id == user.id)
    )
    if page.q:
        query = query.where(func.lower(VoiceSession.title).contains(page.q.lower(), autoescape=True))
    total = (await db.execute(select(func.count()).select_from(query.subquery()))).scalar_one()
    rows = (await db.execute(
        query.order_by(VoiceSession.updated_at.desc(), VoiceSession.id).limit(page.limit).offset(page.offset)
    )).all()

    items = []
    for s, n in rows:
        last_answer = (await db.execute(
            select(VoiceTurn.text).where(VoiceTurn.session_id == s.id, VoiceTurn.role == "assistant")
            .order_by(VoiceTurn.created_at.desc()).limit(1)
        )).scalar_one_or_none()
        items.append({
            "id": s.id, "title": s.title, "created_at": s.created_at, "duration_sec": round(s.duration_sec or 0, 1),
            "turn_count": n, "preview": last_answer[:120] if last_answer else None,
        })
    return {"items": items, "total": total, "limit": page.limit, "offset": page.offset}


async def get_session(db: AsyncSession, user: User, session_id: str) -> dict:
    s = await _owned_session(db, user, session_id)
    turns = (await db.execute(
        select(VoiceTurn).where(VoiceTurn.session_id == s.id).order_by(VoiceTurn.created_at, VoiceTurn.id)
    )).scalars().all()
    return {
        "id": s.id, "title": s.title, "created_at": s.created_at, "duration_sec": round(s.duration_sec or 0, 1),
        "turns": [{"role": t.role, "text": t.text, "created_at": t.created_at} for t in turns],
    }


async def delete_session(db: AsyncSession, user: User, session_id: str) -> None:
    s = await _owned_session(db, user, session_id)
    await db.execute(delete(VoiceTurn).where(VoiceTurn.session_id == s.id))
    await db.delete(s)
    await db.commit()

