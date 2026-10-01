import uuid


def _product(client, h, **kw):
    body = {"name": "Shea Butter", "price": 4500, **kw}
    return client.post("/products", headers=h, json=body).json()


def test_idempotency_same_key_returns_original_and_creates_once(client, owner):
    key = str(uuid.uuid4())
    body = {"product_name": "Indomie", "quantity": 3, "unit_price": 250}
    first = client.post("/sales", headers={**owner, "Idempotency-Key": key}, json=body)
    second = client.post("/sales", headers={**owner, "Idempotency-Key": key}, json=body)
    assert first.status_code == second.status_code == 201
    assert first.json() == second.json()
    assert client.get("/sales", headers=owner).json()["total"] == 1
    assert client.get("/analytics/summary", headers=owner).json()["total_revenue"] == 750


def test_idempotency_key_with_different_body_conflicts(client, owner):
    key = str(uuid.uuid4())
    client.post("/sales", headers={**owner, "Idempotency-Key": key}, json={"product_name": "A", "quantity": 1, "unit_price": 10})
    r = client.post("/sales", headers={**owner, "Idempotency-Key": key}, json={"product_name": "A", "quantity": 2, "unit_price": 10})
    assert r.status_code == 409 and r.json()["code"] == "CONFLICT"


def test_no_key_means_no_deduplication(client, owner):
    body = {"product_name": "A", "quantity": 1, "unit_price": 10}
    client.post("/sales", headers=owner, json=body)
    client.post("/sales", headers=owner, json=body)
    assert client.get("/sales", headers=owner).json()["total"] == 2


def test_idempotency_keys_are_per_user(client, owner):
    from tests.conftest import register

    other = register(client, "other@test.com")
    key = str(uuid.uuid4())
    body = {"product_name": "A", "quantity": 1, "unit_price": 10}
    a = client.post("/sales", headers={**owner, "Idempotency-Key": key}, json=body).json()
    b = client.post("/sales", headers={**other, "Idempotency-Key": key}, json=body).json()
    assert a["id"] != b["id"]


def test_rules_r1_to_r5(client, owner):
    p = _product(client, owner)
    # R1: product_id -> name snapshot + catalogue price
    r1 = client.post("/sales", headers=owner, json={"product_id": p["id"], "quantity": 2}).json()
    assert r1["product_name"] == "Shea Butter" and r1["unit_price"] == 4500 and r1["amount"] == 9000
    # R2: case-insensitive name match links the product
    r2 = client.post("/sales", headers=owner, json={"product_name": "shea butter", "quantity": 1}).json()
    assert r2["product_id"] == p["id"]
    # R2: unknown name stays free text, no product auto-created
    free = client.post("/sales", headers=owner, json={"product_name": "Indomie", "quantity": 1, "unit_price": 250}).json()
    assert free["product_id"] is None
    assert client.get("/products", headers=owner).json()["total"] == 1
    # R3: unknown customer name creates the customer
    r3 = client.post("/sales", headers=owner, json={"product_name": "Soap", "quantity": 1, "unit_price": 100, "customer_name": "Amina"}).json()
    assert r3["customer_id"] and r3["customer_name"] == "Amina"
    again = client.post("/sales", headers=owner, json={"product_name": "Soap", "quantity": 1, "unit_price": 100, "customer_name": "AMINA"}).json()
    assert again["customer_id"] == r3["customer_id"]
    # R3: ambiguous name -> 422
    client.post("/customers", headers=owner, json={"name": "Tunde"})
    client.post("/customers", headers=owner, json={"name": "tunde"})
    amb = client.post("/sales", headers=owner, json={"product_name": "Soap", "quantity": 1, "unit_price": 100, "customer_name": "Tunde"})
    assert amb.status_code == 422 and "pick one" in amb.json()["detail"][0]["msg"]
    # R4: walk-in
    assert free["customer_id"] is None
    # R5: amount override (discount); otherwise qty × unit rounded to 2 dp
    disc = client.post("/sales", headers=owner, json={"product_id": p["id"], "quantity": 2, "amount": 8000}).json()
    assert disc["amount"] == 8000
    third = client.post("/sales", headers=owner, json={"product_name": "X", "quantity": 3, "unit_price": 333.33}).json()
    assert third["amount"] == 999.99


