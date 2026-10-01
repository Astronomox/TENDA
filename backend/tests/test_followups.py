"""§19.3 follow-up prediction — unit tests on the pure engine + API tests."""
from datetime import date, datetime, timedelta
from types import SimpleNamespace as NS

from services.followup_engine import compute_follow_ups, customer_status

TZ = "Africa/Lagos"
TODAY = date(2026, 10, 1)


def sale(day: date, cust="c1", pid="p1", name="Shea Butter", hour_utc=10, amount=100):
    return NS(customer_id=cust, product_id=pid, product_name=name, amount=amount,
              sold_at=datetime(day.year, day.month, day.day, hour_utc))


CUSTOMERS = {"c1": NS(archived_at=None), "c2": NS(archived_at=None), "gone": NS(archived_at=datetime(2026, 1, 1))}


def run(sales, products=None, profile=None, actions=()):
    products = products if products is not None else {"p1": NS(name="Shea Butter", repurchase_days=None, is_replenishable=None)}
    return compute_follow_ups(sales, CUSTOMERS, products, profile, actions, TODAY, TZ)


def d(days_ago: int) -> date:
    return TODAY - timedelta(days=days_ago)


def test_history_uses_median_gap_and_confidence():
    # gaps 10, 10, 40 -> median 10 (a mean would be 20)
    preds = run([sale(d(75)), sale(d(65)), sale(d(55)), sale(d(15))])
    p = preds[0]
    assert p.interval_source == "history" and p.interval_days == 10
    assert p.confidence == 0.8  # 0.5 + 0.1 × 3
    assert p.status == "overdue" and p.days_overdue == 5
    assert p.expected_at == d(5)


def test_same_day_purchases_count_once():
    # two sales on the same Lagos day + one 30 days later -> 2 distinct dates, gap 30
    preds = run([sale(d(65), hour_utc=8), sale(d(65), hour_utc=20), sale(d(35))])
    assert preds[0].interval_days == 30 and preds[0].confidence == 0.6
    assert preds[0].purchase_count == 3


def test_interval_clamped_to_minimum_3_days():
    preds = run([sale(d(2)), sale(d(1))])
    assert preds[0].interval_days == 3


def test_product_repurchase_days_then_business_rhythm():
    products = {"p1": NS(name="Shea Butter", repurchase_days=7, is_replenishable=True)}
    p = run([sale(d(10))], products=products)[0]
    assert (p.interval_source, p.interval_days, p.confidence, p.status, p.days_overdue) == ("product", 7, 0.5, "overdue", 3)

    rhythm = NS(sales_rhythm="every_2_weeks", custom_rhythm_days=None)
    p = run([sale(d(13), pid=None, name="Indomie")], products={}, profile=rhythm)[0]
    assert (p.interval_source, p.interval_days, p.confidence, p.status, p.days_until) == ("business_rhythm", 14, 0.3, "due_soon", 1)
    assert p.key == "c1:name:indomie"

    custom = NS(sales_rhythm="custom", custom_rhythm_days=21)
    assert run([sale(d(21), pid=None)], products={}, profile=custom)[0].status == "due_today"


def test_no_interval_source_means_no_prediction():
    assert run([sale(d(10), pid=None)], products={}, profile=NS(sales_rhythm="irregular", custom_rhythm_days=None)) == []


def test_status_boundaries():
    products = {"p1": NS(name="Shea Butter", repurchase_days=10, is_replenishable=True)}
    status = lambda ago: (run([sale(d(ago))], products=products) or [NS(status=None)])[0].status  # noqa: E731
    assert status(11) == "overdue"
    assert status(10) == "due_today"
    assert status(9) == "due_soon" and status(7) == "due_soon"
    assert status(6) == "upcoming"
    products["p1"].repurchase_days = 30
    assert status(16) == "upcoming"   # delta 14
    assert status(15) is None         # delta 15 -> not returned


def test_non_replenishable_and_archived_customers_skipped():
    products = {"p1": NS(name="Cake", repurchase_days=30, is_replenishable=False)}
    assert run([sale(d(40)), sale(d(80))], products=products) == []
    assert run([sale(d(40), cust="gone"), sale(d(80), cust="gone")]) == []
    assert run([NS(customer_id=None, product_id="p1", product_name="x", amount=1, sold_at=datetime(2026, 9, 1))]) == []


def test_lapsed_after_max_3x_interval_or_90_days():
    products = {"p1": NS(name="Shea Butter", repurchase_days=10, is_replenishable=True)}
    assert run([sale(d(100))], products=products)[0].days_overdue == 90  # exactly 90 -> still shown
    assert run([sale(d(101))], products=products) == []                  # 91 > max(3 × 10, 90) -> lapsed


