import { expect, test, type Page } from "@playwright/test";

// /styleguide/calendar: the real Calendar with sample data; "today" pinned to Tue 3 Nov 2026. No DB, no sign-in.
test.use({ storageState: { cookies: [], origins: [] } });

const grid = (page: Page) => page.getByRole("grid", { name: /\d{4}$/ });
const cell = (page: Page, label: RegExp | string) => page.getByRole("gridcell", { name: label });

test.describe("Calendar (preview)", () => {
  test("Monday-first month grid with today, dots, hearts and the legend", async ({ page }) => {
    await page.goto("/styleguide/calendar");
    await expect(page.locator("h1")).toHaveText(/November\s+2026/);
    const headers = await grid(page).getByRole("columnheader").allInnerTexts();
    expect(headers.map((h) => h.trim().toLowerCase())).toEqual(["mo", "tu", "we", "th", "fr", "sa", "su"]);

    // 1 November 2026 is a Sunday: the first row has six blanks then 1.
    const firstRow = grid(page).locator("tbody tr").first().locator("td");
    await expect(firstRow.nth(6)).toHaveAttribute("data-date", "2026-11-01");

    const today = cell(page, /^Tuesday 3 November 2026, today/);
    await expect(today).toHaveAttribute("aria-current", "date");
    await expect(today).toHaveAttribute("aria-selected", "true"); // no ?day → today is selected
    await expect(cell(page, /^Sunday 1 November 2026, 1 entry$/)).toBeVisible();
    await expect(cell(page, /^Wednesday 18 November 2026, Afeez’s birthday$/)).toBeVisible();

    await expect(page.getByRole("list", { name: "Legend" })).toContainText("Entry");
    await expect(page.getByRole("list", { name: "Legend" })).toContainText("Anniversary / special date");
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth),
    ).toBeLessThanOrEqual(0);
  });

  test('selected-day panel: "Tuesday 3 November" and its entries', async ({ page }) => {
    await page.goto("/styleguide/calendar");
    await expect(page.getByRole("heading", { level: 2, name: "Tuesday 3 November" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Rain on the train home" })).toBeVisible();
    await expect(page.getByText("Nurat · Everyday · Calm")).toBeVisible();
  });

  test("an empty day offers Write about it with the date", async ({ page }) => {
    await page.goto("/styleguide/calendar?month=2026-11&day=2");
    await expect(page.getByRole("heading", { level: 2, name: "Monday 2 November" })).toBeVisible();
    await expect(page.getByText("Nothing written on this day.")).toBeVisible();
    await expect(page.getByRole("link", { name: "Write about it" })).toHaveAttribute(
      "href",
      "/admin/entries/new?date=2026-11-02",
    );
    // Future days can't be written about yet.
    await page.goto("/styleguide/calendar?month=2026-11&day=20");
    await expect(page.getByText("Nothing written on this day.")).toBeVisible();
    await expect(page.getByRole("link", { name: "Write about it" })).toHaveCount(0);
  });

  test("click selects a day and puts month and day in the URL", async ({ page }) => {
    await page.goto("/styleguide/calendar");
    await cell(page, /^Sunday 1 November 2026/).click();
    await expect(page).toHaveURL(/\?month=2026-11&day=1$/);
    await expect(page.getByRole("heading", { level: 2, name: "Sunday 1 November" })).toBeVisible();
    await expect(cell(page, /^Sunday 1 November 2026/)).toHaveAttribute("aria-selected", "true");
    await expect(page.getByRole("link", { name: "Sunday pancakes, attempt three" })).toBeVisible();
  });

  test("keyboard: arrows move, Enter selects, Home/End, PageUp/PageDown change month", async ({ page }) => {
    await page.goto("/styleguide/calendar");
    await cell(page, /^Tuesday 3 November 2026/).focus();

    await page.keyboard.press("ArrowRight");
    await expect(cell(page, /^Wednesday 4 November 2026/)).toBeFocused();
    await page.keyboard.press("ArrowDown");
    await expect(cell(page, /^Wednesday 11 November 2026/)).toBeFocused();
    await page.keyboard.press("Home");
    await expect(cell(page, /^Monday 9 November 2026/)).toBeFocused();
    await page.keyboard.press("End");
    await expect(cell(page, /^Sunday 15 November 2026/)).toBeFocused();
    await page.keyboard.press("Enter");
    await expect(page).toHaveURL(/\?month=2026-11&day=15$/);
    await expect(page.getByRole("heading", { level: 2, name: "Sunday 15 November" })).toBeVisible();

    await cell(page, /^Sunday 15 November 2026/).focus();
    await page.keyboard.press("PageUp");
    await expect(page).toHaveURL(/\?month=2026-10$/);
    await expect(page.locator("h1")).toHaveText(/October\s+2026/);
    await expect(cell(page, /^Thursday 15 October 2026/)).toBeFocused();

    await page.keyboard.press("PageDown");
    await page.keyboard.press("PageDown");
    await expect(page.locator("h1")).toHaveText(/December\s+2026/);
    await expect(cell(page, /^Tuesday 15 December 2026/)).toBeFocused();
    await expect(cell(page, /^Thursday 24 December 2026, 1 entry$/)).toBeVisible(); // dots loaded for the new month

    // Arrowing off the end of the month moves into the next one.
    await cell(page, /^Thursday 31 December 2026/).focus();
    await page.keyboard.press("ArrowRight");
    await expect(page.locator("h1")).toHaveText(/January\s+2027/);
    await expect(cell(page, /^Friday 1 January 2027/)).toBeFocused();
    await page.keyboard.press(" ");
    await expect(page).toHaveURL(/\?month=2027-01&day=1$/);
  });

  test("previous / next arrows and a bookmarked URL", async ({ page }) => {
    await page.goto("/styleguide/calendar");
    await page.getByRole("link", { name: /^Previous month/ }).click();
    await expect(page).toHaveURL(/\?month=2026-10$/);
    await expect(cell(page, /^Thursday 15 October 2026, 4th anniversary$/)).toBeVisible();
    await expect(page.getByText("Pick a day to see what you wrote.")).toBeVisible();

    await page.goto("/styleguide/calendar?month=2026-10&day=24");
    await expect(page.getByRole("heading", { level: 2, name: "Saturday 24 October" })).toBeVisible();
    await expect(page.locator("section").getByRole("listitem")).toHaveCount(2);

    await page.goto("/styleguide/calendar?month=2026-10&day=15");
    await expect(page.getByText("4th anniversary", { exact: false }).last()).toBeVisible();
  });
});

test.describe("GET /api/calendar", () => {
  test("refuses signed-out callers and bad months", async ({ request }) => {
    expect((await request.get("/api/calendar?month=2026-11")).status()).toBe(401);
    expect((await request.get("/api/calendar?month=2026-13")).status()).toBe(400);
    expect((await request.get("/api/calendar")).status()).toBe(400);
  });
});
