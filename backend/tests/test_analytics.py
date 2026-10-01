"""§19.1 growth percentages and Africa/Lagos bucketing (§2.7, §22.11)."""
from core.clock import growth_pct


def test_growth_pct_rules():
    assert growth_pct(100, 0) is None          # never 100 for a brand-new business
    assert growth_pct(0, 0) is None
    assert growth_pct(210000, 187500) == 12.0
    assert growth_pct(84500, 70000) == 20.7    # rounded to 1 dp
    assert growth_pct(50, 100) == -50.0
    assert growth_pct(0, 100) == -100.0


def _sale(client, h, amount, sold_at):
    r = client.post("/sales", headers=h, json={"product_name": "Item", "quantity": 1, "unit_price": amount, "sold_at": sold_at})
    assert r.status_code == 201, r.text


def test_dashboard_growth_null_when_previous_period_empty(client, owner, freeze):
    freeze("2026-10-15T12:00:00")
    _sale(client, owner, 5000, "2026-10-10T12:00:00Z")
    g = client.get("/analytics/dashboard", headers=owner).json()["growth"]
    assert g["month_over_month_pct"] is None


def test_dashboard_month_over_month(client, owner, freeze):
    freeze("2026-10-15T12:00:00")
    _sale(client, owner, 187500, "2026-09-10T12:00:00Z")
    _sale(client, owner, 210000, "2026-10-10T12:00:00Z")
    dash = client.get("/analytics/dashboard", headers=owner).json()
    assert dash["revenue"]["this_month"] == 210000 and dash["revenue"]["last_month"] == 187500
    assert dash["growth"]["month_over_month_pct"] == 12.0
    assert dash["timezone"] == "Africa/Lagos" and dash["currency"] == "NGN"


def test_lagos_month_boundary(client, owner, freeze):
    # 00:30 on 1 Oct in Lagos == 23:30 UTC on 30 Sep -> belongs to OCTOBER
    freeze("2026-10-01T12:00:00")
    _sale(client, owner, 1000, "2026-09-30T23:30:00Z")
    _sale(client, owner, 50, "2026-09-30T22:30:00Z")  # 23:30 Lagos on 30 Sep -> September
    dash = client.get("/analytics/dashboard", headers=owner).json()
    assert dash["revenue"]["this_month"] == 1000
    assert dash["revenue"]["last_month"] == 50
    assert dash["revenue"]["today"] == 1000
    assert dash["transactions"]["today"] == 1


def test_lagos_day_boundary_in_timeseries(client, owner, freeze):
    freeze("2026-10-01T12:00:00")  # Thursday
    _sale(client, owner, 100, "2026-09-30T23:30:00Z")  # Thu 00:30 Lagos
    _sale(client, owner, 40, "2026-09-30T22:59:00Z")   # Wed 23:59 Lagos
    ts = client.get("/analytics/timeseries?range=7d", headers=owner).json()
    assert len(ts["points"]) == 7  # zero-filled
    assert ts["points"][-1] == {"start": "2026-10-01", "label": "Thu", "revenue": 100, "transactions": 1, "units": 1}
    assert ts["points"][-2]["start"] == "2026-09-30" and ts["points"][-2]["revenue"] == 40
    assert ts["points"][0]["start"] == "2026-09-25"
    assert ts["best_interval"]["label"] == "Thu"


def test_week_starts_monday(client, owner, freeze):
    freeze("2026-10-01T12:00:00")  # Thursday; week began Mon 28 Sep
    _sale(client, owner, 300, "2026-09-27T22:30:00Z")  # Sun 27 Sep 23:30 Lagos -> last week
    _sale(client, owner, 700, "2026-09-27T23:30:00Z")  # Mon 28 Sep 00:30 Lagos -> this week
    dash = client.get("/analytics/dashboard", headers=owner).json()
    assert dash["revenue"]["this_week"] == 700
    assert dash["revenue"]["last_week"] == 300
    assert dash["growth"]["week_over_week_pct"] == 133.3
    weeks = client.get("/analytics/timeseries?range=90d", headers=owner).json()
    assert weeks["interval"] == "week"
    assert all(p["start"] for p in weeks["points"])
    from datetime import date
    assert all(date.fromisoformat(p["start"]).weekday() == 0 for p in weeks["points"])


def test_summary_from_to_uses_lagos_dates(client, owner, freeze):
    freeze("2026-10-01T12:00:00")
    _sale(client, owner, 1000, "2026-09-30T23:30:00Z")  # 1 Oct in Lagos
    sep = client.get("/analytics/summary?from=2026-09-01&to=2026-09-30", headers=owner).json()
    octo = client.get("/analytics/summary?from=2026-10-01&to=2026-10-01", headers=owner).json()
    assert sep["total_revenue"] == 0 and octo["total_revenue"] == 1000
    assert octo["from"] == "2026-10-01" and octo["currency"] == "NGN"


def test_summary_groups_names_case_insensitively(client, owner):
    for name in ("Indomie", "indomie ", "INDOMIE"):
        client.post("/sales", headers=owner, json={"product_name": name, "quantity": 1, "unit_price": 100})
    top = client.get("/analytics/summary", headers=owner).json()["top_products"]
    assert len(top) == 1 and top[0]["total_quantity"] == 3 and top[0]["share_of_revenue"] == 1.0


def test_products_breakdown_and_insights_render_with_little_data(client, owner):
    client.post("/sales", headers=owner, json={"product_name": "Soap", "quantity": 2, "unit_price": 100})
    pb = client.get("/analytics/products?range=30d", headers=owner).json()
    assert pb["items"][0]["product_name"] == "Soap" and pb["items"][0]["change_pct"] is None
    ins = client.get("/insights?range=30d", headers=owner).json()
    assert "Log at least 10 sales to unlock insights." in ins["data_quality"]["issues"]
    assert ins["ai_narrative"] is None
    # One product is always "100% of revenue" — not worth an insight
    assert "top_product_concentration" not in {i["id"] for i in ins["insights"]}


def test_concentration_insight_needs_two_products(client, owner):
    client.post("/sales", headers=owner, json={"product_name": "Soap", "quantity": 1, "unit_price": 9000})
    client.post("/sales", headers=owner, json={"product_name": "Rice", "quantity": 1, "unit_price": 1000})
    ins = {i["id"]: i for i in client.get("/insights?range=30d", headers=owner).json()["insights"]}
    conc = ins["top_product_concentration"]
    assert conc["title"] == "Soap makes 90% of your revenue"
    assert conc["cta_route"] == "/settings"
