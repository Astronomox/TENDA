"""CORS + error envelope, products, customers, profile, chat, notifications, templates, health."""
ORIGIN = "http://localhost:3000"


def test_cors_preflight_allowed_and_unknown(client):
    r = client.options("/customers", headers={
        "Origin": ORIGIN, "Access-Control-Request-Method": "POST",
        "Access-Control-Request-Headers": "authorization,content-type,idempotency-key",
    })
    assert r.status_code == 200 and r.headers["access-control-allow-origin"] == ORIGIN
    preview = client.options("/ai/chat", headers={"Origin": "https://tenda-git-abc123-team.vercel.app", "Access-Control-Request-Method": "POST"})
    assert preview.headers["access-control-allow-origin"] == "https://tenda-git-abc123-team.vercel.app"
    unknown = client.options("/ai/chat", headers={"Origin": "https://evil.example", "Access-Control-Request-Method": "POST"})
    assert unknown.status_code != 500 and "access-control-allow-origin" not in unknown.headers


def test_errors_carry_cors_headers_and_code(client, owner, monkeypatch):
    r = client.get("/auth/me", headers={"Origin": ORIGIN})
    assert r.status_code == 401 and r.headers["access-control-allow-origin"] == ORIGIN
    assert r.json()["code"] == "UNAUTHENTICATED"

    from services import analytics_service

    async def boom(*args, **kwargs):
        raise RuntimeError("secret internal detail")
    monkeypatch.setattr(analytics_service, "dashboard", boom)
    r = client.get("/analytics/dashboard", headers={**owner, "Origin": ORIGIN})
    assert r.status_code == 500 and r.json() == {"detail": "Something went wrong on our side. Please try again.", "code": "INTERNAL"}
    assert r.headers["access-control-allow-origin"] == ORIGIN
    assert "x-request-id" in r.headers


def test_404_and_request_id_and_no_store(client, owner):
    r = client.get("/does-not-exist")
    assert r.status_code == 404 and r.json()["code"] == "NOT_FOUND"
    r = client.get("/products", headers={**owner, "X-Request-ID": "abc-123"})
    assert r.headers["x-request-id"] == "abc-123" and r.headers["cache-control"] == "no-store"


def test_products_crud_and_validation(client, owner):
    p = client.post("/products", headers=owner, json={"name": " Shea Butter ", "price": 4500, "repurchase_days": 30, "is_replenishable": True})
    assert p.status_code == 201 and p.json()["name"] == "Shea Butter" and "stats" not in p.json()
    pid = p.json()["id"]
    dup = client.post("/products", headers=owner, json={"name": "shea butter", "price": 1})
    assert dup.status_code == 409 and dup.json()["code"] == "CONFLICT"
    for bad in ({"name": "", "price": 1}, {"name": "A", "price": -1}, {"name": "A", "price": "4500"},
                {"name": "A", "price": 1.234}, {"name": "A", "price": 1, "repurchase_days": 0},
                {"name": "A", "price": 1, "repurchase_days": 366}, {"name": "A", "price": 1, "repurchase_days": 1.5},
                {"name": "A", "price": 1, "is_replenishable": "true"}):
        assert client.post("/products", headers=owner, json=bad).status_code == 422, bad
    neg = client.post("/products", headers=owner, json={"name": "A", "price": -1}).json()
    assert neg["detail"][0]["msg"] == "Price can't be negative"

    assert client.get("/products?q=shea&limit=5", headers=owner).json()["total"] == 1
    detail = client.get(f"/products/{pid}", headers=owner).json()
    assert detail["stats"] == {"units_sold": 0, "revenue": 0, "last_sold_at": None}
    assert client.patch(f"/products/{pid}", headers=owner, json={"price": 5000}).json()["price"] == 5000
    assert client.delete(f"/products/{pid}", headers=owner).status_code == 204
    assert client.get("/products", headers=owner).json()["total"] == 0
    # Name is free again once archived
    assert client.post("/products", headers=owner, json={"name": "Shea Butter", "price": 1}).status_code == 201


