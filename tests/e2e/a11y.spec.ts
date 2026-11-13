import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

import { MISSING_ENV, testPartners } from "./helpers";

/**
 * axe accessibility checks (WCAG 2.2 AA rules) on every page, at 375 px and 1440 px. Serious and critical
 * violations fail the test; the admin screens are checked through their /styleguide previews (same components,
 * sample data) and, with the Supabase dev project, for real while signed in.
 */
const TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"];

async function expectNoSeriousViolations(page: Page, label: string) {
  const results = await new AxeBuilder({ page }).withTags(TAGS).analyze();
  const serious = results.violations.filter((v) => v.impact === "serious" || v.impact === "critical");
  const report = serious
    .map(
      (v) =>
        `${v.id} (${v.impact}): ${v.help}\n` +
        v.nodes
          .slice(0, 5)
          .map((n) => `    ${n.target.join(" ")} — ${n.failureSummary?.split("\n")[1] ?? ""}`)
          .join("\n"),
    )
    .join("\n");
  expect(serious, `${label}\n${report}`).toEqual([]);
}

const SIGNED_OUT = { cookies: [], origins: [] };

const PUBLIC_PAGES = [
  "/",
  "/journal",
  "/gallery",
  "/foundation",
  "/foundation/thanks?ref=FDN-2026-0001",
  "/login",
  "/offline",
  "/no-such-page",
];

const PREVIEWS = [
  "/styleguide",
  "/styleguide/home",
  "/styleguide/home?empty=1",
  "/styleguide/entry",
  "/styleguide/photos",
  "/styleguide/timeline",
  "/styleguide/calendar",
  "/styleguide/notifications",
  "/styleguide/foundation",
  "/styleguide/foundation/00000000-0000-4000-8000-000000000001",
  "/styleguide/bookshelf",
  "/styleguide/bookshelf/00000000-0000-4000-8000-00000000b004",
  "/styleguide/about",
  "/styleguide/about/preview",
  "/styleguide/settings",
  "/styleguide/coming-soon",
];

test.describe("axe: public pages", () => {
  test.use({ storageState: SIGNED_OUT });
  for (const path of PUBLIC_PAGES) {
    test(path, async ({ page }) => {
      await page.goto(path);
      await page.waitForLoadState("networkidle");
      await expectNoSeriousViolations(page, path);
    });
  }
});

test.describe("axe: admin screens (previews)", () => {
  test.use({ storageState: SIGNED_OUT });
  for (const path of PREVIEWS) {
    test(path, async ({ page }) => {
      await page.goto(path);
      await page.waitForLoadState("networkidle");
      await expectNoSeriousViolations(page, path);
    });
  }

  test("open dialogs: add a book, publish About, photo lightbox", async ({ page }) => {
    await page.goto("/styleguide/bookshelf");
    await page.getByRole("button", { name: "Add a book" }).click();
    await expect(page.getByRole("dialog")).toBeVisible();
    await expectNoSeriousViolations(page, "add a book dialog");

    await page.goto("/styleguide/about");
    await page.getByRole("button", { name: "Publish", exact: true }).click();
    await expect(page.getByRole("dialog")).toBeVisible();
    await expectNoSeriousViolations(page, "publish dialog");

    await page.goto("/styleguide/photos");
    await page
      .getByRole("button", { name: /^Open photo/ })
      .first()
      .click();
    await expect(page.getByRole("dialog")).toBeVisible();
    await expectNoSeriousViolations(page, "lightbox");
  });
});

test.describe("axe: admin pages, signed in", () => {
  test.skip(!testPartners(), MISSING_ENV);
  for (const path of [
    "/admin",
    "/admin/entries/new",
    "/admin/drafts",
    "/admin/timeline",
    "/admin/photos",
    "/admin/calendar",
    "/admin/foundation",
    "/admin/bookshelf",
    "/admin/about",
    "/admin/settings",
  ]) {
    test(path, async ({ page }) => {
      await page.goto(path);
      await page.waitForLoadState("networkidle");
      await expectNoSeriousViolations(page, path);
    });
  }
});
