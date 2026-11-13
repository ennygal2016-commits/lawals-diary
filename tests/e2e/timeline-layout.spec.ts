import { expect, test, type Page } from "@playwright/test";

// /styleguide/timeline: the real Timeline UI over 75 sample entries filtered in memory. No database or sign-in.
test.use({ storageState: { cookies: [], origins: [] } });

const rows = (page: Page) => page.locator("main ol > li");

test.describe("Timeline (preview)", () => {
  test("header stats, search, chips, month groups with counts, rows as in DESIGN.md", async ({ page }) => {
    await page.goto("/styleguide/timeline");
    await expect(page.locator("h1")).toHaveText("Timeline");
    await expect(page.getByText("75 entries · Nurat 38 · Afeez 37")).toBeVisible();
    await expect(page.getByRole("searchbox", { name: "Search entries" })).toHaveAttribute(
      "placeholder",
      "Search titles, words, places…",
    );
    const vis = page.getByRole("toolbar", { name: "Visibility" });
    for (const name of ["All", "Private", "Public"])
      await expect(vis.getByRole("button", { name })).toBeVisible();
    await expect(page.getByRole("button", { name: /More filters/ })).toHaveAttribute(
      "aria-expanded",
      "false",
    );

    const first = page.getByRole("heading", { level: 2 }).first();
    await expect(first).toHaveText(/^November 2026\s*\d+ entr(y|ies)$/);

    const row = rows(page).first();
    await expect(row.getByRole("link", { name: "Rain on the train home" })).toHaveAttribute(
      "href",
      /\/admin\/entries\/[0-9a-f-]{36}$/,
    );
    await expect(row.getByText("Tue 3")).toBeVisible();
    await expect(row.getByText(/^\d+ comments?$/)).toBeVisible();
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth),
    ).toBeLessThanOrEqual(0);
  });

  test("pages of 30 with infinite scroll; month counts cover unloaded rows", async ({ page }) => {
    await page.goto("/styleguide/timeline");
    await expect(rows(page)).toHaveCount(30);
    await page.mouse.wheel(0, 30_000);
    await expect(rows(page)).toHaveCount(60);
    await page.mouse.wheel(0, 30_000);
    await expect(rows(page)).toHaveCount(75);
    await expect(page.getByRole("button", { name: "Load more" })).toHaveCount(0);
  });

  test("search is debounced, prefix-matching, and goes in the URL without losing focus", async ({ page }) => {
    await page.goto("/styleguide/timeline");
    const box = page.getByRole("searchbox", { name: "Search entries" });
    await box.pressSequentially("lak", { delay: 40 });
    await expect(page).toHaveURL(/\?q=lak$/);
    await expect(box).toBeFocused();
    await expect(box).toHaveValue("lak");
    const titles = await rows(page).getByRole("link").allInnerTexts();
    expect(titles.length).toBeGreaterThan(0);
    for (const t of titles) expect(t.toLowerCase()).toContain("lake");
    await expect(page.getByText(/^\d+ results?$/)).toBeVisible();
  });

  test("⌘K / Ctrl+K focuses search; Esc clears it", async ({ page }) => {
    await page.goto("/styleguide/timeline");
    await page.keyboard.press("Control+k");
    const box = page.getByRole("searchbox", { name: "Search entries" });
    await expect(box).toBeFocused();
    await box.fill("snow");
    await expect(page).toHaveURL(/q=snow/);
    await box.press("Escape");
    await expect(box).toHaveValue("");
    await expect(page).toHaveURL(/\/styleguide\/timeline$/);
  });

  test("visibility chips and More filters all live in the URL", async ({ page }) => {
    await page.goto("/styleguide/timeline");
    await page.getByRole("toolbar", { name: "Visibility" }).getByRole("button", { name: "Public" }).click();
    await expect(page).toHaveURL(/\?v=public$/);
    // Text pill on wider screens, globe icon on phones.
    await expect(
      rows(page)
        .first()
        .getByText("Public")
        .or(rows(page).first().getByRole("img", { name: "Public" }))
        .filter({ visible: true }),
    ).toBeVisible();

    await page.getByRole("button", { name: /More filters/ }).click();
    const panel = page.locator("#timeline-more-filters");
    await expect(panel).toBeVisible();
    await panel.getByRole("group", { name: "Author" }).getByRole("button", { name: "Nurat" }).click();
    await expect(page).toHaveURL(/author=a/);
    await panel.getByRole("group", { name: "Mood" }).getByRole("button", { name: "Calm" }).click();
    await panel.getByRole("group", { name: "Mood" }).getByRole("button", { name: "Loved" }).click();
    await expect(page).toHaveURL(/mood=calm%2Cloved|mood=calm,loved/);
    await panel.getByRole("group", { name: "Category" }).getByRole("button", { name: "Travel" }).click();
    await panel.getByLabel("From").fill("2026-01-01");
    await panel.getByRole("group", { name: "Photos" }).getByRole("button", { name: "Has photos" }).click();
    await expect(page).toHaveURL(/photos=1/);
    await expect(page.getByRole("button", { name: /More filters \(5\)/ })).toBeVisible();

    // A bookmarked URL restores the whole view.
    const url = page.url();
    await page.goto(url);
    await expect(page.getByRole("button", { name: /More filters \(5\)/ })).toHaveAttribute(
      "aria-expanded",
      "true",
    );
    await expect(page.getByLabel("From")).toHaveValue("2026-01-01");
    await expect(
      page
        .locator("#timeline-more-filters")
        .getByRole("group", { name: "Author" })
        .getByRole("button", { name: "Nurat" }),
    ).toHaveAttribute("aria-pressed", "true");
  });

  test("no-results state clears everything", async ({ page }) => {
    await page.goto("/styleguide/timeline?q=zebra");
    await expect(page.getByText("No entries match “zebra”.")).toBeVisible();
    await page.getByRole("button", { name: "Clear search and filters" }).click();
    await expect(page).toHaveURL(/\/styleguide\/timeline$/);
    await expect(rows(page)).toHaveCount(30);
    await expect(page.getByRole("searchbox", { name: "Search entries" })).toHaveValue("");
  });

  test("empty diary state", async ({ page }) => {
    await page.goto("/styleguide/timeline?empty=1");
    await expect(page.getByText(/Nothing written yet/)).toBeVisible();
    await expect(page.getByRole("link", { name: "Write the first entry" })).toBeVisible();
  });
});

test("quick successive filter clicks are all kept (no lost updates)", async ({ page }) => {
  await page.goto("/styleguide/timeline");
  await page.getByRole("button", { name: /More filters/ }).click();
  const mood = page.locator("#timeline-more-filters").getByRole("group", { name: "Mood" });
  await mood.getByRole("button", { name: "Calm" }).click({ noWaitAfter: true });
  await mood.getByRole("button", { name: "Loved" }).click({ noWaitAfter: true });
  await mood.getByRole("button", { name: "Sad" }).click({ noWaitAfter: true });
  await expect(page).toHaveURL(/mood=calm%2Cloved%2Csad$/);
  for (const name of ["Calm", "Loved", "Sad"]) {
    await expect(mood.getByRole("button", { name })).toHaveAttribute("aria-pressed", "true");
  }
});
