import io
import struct
import wave

from services.gemini import VoiceAnswer, VoiceSaleExtraction


def wav(seconds=1.0, amplitude=0, rate=8000) -> bytes:
    buf = io.BytesIO()
    with wave.open(buf, "wb") as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(rate)
        n = int(seconds * rate)
        w.writeframes(b"".join(struct.pack("<h", amplitude if i % 2 else -amplitude) for i in range(n)))
    return buf.getvalue()


SPEECH = wav(1.0, amplitude=8000)


def post_audio(client, h, path, data, mime="audio/wav", name="recording.wav", **extra):
    return client.post(path, headers=h, files={"audio": (name, data, mime)}, **extra)


def extraction(**kw):
    base = dict(has_speech=True, transcript="I sold two shea butter to Amina", audio_duration_sec=2.0,
                product_name="Shea Butter", quantity=2, unit_price=None, amount=None, customer_name="Amina",
                days_ago=None, product_count=1, confidence=0.9)
    base.update(kw)
    return VoiceSaleExtraction(**base)


def test_audio_checks_happen_before_ai(client, owner, fake_ai):
    empty = post_audio(client, owner, "/voice/ask", b"")
    assert empty.status_code == 422 and empty.json()["code"] == "NO_SPEECH"
    silent = post_audio(client, owner, "/voice/ask", wav(1.0, amplitude=0))
    assert silent.status_code == 422 and silent.json()["code"] == "NO_SPEECH"
    tiny = post_audio(client, owner, "/voice/log-sale", wav(0.1, amplitude=8000))
    assert tiny.json()["code"] == "NO_SPEECH"
    long = post_audio(client, owner, "/voice/ask", wav(121, amplitude=0, rate=1000))
    assert long.status_code == 413 and long.json()["code"] == "PAYLOAD_TOO_LARGE"
    junk = post_audio(client, owner, "/voice/ask", b"this is not audio at all", mime="audio/webm", name="recording.webm")
    assert junk.status_code == 415 and junk.json()["code"] == "UNSUPPORTED_MEDIA_TYPE"
    big = post_audio(client, owner, "/voice/ask", b"RIFF" + b"\0" * (10 * 1024 * 1024 + 10))
    assert big.status_code == 413
    assert fake_ai.calls == []  # none of these reached the model
    assert client.post("/voice/log-sale", headers=owner).status_code == 422  # no file


def test_sniffing_ignores_filename(client, owner, fake_ai):
    fake_ai.voice_answer = VoiceAnswer(has_speech=True, question="How much today?", answer="₦0 so far.", audio_duration_sec=1)
    r = post_audio(client, owner, "/voice/ask", SPEECH, mime="application/octet-stream", name="recording.m4a")
    assert r.status_code == 200
    assert fake_ai.calls[-1]["prompt"]  # reached the model with the sniffed wav type


def test_dry_run_returns_draft_and_saves_nothing(client, owner, fake_ai):
    p = client.post("/products", headers=owner, json={"name": "Shea Butter 250g", "price": 4500}).json()
    c = client.post("/customers", headers=owner, json={"name": "Amina Bello"}).json()
    fake_ai.extraction = extraction(product_name="Shea Butter 250g", customer_name="Amina Bello")
    r = post_audio(client, owner, "/voice/log-sale?dry_run=true", SPEECH)
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["saved"] is False and body["sale"] is None
    assert body["transcript"] == "I sold two shea butter to Amina"
    d = body["draft"]
    assert (d["product_id"], d["quantity"], d["unit_price"], d["amount"], d["customer_id"]) == (p["id"], 2, 4500, 9000, c["id"])
    assert body["missing_fields"] == [] and body["confidence"] == 0.9
    assert client.get("/sales", headers=owner).json()["total"] == 0
    assert "Shea Butter 250g" in fake_ai.calls[-1]["prompt"]  # catalogue passed to the single Gemini call


def test_fuzzy_and_ambiguous_matches(client, owner, fake_ai):
    client.post("/customers", headers=owner, json={"name": "Amina Bello"})
    client.post("/customers", headers=owner, json={"name": "Amina Yusuf"})
    fake_ai.extraction = extraction(product_name="Indomie", amount=1000, quantity=3, customer_name="Amina")
    body = post_audio(client, owner, "/voice/log-sale?dry_run=true", SPEECH).json()
    assert body["draft"]["customer_id"] is None
    assert {c["name"] for c in body["candidates"]["customers"]} == {"Amina Bello", "Amina Yusuf"}
    assert body["confidence"] < 0.9
    assert body["draft"]["unit_price"] == 333.33 and body["draft"]["amount"] == 1000


