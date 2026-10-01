import jwt

from tests.conftest import register


def login(client, username, password="Passw0rd!"):
    return client.post("/auth/login", data={"username": username, "password": password})


def test_register_returns_token_user_and_profile(client):
    r = client.post("/auth/register", json={
        "email": "  Owner@Test.com ", "password": "Passw0rd!", "full_name": "Ada Owner", "business_name": "Ada Store",
    })
    assert r.status_code == 201
    body = r.json()
    assert body["user"]["email"] == "owner@test.com"
    assert body["user"]["full_name"] == "Ada Owner"
    assert body["token_type"] == "bearer" and body["expires_in"] == 3600
    assert body["refresh_token"].startswith("rt_")
    assert body["message"] == "User created successfully"  # backward compatible
    payload = jwt.decode(body["access_token"], options={"verify_signature": False})
    assert payload["sub"] == "owner@test.com" and {"exp", "iat", "jti"} <= payload.keys()

    h = {"Authorization": f"Bearer {body['access_token']}"}
    assert client.get("/business/profile", headers=h).json()["business_name"] == "Ada Store"
    me = client.get("/auth/me", headers=h).json()
    assert me["timezone"] == "Africa/Lagos" and me["created_at"].endswith("Z")


def test_register_duplicate_email_case_insensitive(client):
    register(client, "amina@example.com")
    r = client.post("/auth/register", json={"email": "AMINA@example.com", "password": "Passw0rd!"})
    assert r.status_code == 400
    assert r.json() == {"detail": "An account with this email already exists", "code": "EMAIL_TAKEN"}


def test_register_password_rules(client):
    short = client.post("/auth/register", json={"email": "a@b.com", "password": "1234567"})
    assert short.status_code == 422
    assert short.json()["code"] == "VALIDATION_ERROR"
    assert short.json()["detail"][0]["msg"] == "Password must be at least 8 characters"
    # 25 three-byte characters = 75 bytes > 72, even though it's only 25 characters
    too_long = client.post("/auth/register", json={"email": "a@b.com", "password": "€" * 25})
    assert too_long.status_code == 422
    spaces = client.post("/auth/register", json={"email": "a@b.com", "password": " " * 10})
    assert spaces.status_code == 422
    bad_email = client.post("/auth/register", json={"email": "not-an-email", "password": "Passw0rd!"})
    assert bad_email.json()["detail"][0]["msg"] == "Enter a valid email address"
    blank_name = client.post("/auth/register", json={"email": "a@b.com", "password": "Passw0rd!", "full_name": "   "})
    assert blank_name.status_code == 422


def test_login_case_insensitive_and_same_error_for_unknown(client):
    register(client, "owner@test.com")
    ok = login(client, "  OWNER@test.com ")
    assert ok.status_code == 200
    assert ok.json()["user"]["email"] == "owner@test.com"
    assert ok.json()["refresh_token"]

    wrong = login(client, "owner@test.com", "wrong-password")
    unknown = login(client, "nobody@test.com", "wrong-password")
    assert wrong.status_code == unknown.status_code == 401
    assert wrong.json() == unknown.json() == {"detail": "Incorrect email or password", "code": "INVALID_CREDENTIALS"}


def test_login_requires_form_body(client):
    register(client)
    r = client.post("/auth/login", json={"username": "owner@test.com", "password": "Passw0rd!"})
    assert r.status_code == 422 and r.json()["code"] == "VALIDATION_ERROR"


def test_login_rate_limited_after_10_failures(client):
    register(client)
    for _ in range(10):
        assert login(client, "owner@test.com", "bad-password").status_code == 401
    r = login(client, "owner@test.com", "bad-password")
    assert r.status_code == 429
    assert r.json()["code"] == "RATE_LIMITED" and "retry-after" in r.headers


