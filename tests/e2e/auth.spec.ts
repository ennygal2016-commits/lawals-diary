import { expect, test } from "@playwright/test";

import { MISSING_ENV, expectOnLogin, signIn, testPartners } from "./helpers";

// Every test here starts signed out.
test.use({ storageState: { cookies: [], origins: [] } });

const partners = testPartners();
const UNKNOWN_EMAIL = "someone.else@example.com";
const BAD_CREDENTIALS = /That email and password didn’t work/;
const LINK_SENT = /If that email belongs to this diary, a sign-in link is on its way/;

test.describe("signed out", () => {
  test("/admin/** redirects to /login?next=… and is noindex", async ({ page }) => {
    const response = await page.goto("/admin/timeline?view=public");
    await expectOnLogin(page);
    expect(new URL(page.url()).searchParams.get("next")).toBe("/admin/timeline?view=public");
    expect(response?.headers()["x-robots-tag"]).toContain("noindex");
  });

  test("/admin itself redirects to a plain /login", async ({ page }) => {
    await page.goto("/admin");
    await expect(page).toHaveURL(/\/login$/);
  });

  test("the login page: one h1, both sign-in options, no sideways scroll, noindex", async ({ page }) => {
    const response = await page.goto("/login");
    expect(response?.status()).toBe(200);
    expect(response?.headers()["x-robots-tag"]).toContain("noindex");
    await expect(page.locator("h1")).toHaveCount(1);
    await expect(page.getByLabel("Email")).toBeVisible();
    await expect(page.getByLabel("Password")).toBeVisible();
    await expect(page.getByRole("button", { name: "Sign in", exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: "Email me a magic link" })).toBeVisible();
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(overflow).toBeLessThanOrEqual(0);
  });

  test("validation errors are shown inline and announced", async ({ page }) => {
    await page.goto("/login");
    await page.getByLabel("Email").fill("not-an-email");
    await page.getByRole("button", { name: "Sign in", exact: true }).click();
    await expect(page.getByRole("alert").filter({ hasText: "Enter a valid email address." })).toBeVisible();
    await expect(page.getByLabel("Email")).toHaveAttribute("aria-invalid", "true");
  });

  test("sign-out refuses cross-site posts", async ({ request }) => {
    const response = await request.post("/auth/signout", {
      headers: { origin: "https://evil.example" },
      maxRedirects: 0,
    });
    expect(response.status()).toBe(403);
  });

  test("an expired or reused magic link lands on a neutral message", async ({ page }) => {
    test.skip(!process.env.NEXT_PUBLIC_SUPABASE_URL, MISSING_ENV);
    await page.goto("/auth/callback?token_hash=not-a-real-token&type=magiclink");
    await expectOnLogin(page);
    await expect(page.getByText(/That sign-in link has expired or was already used/)).toBeVisible();
  });
});

test.describe("an unknown email cannot get in", () => {
  test.skip(!partners, MISSING_ENV);

  test("password sign-in gives the neutral message and no session", async ({ page }) => {
    await page.goto("/login");
    await signIn(page, UNKNOWN_EMAIL, "correct-horse-battery-staple");
    await expect(page.getByRole("alert").filter({ hasText: BAD_CREDENTIALS })).toBeVisible();
    await expectOnLogin(page);

    await page.goto("/admin");
    await expectOnLogin(page);
  });

  test("the message for a wrong password is identical (no account probing)", async ({ page }) => {
    await page.goto("/login");
    await signIn(page, UNKNOWN_EMAIL, "whatever-password");
    const unknown = await page.getByRole("alert").filter({ hasText: BAD_CREDENTIALS }).innerText();

    await signIn(page, partners![0]!.email, "definitely-not-the-password");
    await expect(page.getByRole("alert").filter({ hasText: BAD_CREDENTIALS })).toBeVisible();
    const wrong = await page.getByRole("alert").filter({ hasText: BAD_CREDENTIALS }).innerText();
    expect(wrong).toBe(unknown);
  });

  test("a magic-link request gets the same neutral answer and no session", async ({ page }) => {
    await page.goto("/login");
    await page.getByLabel("Email").fill(UNKNOWN_EMAIL);
    await page.getByRole("button", { name: "Email me a magic link" }).click();
    await expect(page.getByRole("status").filter({ hasText: LINK_SENT })).toBeVisible();

    await page.goto("/admin");
    await expectOnLogin(page);
  });
});

test.describe("each partner can sign in and out", () => {
  test.skip(!partners, MISSING_ENV);

  for (const partner of partners ?? []) {
    test(`partner ${partner.key.toUpperCase()} (${partner.nickname})`, async ({ page }) => {
      // Signing in returns to the page that was asked for.
      await page.goto("/admin/settings");
      await expect(page).toHaveURL(/\/login\?next=%2Fadmin%2Fsettings$/);
      await signIn(page, partner.email, partner.password);
      await expect(page).toHaveURL(/\/admin\/settings$/);
      await expect(page.getByLabel("Nickname")).toHaveValue(partner.nickname);

      // The account menu belongs to this partner.
      await page.getByRole("button", { name: "Account and sign out" }).first().click();
      await expect(page.getByRole("menu").getByText(`“${partner.nickname}”`)).toBeVisible();
      await page.keyboard.press("Escape");

      // A signed-in partner who opens /login goes straight back in.
      await page.goto("/login");
      await expect(page).toHaveURL(/\/admin$/);

      // Sign out from the top bar.
      await page.getByRole("button", { name: "Account and sign out" }).first().click();
      await page.getByRole("menuitem", { name: "Sign out" }).click();
      await expect(page).toHaveURL(/\/login\?signed_out=1$/);
      await expect(page.getByText("You’re signed out.")).toBeVisible();

      // The session is gone.
      await page.goto("/admin");
      await expectOnLogin(page);
    });
  }

  test("an outside ?next= is ignored after sign-in (no open redirect)", async ({ page }) => {
    const b = partners![1]!;
    await page.goto("/login?next=//evil.example/steal");
    await signIn(page, b.email, b.password);
    await expect(page).toHaveURL(/127\.0\.0\.1:\d+\/admin$/);
  });
});