def test_sale_validation(client, owner):
    bad = [
        ({"product_name": "A", "quantity": 0, "unit_price": 1}, "quantity"),
        ({"product_name": "A", "quantity": 1.5, "unit_price": 1}, "quantity"),
        ({"product_name": "A", "quantity": "2", "unit_price": 1}, "quantity"),
        ({"product_name": "A", "quantity": 1, "unit_price": -1}, "unit_price"),
        ({"product_name": "A", "quantity": 1}, "unit_price"),
        ({"quantity": 1, "unit_price": 1}, "product_name"),
        ({"product_name": "A", "quantity": 1, "unit_price": 1, "sold_at": "2099-01-01T00:00:00Z"}, "sold_at"),
        ({"product_name": "A", "quantity": 1, "unit_price": 1, "sold_at": "2001-01-01T00:00:00Z"}, "sold_at"),
        ({"product_name": "A", "quantity": 1, "unit_price": 1, "sold_at": "yesterday"}, "sold_at"),
    ]
    for body, field in bad:
        r = client.post("/sales", headers=owner, json=body)
        assert r.status_code == 422, body
        assert r.json()["code"] == "VALIDATION_ERROR"
        assert r.json()["detail"][0]["loc"][-1] == field, (body, r.json())


def test_patch_recomputes_amount_and_delete_is_soft(client, owner):
    s = client.post("/sales", headers=owner, json={"product_name": "A", "quantity": 2, "unit_price": 100}).json()
    up = client.patch(f"/sales/{s['id']}", headers=owner, json={"quantity": 5}).json()
    assert up["amount"] == 500
    up = client.patch(f"/sales/{s['id']}", headers=owner, json={"amount": 450}).json()
    assert up["amount"] == 450
    assert client.delete(f"/sales/{s['id']}", headers=owner).status_code == 204
    assert client.get(f"/sales/{s['id']}", headers=owner).status_code == 404
    summary = client.get("/analytics/summary", headers=owner).json()
    assert summary["total_revenue"] == 0 and summary["total_transactions"] == 0


def test_list_filters_search_sort_and_pagination(client, owner):
    c = client.post("/customers", headers=owner, json={"name": "Amina Bello"}).json()
    client.post("/sales", headers=owner, json={"product_name": "100% Cotton_Shirt", "quantity": 1, "unit_price": 10})
    client.post("/sales", headers=owner, json={"product_name": "Soap", "quantity": 1, "unit_price": 30, "customer_id": c["id"]})
    client.post("/sales", headers=owner, json={"product_name": "Rice", "quantity": 1, "unit_price": 20})

    assert client.get("/sales?q=amina", headers=owner).json()["total"] == 1
    assert client.get("/sales?q=100%25", headers=owner).json()["total"] == 1  # % treated literally
    assert client.get("/sales?q=_", headers=owner).json()["total"] == 1       # _ treated literally
    amounts = [s["amount"] for s in client.get("/sales?sort=-amount", headers=owner).json()["items"]]
    assert amounts == [30, 20, 10]
    page = client.get("/sales?limit=1&offset=5", headers=owner).json()
    assert page["items"] == [] and page["total"] == 3
    assert client.get("/sales?limit=1000", headers=owner).json()["limit"] == 200  # clamped, not 422
    assert client.get("/sales?sort=bogus", headers=owner).status_code == 422
    assert client.get(f"/customers/{c['id']}/sales", headers=owner).json()["total"] == 1


def test_deleted_customer_name_on_sales(client, owner):
    c = client.post("/customers", headers=owner, json={"name": "Amina"}).json()
    s = client.post("/sales", headers=owner, json={"product_name": "Soap", "quantity": 1, "unit_price": 100, "customer_id": c["id"]}).json()
    client.delete(f"/customers/{c['id']}", headers=owner)
    again = client.get(f"/sales/{s['id']}", headers=owner).json()
    assert again["customer_id"] == c["id"] and again["customer_name"] == "Deleted customer"
    assert client.get("/analytics/summary", headers=owner).json()["total_revenue"] == 100