def test_products_bulk(client, owner):
    ok = client.post("/products/bulk", headers=owner, json={"products": [{"name": "A", "price": 1}, {"name": "B", "price": 2}]})
    assert ok.status_code == 200 and len(ok.json()["items"]) == 2
    empty = client.post("/products/bulk", headers=owner, json={"products": []})
    assert empty.status_code == 422 and empty.json()["detail"][0]["msg"] == "Add at least one product"
    dup = client.post("/products/bulk", headers=owner, json={"products": [{"name": "C", "price": 1}, {"name": "c", "price": 2}]})
    assert dup.status_code == 409
    bad_row = client.post("/products/bulk", headers=owner, json={"products": [{"name": "D", "price": 1}, {"name": "E", "price": -5}]})
    assert bad_row.status_code == 422 and bad_row.json()["detail"][0]["loc"] == ["body", "products", 1, "price"]
    too_many = client.post("/products/bulk", headers=owner, json={"products": [{"name": f"P{i}", "price": 1} for i in range(201)]})
    assert too_many.status_code == 422
    assert client.get("/products", headers=owner).json()["total"] == 2  # all-or-nothing


def test_customers_phone_normalisation_and_conflict(client, owner):
    for raw in ("0803 123 4567", "08031234567", "+2348031234567", "2348031234567", "0803-123-4567"):
        r = client.post("/customers", headers=owner, json={"name": "X", "phone": raw})
        if r.status_code == 201:
            assert r.json()["phone"] == "+2348031234567"
            first_id = r.json()["id"]
        else:
            assert r.status_code == 409 and r.json()["existing_customer_id"] == first_id
            assert "X already has this phone number" == r.json()["detail"]
    assert client.post("/customers", headers=owner, json={"name": "Y", "phone": "+44 20 7946 0958"}).json()["phone"] == "+442079460958"
    for bad in ("abc", "12345", "1" * 16):
        r = client.post("/customers", headers=owner, json={"name": "Z", "phone": bad})
        assert r.status_code == 422 and r.json()["detail"][0]["msg"] == "Enter a valid phone number", bad
    assert client.post("/customers", headers=owner, json={"name": "Z", "email": "bad"}).status_code == 422
    assert client.post("/customers", headers=owner, json={"name": "Z", "note": "x" * 501}).status_code == 422
    assert client.post("/customers", headers=owner, json={"name": "   "}).status_code == 422
    # search by local phone format
    assert client.get("/customers?q=0803123", headers=owner).json()["total"] == 1


def test_customer_detail_shape(client, owner, freeze):
    freeze("2026-10-01T10:00:00")
    c = client.post("/customers", headers=owner, json={"name": "Amina Bello"}).json()
    assert c["status"] == "new" and c["stats"]["purchase_count"] == 0
    assert [m["month"] for m in c["revenue_by_month"]] == ["2026-05", "2026-06", "2026-07", "2026-08", "2026-09", "2026-10"]
    client.post("/sales", headers=owner, json={"customer_id": c["id"], "product_name": "Soap", "quantity": 2,
                                               "unit_price": 100, "sold_at": "2026-09-20T10:00:00Z"})
    d = client.get(f"/customers/{c['id']}", headers=owner).json()
    assert d["stats"]["total_spent"] == 200 and d["stats"]["days_since_last_purchase"] == 11
    assert d["top_products"][0]["units"] == 2
    assert [a["label"] for a in d["recent_activity"]] == ["Added as a customer", "Bought 2 × Soap"]
    lst = client.get("/customers?sort=-total_spent", headers=owner).json()["items"][0]
    assert lst["total_spent"] == 200 and lst["purchase_count"] == 1


def test_business_profile_rules(client, owner):
    assert client.put("/business/profile", headers=owner, json={"goal": "world_domination"}).status_code == 422
    assert client.put("/business/profile", headers=owner, json={"sales_rhythm": "custom"}).status_code == 422
    assert client.put("/business/profile", headers=owner, json={"sales_rhythm": "weekly", "custom_rhythm_days": 5}).status_code == 422
    assert client.put("/business/profile", headers=owner, json={"sales_rhythm": "custom", "custom_rhythm_days": 366}).status_code == 422
    ok = client.put("/business/profile", headers=owner, json={"sales_rhythm": "custom", "custom_rhythm_days": 21, "communication_tone": "warm"})
    assert ok.status_code == 200 and ok.json()["custom_rhythm_days"] == 21
    cleared = client.put("/business/profile", headers=owner, json={"business_name": None}).json()
    assert cleared["business_name"] is None and cleared["communication_tone"] == "warm"