def test_actions_hide_until_next_purchase():
    sales = [sale(d(65)), sale(d(35))]
    after = datetime(2026, 9, 30, 12)
    key = "c1:p1"
    assert run(sales, actions=[NS(follow_up_key=key, action="done", created_at=after, snooze_until=None)]) == []
    assert run(sales, actions=[NS(follow_up_key=key, action="dismissed", created_at=after, snooze_until=None)]) == []
    snoozed = NS(follow_up_key=key, action="snoozed", created_at=after, snooze_until=datetime(2026, 10, 3))
    assert run(sales, actions=[snoozed]) == []
    expired = NS(follow_up_key=key, action="snoozed", created_at=after, snooze_until=datetime(2026, 10, 1))
    assert len(run(sales, actions=[expired])) == 1
    # An action from before the latest purchase no longer applies
    old = NS(follow_up_key=key, action="done", created_at=datetime(2026, 7, 1), snooze_until=None)
    assert len(run(sales, actions=[old])) == 1


def test_customer_status_rules():
    created_long_ago = datetime(2026, 1, 1)
    dt = lambda ago: datetime.combine(d(ago), datetime.min.time()) + timedelta(hours=10)  # noqa: E731
    assert customer_status(datetime(2026, 9, 25), [], False, TODAY, TZ) == "new"
    assert customer_status(created_long_ago, [], False, TODAY, TZ) == "lapsed"
    assert customer_status(created_long_ago, [dt(5)], False, TODAY, TZ) == "active"
    assert customer_status(created_long_ago, [dt(5)], True, TODAY, TZ) == "at_risk"
    assert customer_status(created_long_ago, [dt(45)], False, TODAY, TZ) == "active"   # within max(1.5 × 30, 30)
    assert customer_status(created_long_ago, [dt(60)], False, TODAY, TZ) == "at_risk"
    assert customer_status(created_long_ago, [dt(120)], False, TODAY, TZ) == "lapsed"


# --- API ---------------------------------------------------------------

def _seed(client, h, freeze):
    freeze("2026-10-01T10:00:00")
    p = client.post("/products", headers=h, json={"name": "Shea Butter", "price": 4500, "repurchase_days": 30, "is_replenishable": True}).json()
    c = client.post("/customers", headers=h, json={"name": "Amina Bello", "phone": "0803 123 4567"}).json()
    for days in (65, 35):
        sold_at = (datetime(2026, 10, 1, 10) - timedelta(days=days)).isoformat() + "Z"
        r = client.post("/sales", headers=h, json={"customer_id": c["id"], "product_id": p["id"], "quantity": 1, "sold_at": sold_at})
        assert r.status_code == 201, r.text
    return p, c


def test_follow_ups_endpoint_and_actions(client, owner, freeze):
    p, c = _seed(client, owner, freeze)
    body = client.get("/follow-ups", headers=owner).json()
    assert body["counts"] == {"overdue": 1, "due_today": 0, "due_soon": 0, "upcoming": 0}
    item = body["items"][0]
    assert item["key"] == f"{c['id']}:{p['id']}"
    assert item["status"] == "overdue" and item["days_overdue"] == 5 and item["interval_source"] == "history"
    assert item["customer"]["phone"] == "+2348031234567"
    assert item["whatsapp_url"].startswith("https://wa.me/2348031234567?text=")
    assert item["tel_url"] == "tel:+2348031234567"
    assert "Shea Butter" in item["suggested_message"]

    assert client.post(f"/follow-ups/{item['key']}/snooze", headers=owner, json={"days": 0}).status_code == 422
    assert client.post("/follow-ups/nope:nope/done", headers=owner, json={}).status_code == 404
    r = client.post(f"/follow-ups/{item['key']}/done", headers=owner, json={"channel": "whatsapp"})
    assert r.status_code == 200 and r.json()["action"] == "done"
    assert client.get("/follow-ups", headers=owner).json()["items"] == []
    activity = client.get(f"/customers/{c['id']}", headers=owner).json()["recent_activity"]
    assert any(a["type"] == "follow_up_done" for a in activity)

    # A new purchase resets the "done" state
    freeze("2026-10-01T12:00:00")
    client.post("/sales", headers=owner, json={"customer_id": c["id"], "product_id": p["id"], "quantity": 1})
    freeze("2026-11-15T12:00:00")
    assert client.get("/follow-ups?status=overdue", headers=owner).json()["total"] == 1


def test_free_text_product_key_with_slash(client, owner, freeze):
    freeze("2026-10-01T10:00:00")
    c = client.post("/customers", headers=owner, json={"name": "Tunde"}).json()
    client.put("/business/profile", headers=owner, json={"sales_rhythm": "weekly"})
    client.post("/sales", headers=owner, json={"customer_id": c["id"], "product_name": "Rice 1/2 bag", "quantity": 1,
                                               "unit_price": 100, "sold_at": "2026-09-20T10:00:00Z"})
    item = client.get("/follow-ups", headers=owner).json()["items"][0]
    assert item["key"] == f"{c['id']}:name:rice 1/2 bag" and item["product"]["id"] is None
    from urllib.parse import quote
    r = client.post(f"/follow-ups/{quote(item['key'], safe='')}/dismiss", headers=owner)
    assert r.status_code == 200
    assert client.get("/follow-ups", headers=owner).json()["items"] == []
