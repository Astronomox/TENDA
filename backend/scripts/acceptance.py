"""§24 acceptance script, ported from bash/curl/jq to Python (works on Windows).

Usage:  python scripts/acceptance.py [BASE_URL]      (default http://127.0.0.1:8010)
Run it against a FRESH database. AI-dependent steps are reported SKIP (not PASS)
when the server has no GEMINI_API_KEY.
"""
import io
import struct
import sys
import uuid
import wave
from datetime import datetime, timedelta, timezone

import httpx

B = sys.argv[1] if len(sys.argv) > 1 else "http://127.0.0.1:8010"
results: list[tuple[str, str, str]] = []


def check(step: str, ok: bool, info: str = "") -> None:
    results.append((step, "PASS" if ok else "FAIL", info))


def skip(step: str, why: str) -> None:
    results.append((step, "SKIP", why))


def iso_days_ago(days: int) -> str:
    return (datetime.now(timezone.utc) - timedelta(days=days)).strftime("%Y-%m-%dT%H:%M:%SZ")


def silent_wav(seconds=1.0, rate=16000) -> bytes:
    buf = io.BytesIO()
    with wave.open(buf, "wb") as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(rate)
        w.writeframes(struct.pack("<h", 0) * int(seconds * rate))
    return buf.getvalue()


def main() -> int:
    c = httpx.Client(base_url=B, timeout=60)
    ai = c.get("/health").json().get("ai")

    # 0. CORS
    r = c.options("/customers", headers={
        "Origin": "http://localhost:3000", "Access-Control-Request-Method": "POST",
        "Access-Control-Request-Headers": "authorization,content-type,idempotency-key"})
    check("0 CORS preflight", r.headers.get("access-control-allow-origin") == "http://localhost:3000", f"status {r.status_code}")

    # 1. Register (returns token) and case-insensitive login
    r = c.post("/auth/register", json={"email": "Owner@Test.com", "password": "Passw0rd!",
                                       "full_name": "Ada Owner", "business_name": "Ada Store"})
    check("1a register returns token", r.status_code == 201 and bool(r.json().get("access_token")), f"status {r.status_code}")
    r = c.post("/auth/login", data={"username": "OWNER@test.com", "password": "Passw0rd!"})
    token = r.json().get("access_token")
    check("1b case-insensitive login", r.status_code == 200 and bool(token), f"status {r.status_code}")
    H = {"Authorization": f"Bearer {token}"}

    # 2. Me + profile
    me = c.get("/auth/me", headers=H).json()
    check("2a /auth/me full_name", me.get("full_name") == "Ada Owner", str(me.get("full_name")))
    prof = c.get("/business/profile", headers=H).json()
    check("2b profile business_name", prof.get("business_name") == "Ada Store", str(prof.get("business_name")))

    # 3. Product + customer
    P = c.post("/products", headers=H, json={"name": "Shea Butter", "price": 4500, "repurchase_days": 30, "is_replenishable": True}).json()["id"]
    cust = c.post("/customers", headers=H, json={"name": "Amina Bello", "phone": "0803 123 4567"})
    C = cust.json()["id"]
    check("3a phone normalised to E.164", cust.json().get("phone") == "+2348031234567", cust.json().get("phone"))
    dup = c.post("/customers", headers=H, json={"name": "Someone", "phone": "0803 123 4567"})
    check("3b duplicate phone -> 409", dup.status_code == 409 and dup.json().get("code") == "CONFLICT", f"status {dup.status_code}")

    # 4. Two back-dated sales 30 days apart -> follow-up overdue
    K = str(uuid.uuid4())
    body = {"customer_id": C, "product_id": P, "quantity": 2, "sold_at": iso_days_ago(65)}
    s1 = c.post("/sales", headers={**H, "Idempotency-Key": K}, json=body)
    s1b = c.post("/sales", headers={**H, "Idempotency-Key": K}, json=body)
    check("4a idempotent replay", s1.status_code == 201 and s1.json() == s1b.json(), f"{s1.status_code}/{s1b.status_code}")
    c.post("/sales", headers=H, json={"customer_id": C, "product_id": P, "quantity": 1, "sold_at": iso_days_ago(35)})

    fu = c.get("/follow-ups", headers=H).json()
    item = (fu.get("items") or [{}])[0]
    check("4b follow-up overdue ~5 days via history",
          item.get("customer", {}).get("name") == "Amina Bello" and item.get("product", {}).get("name") == "Shea Butter"
          and item.get("status") == "overdue" and item.get("days_overdue") in (4, 5, 6) and item.get("interval_source") == "history",
          f"status={item.get('status')} days_overdue={item.get('days_overdue')} source={item.get('interval_source')}")
    dash = c.get("/analytics/dashboard", headers=H).json()
    check("4c dashboard all_time 13500 / 2 tx",
          dash["revenue"]["all_time"] == 13500 and dash["transactions"]["all_time"] == 2,
          f"{dash['revenue']['all_time']} / {dash['transactions']['all_time']}")
    summ = c.get("/analytics/summary", headers=H).json()
    check("4d summary 13500 / 2", summ["total_revenue"] == 13500 and summ["total_transactions"] == 2,
          f"{summ['total_revenue']} / {summ['total_transactions']}")

    # 5. Isolation: second user sees nothing
    rb = c.post("/auth/register", json={"email": "b@test.com", "password": "Passw0rd!"}).json()
    HB = {"Authorization": f"Bearer {rb['access_token']}"}
    check("5a user B customers empty", c.get("/customers", headers=HB).json()["items"] == [])
    check("5b user B GET A's customer -> 404", c.get(f"/customers/{C}", headers=HB).status_code == 404)

    # 6. AI uses data
    if ai == "not_configured":
        skip("6 AI chat mentions Amina / Shea Butter", "GEMINI_API_KEY not set on the server")
    else:
        r = c.post("/ai/chat", headers=H, json={"question": "Who should I follow up with?"}, timeout=120)
        ans = r.json().get("answer", "") if r.status_code == 200 else ""
        if r.status_code == 503:
            skip("6 AI chat mentions Amina / Shea Butter", "AI_UNAVAILABLE (provider busy)")
        else:
            check("6 AI chat mentions Amina / Shea Butter",
                  "Amina" in ans and "Shea" in ans and "Reports section" not in ans, ans[:120].replace("\n", " "))

    # 7. Voice
    skip("7a voice log-sale dry_run with sale.m4a",
         "needs a real recorded sale.m4a" + (" and GEMINI_API_KEY" if ai == "not_configured" else ""))
    r = c.post("/voice/ask", headers=H, files={"audio": ("silence.wav", silent_wav(), "audio/wav")})
    check("7b silent wav -> 422 NO_SPEECH (local check, no AI)",
          r.status_code == 422 and r.json().get("code") == "NO_SPEECH", f"status {r.status_code}")

    # 8. Logout revokes
    c.post("/auth/logout", headers=H)
    code = c.get("/auth/me", headers=H).status_code
    check("8 logout revokes token", code == 401, f"status {code}")

    width = max(len(s) for s, _, _ in results)
    for step, verdict, info in results:
        print(f"{verdict:4}  {step.ljust(width)}  {info}")
    counts = {v: sum(1 for _, x, _ in results if x == v) for v in ("PASS", "FAIL", "SKIP")}
    print(f"\n{counts['PASS']} passed, {counts['FAIL']} failed, {counts['SKIP']} skipped  (server ai status: {ai})")
    return 1 if counts["FAIL"] else 0


if __name__ == "__main__":
    sys.exit(main())