def test_chat_conversations(client, owner, fake_ai):
    fake_ai.text = "You made **₦0** so far."
    r = client.post("/ai/chat", headers=owner, json={"question": "  How much did I make?  "}).json()
    assert r["answer"] == "You made **₦0** so far." and r["conversation_id"] and r["message_id"]
    assert "Never invent" in fake_ai.calls[-1]["system"]
    client.post("/ai/chat", headers=owner, json={"question": "And yesterday?", "conversation_id": r["conversation_id"]})
    assert len(fake_ai.calls[-1]["contents"]) == 3  # server loaded the earlier turns itself
    lst = client.get("/ai/conversations", headers=owner).json()
    assert lst["items"][0]["message_count"] == 4 and lst["items"][0]["title"] == "How much did I make?"
    fake_ai.text = "Regenerated."
    regen = client.post("/ai/chat", headers=owner, json={"question": "How much did I make?", "conversation_id": r["conversation_id"],
                                                        "regenerate_message_id": r["message_id"]}).json()
    assert regen["message_id"] == r["message_id"]
    detail = client.get(f"/ai/conversations/{r['conversation_id']}", headers=owner).json()
    assert detail["messages"][1]["content"] == "Regenerated." and len(detail["messages"]) == 4
    assert client.patch(f"/ai/conversations/{r['conversation_id']}", headers=owner, json={"title": "Money"}).json()["title"] == "Money"
    assert client.delete(f"/ai/conversations/{r['conversation_id']}", headers=owner).status_code == 204
    for bad in ({"question": ""}, {"question": "x" * 2001}, {"question": "hi", "history": [{"role": "system", "content": "x"}]}):
        assert client.post("/ai/chat", headers=owner, json=bad).status_code == 422


def test_chat_history_trimmed(client, owner, fake_ai):
    history = [{"role": "user" if i % 2 == 0 else "assistant", "content": f"turn {i}"} for i in range(30)]
    client.post("/ai/chat", headers=owner, json={"question": "hi", "history": history})
    assert len(fake_ai.calls[-1]["contents"]) == 21  # 20 history turns + the question


def test_generate_summary_server_side_and_cached(client, owner, fake_ai):
    fake_ai.text = "Good week. **Call** Amina."
    a = client.post("/ai/generate-summary", headers=owner, json={}).json()
    b = client.post("/ai/generate-summary", headers=owner).json()
    assert a["summary"] == b["summary"] == "Good week. Call Amina." and a["generated_at"]
    assert len([c for c in fake_ai.calls if c["purpose"] == "summary"]) == 1
    assert "BUSINESS DATA" in fake_ai.calls[-1]["contents"]


def test_insights_refresh_rate_limited(client, owner, fake_ai):
    fake_ai.text = "Steady start."
    first = client.post("/insights/refresh", headers=owner)
    assert first.status_code == 200 and first.json()["ai_narrative"]["text"] == "Steady start."
    assert client.get("/insights", headers=owner).json()["ai_narrative"]["text"] == "Steady start."
    second = client.post("/insights/refresh", headers=owner)
    assert second.status_code == 429 and second.json()["code"] == "RATE_LIMITED"


def test_notifications_and_templates(client, owner, freeze):
    freeze("2026-10-05T09:00:00")  # Monday 10:00 Lagos
    client.post("/sales", headers=owner, json={"product_name": "Soap", "quantity": 1, "unit_price": 150000, "sold_at": "2026-10-01T10:00:00Z"})
    n = client.get("/notifications", headers=owner).json()
    types = {i["type"] for i in n["items"]}
    assert {"weekly_summary", "top_product_week", "revenue_milestone"} <= types
    assert n["unread_count"] == len(n["items"])
    again = client.get("/notifications", headers=owner).json()
    assert len(again["items"]) == len(n["items"])  # deduped
    assert client.post("/notifications/read", headers=owner, json={"all": True}).status_code == 204
    assert client.get("/notifications", headers=owner).json()["unread_count"] == 0
    assert client.delete(f"/notifications/{n['items'][0]['id']}", headers=owner).status_code == 204
    assert client.post("/notifications/read", headers=owner, json={}).status_code == 422

    bad = client.post("/templates", headers=owner, json={"name": "T", "body": "Hi {nickname}"})
    assert bad.status_code == 422
    t = client.post("/templates", headers=owner, json={"name": "Default", "body": "Hi {customer_first_name}, need more {product_name}?", "is_default": True})
    assert t.status_code == 201
    t2 = client.post("/templates", headers=owner, json={"name": "Other", "body": "Hello", "is_default": True}).json()
    defaults = [x for x in client.get("/templates", headers=owner).json()["items"] if x["is_default"]]
    assert [d["id"] for d in defaults] == [t2["id"]]  # at most one default


def test_health(client):
    h = client.get("/health").json()
    assert h["status"] == "ok" and h["db"] == "ok" and h["version"] == "1.4.0" and h["time"].endswith("Z")