def test_auth_dependency_rejections(client):
    assert client.get("/auth/me").json()["code"] == "UNAUTHENTICATED"
    assert client.get("/auth/me", headers={"Authorization": "Bearer not.a.jwt"}).status_code == 401
    forged = jwt.encode({"sub": "x@y.com", "uid": "1", "jti": "j", "exp": 9999999999}, "a-different-secret-of-32-bytes-or-more", algorithm="HS256")
    assert client.get("/auth/me", headers={"Authorization": f"Bearer {forged}"}).status_code == 401


def test_patch_me(client, owner):
    r = client.patch("/auth/me", headers=owner, json={"full_name": "Amina B."})
    assert r.status_code == 200 and r.json()["full_name"] == "Amina B."


def test_logout_revokes_token_and_is_idempotent(client, owner):
    assert client.get("/auth/me", headers=owner).status_code == 200
    assert client.post("/auth/logout", headers=owner).status_code == 200
    r = client.get("/auth/me", headers=owner)
    assert r.status_code == 401 and r.json()["code"] == "UNAUTHENTICATED"
    # Logging out again with the dead token still succeeds
    assert client.post("/auth/logout", headers=owner).status_code == 200
    assert client.post("/auth/logout").status_code == 200


def test_refresh_rotation_and_reuse_detection(client):
    register(client)
    first = login(client, "owner@test.com").json()
    second = client.post("/auth/refresh", json={"refresh_token": first["refresh_token"]})
    assert second.status_code == 200
    rotated = second.json()["refresh_token"]
    assert rotated != first["refresh_token"]

    # Reusing the old token is a theft signal: 401 and the whole family dies
    reuse = client.post("/auth/refresh", json={"refresh_token": first["refresh_token"]})
    assert reuse.status_code == 401
    assert client.post("/auth/refresh", json={"refresh_token": rotated}).status_code == 401
    assert client.post("/auth/refresh", json={"refresh_token": "rt_unknown"}).status_code == 401


def test_change_password(client, owner):
    bad = client.post("/auth/change-password", headers=owner, json={"current_password": "nope-nope", "new_password": "NewPassw0rd"})
    assert bad.status_code == 401 and bad.json()["code"] == "INVALID_CREDENTIALS"
    ok = client.post("/auth/change-password", headers=owner, json={"current_password": "Passw0rd!", "new_password": "NewPassw0rd"})
    assert ok.status_code == 204
    assert login(client, "owner@test.com", "NewPassw0rd").status_code == 200


def test_forgot_and_reset_password(client, monkeypatch):
    from core.security import hash_token
    from services import auth_service

    register(client)
    captured = {}
    original = auth_service.new_opaque_token
    monkeypatch.setattr(auth_service, "new_opaque_token", lambda prefix: captured.setdefault(prefix, original(prefix)))

    assert client.post("/auth/forgot-password", json={"email": "nobody@test.com"}).status_code == 202
    assert client.post("/auth/forgot-password", json={"email": "owner@test.com"}).status_code == 202
    token = captured["pr_"]
    assert hash_token(token) != token
    assert client.post("/auth/reset-password", json={"token": token, "new_password": "Brand-new-1"}).status_code == 204
    assert login(client, "owner@test.com", "Brand-new-1").status_code == 200
    # Single use
    again = client.post("/auth/reset-password", json={"token": token, "new_password": "Brand-new-2"})
    assert again.status_code == 400 and again.json()["code"] == "BAD_REQUEST"


def test_delete_account_removes_everything(client, owner):
    c = client.post("/customers", headers=owner, json={"name": "Amina"}).json()
    client.post("/sales", headers=owner, json={"customer_id": c["id"], "product_name": "Soap", "quantity": 1, "unit_price": 100})
    assert client.delete("/auth/me", headers=owner).status_code == 204
    assert client.get("/auth/me", headers=owner).status_code == 401
    # Same email can sign up again and sees nothing from the old account
    h = register(client, "owner@test.com")
    assert client.get("/customers", headers=h).json()["items"] == []
    assert client.get("/customers/" + c["id"], headers=owner).status_code == 401
