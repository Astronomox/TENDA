import { describe, expect, it } from "vitest";
import { decodeToken, safeNext } from "@/lib/auth";

describe("safeNext", () => {
  it("keeps same-site paths", () => {
    expect(safeNext("/sales/add-sales?mode=voice")).toBe("/sales/add-sales?mode=voice");
  });

  it("refuses anything that could leave the site", () => {
    for (const bad of [null, undefined, "", "https://evil.com", "//evil.com", "/\\evil.com", "/\\/evil.com", "/\tevil", "evil"]) {
      expect(safeNext(bad)).toBe("/dashboard");
    }
  });
});

describe("decodeToken", () => {
  const encode = (payload: object) => `x.${Buffer.from(JSON.stringify(payload)).toString("base64url")}.y`;

  it("reads the email and expiry", () => {
    expect(decodeToken(encode({ sub: "amina@example.com", exp: 2000000000 }))).toEqual({
      email: "amina@example.com",
      exp: 2000000000,
    });
  });

  it("rejects malformed tokens", () => {
    expect(decodeToken(null)).toBeNull();
    expect(decodeToken("not-a-jwt")).toBeNull();
    expect(decodeToken(encode({ sub: "a@b.c" }))).toBeNull(); // no exp
  });
});