def test_missing_price_and_missing_product(client, owner, fake_ai):
    fake_ai.extraction = extraction(product_name="Indomie", customer_name=None)
    dry = post_audio(client, owner, "/voice/log-sale?dry_run=true", SPEECH).json()
    assert dry["missing_fields"] == ["amount"]
    save = post_audio(client, owner, "/voice/log-sale", SPEECH)
    assert save.status_code == 422 and save.json()["code"] == "SALE_NOT_UNDERSTOOD"
    assert save.json()["draft"]["product_name"] == "Indomie" and save.json()["saved"] is False

    fake_ai.extraction = extraction(product_name=None, transcript="I sold something")
    nothing = post_audio(client, owner, "/voice/log-sale?dry_run=true", SPEECH)
    assert nothing.status_code == 422 and nothing.json()["code"] == "SALE_NOT_UNDERSTOOD"

    fake_ai.extraction = extraction(has_speech=False, transcript="")
    silent = post_audio(client, owner, "/voice/log-sale?dry_run=true", SPEECH)
    assert silent.json()["code"] == "NO_SPEECH"


def test_legacy_log_sale_saves_with_backward_compatible_fields(client, owner, fake_ai):
    fake_ai.extraction = extraction(product_name="Rice (bag)", quantity=3, amount=4500, customer_name=None, product_count=2)
    r = post_audio(client, owner, "/voice/log-sale", SPEECH, )
    assert r.status_code == 201, r.text
    body = r.json()
    assert body["saved"] is True and body["sale"]["source"] == "voice"
    assert body["sale"]["transcript"] == "I sold two shea butter to Amina"
    # Old TransactionOut fields still present
    assert (body["product_name"], body["quantity"], body["amount"]) == ("Rice (bag)", 3, 4500)
    assert body["id"] == body["sale"]["id"] and body["created_at"]
    assert body["warnings"] == ["Only one product per recording is supported"]
    assert client.get("/analytics/summary", headers=owner).json()["total_revenue"] == 4500


def test_voice_idempotency(client, owner, fake_ai):
    fake_ai.extraction = extraction(product_name="Soap", amount=500, customer_name=None)
    h = {**owner, "Idempotency-Key": "voice-key-1"}
    a = post_audio(client, h, "/voice/log-sale", SPEECH)
    b = post_audio(client, h, "/voice/log-sale", SPEECH)
    assert a.status_code == b.status_code == 201 and a.json() == b.json()
    assert len([c for c in fake_ai.calls if c["purpose"] == "voice_log_sale"]) == 1
    assert client.get("/sales", headers=owner).json()["total"] == 1


def test_voice_ask_sessions(client, owner, fake_ai):
    fake_ai.voice_answer = VoiceAnswer(has_speech=True, question="How much did I make this week?",
                                       answer="**You made** ₦84,500 this week.", audio_duration_sec=1)
    first = post_audio(client, owner, "/voice/ask", SPEECH).json()
    assert first["question"] == "How much did I make this week?"
    assert first["answer"] == "You made ₦84,500 this week."  # markdown stripped for speech
    second = client.post("/voice/ask", headers=owner, files={"audio": ("r.wav", SPEECH, "audio/wav")},
                         data={"session_id": first["session_id"]}).json()
    assert second["session_id"] == first["session_id"]
    sessions = client.get("/voice/sessions", headers=owner).json()
    assert sessions["total"] == 1 and sessions["items"][0]["turn_count"] == 4
    assert sessions["items"][0]["duration_sec"] == 2.0
    detail = client.get(f"/voice/sessions/{first['session_id']}", headers=owner).json()
    assert [t["role"] for t in detail["turns"]] == ["user", "assistant", "user", "assistant"]
    assert client.delete(f"/voice/sessions/{first['session_id']}", headers=owner).status_code == 204
    assert client.get(f"/voice/sessions/{first['session_id']}", headers=owner).status_code == 404
    bad = client.post("/voice/ask", headers=owner, files={"audio": ("r.wav", SPEECH, "audio/wav")}, data={"session_id": "nope"})
    assert bad.status_code == 404


def test_ai_unavailable_without_key(client, owner):
    r = client.post("/ai/chat", headers=owner, json={"question": "hi"})
    assert r.status_code == 503 and r.json()["code"] == "AI_UNAVAILABLE" and "retry-after" in r.headers
    assert client.get("/health").json()["ai"] == "not_configured"
