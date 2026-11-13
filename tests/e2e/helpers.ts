import { expect, type Page } from "@playwright/test";

export const STORAGE_STATE_A = "tests/e2e/.auth/partner-a.json";

export type TestPartner = { key: "a" | "b"; email: string; password: string; nickname: string };

/** Partners come from .env.local (ADMIN_EMAILS + ADMIN_PASSWORD_A/B) — the dev project's seeded accounts. */
export function testPartners(): TestPartner[] | null {
  const emails = (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim())
    .filter(Boolean);
  const a = process.env.ADMIN_PASSWORD_A;
  const b = process.env.ADMIN_PASSWORD_B;
  if (emails.length !== 2 || !a || !b || !process.env.NEXT_PUBLIC_SUPABASE_URL) return null;
  return [
    { key: "a", email: emails[0]!, password: a, nickname: "D_Gal" },
    { key: "b", email: emails[1]!, password: b, nickname: "Kuleo" },
  ];
}

export const MISSING_ENV =
  "Set NEXT_PUBLIC_SUPABASE_URL, ADMIN_EMAILS and ADMIN_PASSWORD_A/B in .env.local (see docs/SETUP.md).";

export async function signIn(page: Page, email: string, password: string) {
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
}

export async function expectOnLogin(page: Page) {
  await expect(page).toHaveURL(/\/login(\?|$)/);
  await expect(page.getByRole("heading", { level: 1, name: "Welcome back" })).toBeVisible();
}
