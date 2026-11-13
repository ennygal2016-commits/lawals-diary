import { describe, expect, it } from "vitest";

import { loginPathFor, safeNextPath } from "@/lib/auth/redirect";
import { magicLinkSchema, passwordSignInSchema } from "@/lib/validation/auth";
import { isValidTimeZone, profileSchema } from "@/lib/validation/profile";

describe("safeNextPath (no open redirects)", () => {
  it.each([
    ["/admin", "/admin"],
    ["/admin/timeline?view=public", "/admin/timeline?view=public"],
    ["/admin/entries/abc#comments", "/admin/entries/abc#comments"],
  ])("keeps %s", (input, expected) => {
    expect(safeNextPath(input)).toBe(expected);
  });

  it.each([
    null,
    undefined,
    "",
    "https://evil.example/admin",
    "//evil.example/admin",
    "/\\evil.example",
    "\\\\evil.example",
    "javascript:alert(1)",
    "/login",
    "/",
    "/administrator",
    "/admin/../login",
    "/admin\u0000",
    "admin",
  ])("falls back to /admin for %s", (input) => {
    expect(safeNextPath(input)).toBe("/admin");
  });

  it("builds /login?next= only when it adds something", () => {
    expect(loginPathFor("/admin")).toBe("/login");
    expect(loginPathFor("/admin/photos", "?filter=public")).toBe(
      "/login?next=%2Fadmin%2Fphotos%3Ffilter%3Dpublic",
    );
  });
});

describe("auth form validation", () => {
  it("normalises email and requires a password for password sign-in", () => {
    const ok = passwordSignInSchema.safeParse({ email: "  Nurat@Example.COM ", password: "x" });
    expect(ok.success && ok.data.email).toBe("nurat@example.com");
    expect(passwordSignInSchema.safeParse({ email: "a@b.co", password: "" }).success).toBe(false);
    expect(passwordSignInSchema.safeParse({ email: "nope", password: "x" }).success).toBe(false);
  });

  it("magic link needs only a valid email", () => {
    expect(magicLinkSchema.safeParse({ email: "a@b.co" }).success).toBe(true);
    expect(magicLinkSchema.safeParse({ email: "a@" }).success).toBe(false);
  });
});

describe("profile validation", () => {
  const valid = { display_name: "Nurat", nickname: "D_Gal", timezone: "America/Toronto" };

  it("accepts a normal profile and trims", () => {
    const parsed = profileSchema.parse({ ...valid, nickname: "  Kuleo " });
    expect(parsed.nickname).toBe("Kuleo");
  });

  it("enforces the database length limits", () => {
    expect(profileSchema.safeParse({ ...valid, display_name: "" }).success).toBe(false);
    expect(profileSchema.safeParse({ ...valid, display_name: "x".repeat(61) }).success).toBe(false);
    expect(profileSchema.safeParse({ ...valid, nickname: "   " }).success).toBe(false);
    expect(profileSchema.safeParse({ ...valid, nickname: "x".repeat(41) }).success).toBe(false);
  });

  it("only accepts real IANA time zones", () => {
    expect(isValidTimeZone("Africa/Lagos")).toBe(true);
    expect(isValidTimeZone("Mars/Olympus_Mons")).toBe(false);
    expect(profileSchema.safeParse({ ...valid, timezone: "EST5EDT; drop table" }).success).toBe(false);
  });
});
