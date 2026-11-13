import { createClient } from "@supabase/supabase-js";
import { expect, test, type Browser, type Page } from "@playwright/test";

import { MISSING_ENV, signIn, testPartners } from "./helpers";

// Signed in as partner A (D_Gal). Desktop only — writes shared data in the dev project.
const partners = testPartners();
test.skip(!partners || !process.env.SUPABASE_SERVICE_ROLE_KEY, MISSING_ENV);
test.skip(({ isMobile }) => isMobile, "desktop only — writes shared data");
test.describe.configure({ mode: "serial" });

const marker = `e2e-notif-${Date.now()}`;
const db = () =>
  createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { persistSession: false },
  });

test.afterAll(async () => {
  await db().from("notes").delete().like("body", `${marker}%`);
  await db().from("notifications").delete().like("payload->>excerpt", `${marker}%`);
  await db().from("foundation_applications").delete().like("applicant_name", `${marker}%`);
  await db()
    .from("notifications")
    .delete()
    .eq("type", "application")
    .like("payload->>reference", "FDN-2099-%");
});

async function asPartnerB<T>(browser: Browser, run: (page: Page) => Promise<T>) {
  const context = await browser.newContext({ storageState: { cookies: [], origins: [] } });
  const page = await context.newPage();
  try {
    await page.goto("/login");
    await signIn(page, partners![1]!.email, partners![1]!.password);
    await expect(page).toHaveURL(/\/admin$/);
    return await run(page);
  } finally {
    await context.close();
  }
}

test("a note from Kuleo appears in D_Gal's bell live (Realtime), then Mark all read clears it", async ({
  page,
  browser,
}) => {
  await page.goto("/admin");
  await page.getByRole("button", { name: /^Notifications/ }).click();
  const menu = page.getByRole("menu");
  if (await menu.getByRole("menuitem", { name: "Mark all read" }).isVisible()) {
    await menu.getByRole("menuitem", { name: "Mark all read" }).click();
  }
  await page.keyboard.press("Escape");
  await expect(page.getByRole("button", { name: "Notifications", exact: true })).toBeVisible();

  // B sends a note while A's page stays open — no reload on A's side.
  await asPartnerB(browser, async (b) => {
    await b.getByRole("button", { name: "Write a note for D_Gal" }).click();
    await b.getByRole("dialog").getByLabel("Your note").fill(`${marker} see you at seven`);
    await b.getByRole("dialog").getByRole("button", { name: "Send note" }).click();
    await expect(b.getByText("Note sent to D_Gal.").first()).toBeVisible();
  });

  await expect(page.getByRole("button", { name: "Notifications, 1 unread" })).toBeVisible({
    timeout: 15_000,
  });
  await page.getByRole("button", { name: "Notifications, 1 unread" }).click();
  await expect(menu.getByRole("menuitem", { name: /Kuleo left you a note/ })).toBeVisible();
  await expect(menu.getByText(`“${marker} see you at seven”`)).toBeVisible();
  await menu.getByRole("menuitem", { name: "Mark all read" }).click();
  await expect(page.getByTestId("bell-badge")).toHaveCount(0);
  await page.keyboard.press("Escape");

  // The read state is stored.
  await page.reload();
  await expect(page.getByRole("button", { name: "Notifications", exact: true })).toBeVisible();
});

test("a foundation application notifies both admins (database trigger)", async ({ page, browser }) => {
  const reference = `FDN-2099-${String(Date.now()).slice(-6)}`;
  await db()
    .from("foundation_applications")
    .insert({
      reference,
      applicant_name: `${marker} applicant`,
      applicant_dob: "2012-01-01",
      school: "Test School",
      level: "secondary",
      class_year: "JSS2",
      amount_requested: 100,
      reason: "test",
    });
  const { data: rows } = await db()
    .from("notifications")
    .select("user_id")
    .eq("type", "application")
    .eq("payload->>reference", reference);
  expect(rows).toHaveLength(2);

  await page.goto("/admin");
  await page.getByRole("button", { name: /^Notifications, \d+ unread/ }).click();
  await expect(
    page.getByRole("menuitem", { name: new RegExp(`New foundation application ${reference}`) }),
  ).toBeVisible();
  await asPartnerB(browser, async (b) => {
    await b.getByRole("button", { name: /^Notifications, \d+ unread/ }).click();
    await expect(
      b.getByRole("menuitem", { name: new RegExp(`New foundation application ${reference}`) }),
    ).toBeVisible();
  });
});

test("Settings › Notifications saves per-type email preferences", async ({ page }) => {
  await page.goto("/admin/settings");
  const entries = page.getByRole("toolbar", { name: "Email for new entries" });
  const original = (await entries.getByRole("button", { pressed: true }).innerText()).trim();
  await entries.getByRole("button", { name: "Off" }).click();
  await expect(page.getByText("Email settings saved.").first()).toBeVisible();
  await page.reload();
  await expect(
    page.getByRole("toolbar", { name: "Email for new entries" }).getByRole("button", { name: "Off" }),
  ).toHaveAttribute("aria-pressed", "true");
  await page
    .getByRole("toolbar", { name: "Email for new entries" })
    .getByRole("button", { name: original })
    .click();
  await expect(page.getByText("Email settings saved.").first()).toBeVisible();
});
