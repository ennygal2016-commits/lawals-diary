import { createClient } from "@supabase/supabase-js";
import { expect, test } from "@playwright/test";

import { MISSING_ENV, testPartners } from "./helpers";

// Signed in as partner A. Seeds two marked entries in July 2025, checks the API and page, then removes them.
test.skip(!testPartners() || !process.env.SUPABASE_SERVICE_ROLE_KEY, MISSING_ENV);
test.skip(({ isMobile }) => isMobile, "desktop only — writes shared data");
test.describe.configure({ mode: "serial" });

const marker = `cal-${Date.now().toString(36)}`;
const db = () =>
  createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { persistSession: false },
  });

test.beforeAll(async () => {
  const { data: profiles } = await db().from("profiles").select("user_id").order("partner");
  const a = profiles![0]!.user_id;
  await db()
    .from("entries")
    .insert([
      { author_id: a, title: `${marker} one`, entry_date: "2025-07-14", status: "published" },
      { author_id: a, title: `${marker} two`, entry_date: "2025-07-14", status: "published" },
      { author_id: a, title: `${marker} draft`, entry_date: "2025-07-15", status: "draft" },
    ]);
});

test.afterAll(async () => {
  await db().from("entries").delete().like("title", `${marker}%`);
});

test("GET /api/calendar counts published entries per day (drafts excluded)", async ({ page }) => {
  await page.goto("/admin/calendar?month=2025-07");
  const res = await page.request.get("/api/calendar?month=2025-07");
  expect(res.status()).toBe(200);
  expect(res.headers()["cache-control"]).toContain("no-store");
  const body = (await res.json()) as { entries: Record<string, number> };
  expect(body.entries["2025-07-14"]).toBeGreaterThanOrEqual(2);
  expect(body.entries["2025-07-15"] ?? 0).toBe(0);
});

test("the dot, the day panel and Write about it", async ({ page }) => {
  await page.goto("/admin/calendar?month=2025-07");
  await expect(page.getByRole("gridcell", { name: /^Monday 14 July 2025, \d+ entries/ })).toBeVisible();
  await page.getByRole("gridcell", { name: /^Monday 14 July 2025/ }).click();
  await expect(page).toHaveURL(/\?month=2025-07&day=14$/);
  await expect(page.getByRole("heading", { level: 2, name: "Monday 14 July" })).toBeVisible();
  await expect(page.getByRole("link", { name: `${marker} one` })).toBeVisible();

  await page.getByRole("gridcell", { name: /^Tuesday 15 July 2025/ }).click();
  await expect(page.getByText("Nothing written on this day.")).toBeVisible();
  await page.getByRole("link", { name: "Write about it" }).click();
  await expect(page).toHaveURL(/\/admin\/entries\/new\?date=2025-07-15$/);
  await expect(page.getByLabel("Date")).toHaveValue("2025-07-15");
});

test("/admin/calendar opens on today, selected", async ({ page }) => {
  await page.goto("/admin/calendar");
  await expect(page.getByRole("gridcell", { name: /, today/ })).toHaveAttribute("aria-selected", "true");
});
