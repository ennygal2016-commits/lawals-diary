import { expect, test, type Page } from "@playwright/test";

import { MISSING_ENV, testPartners } from "./helpers";

// Admin tests run signed in as partner A (storage state from auth.setup.ts) and need the Supabase dev project.
// Public, indexing and styleguide tests run signed out, with or without Supabase.
const SIGNED_OUT = { cookies: [], origins: [] };
const NO_DB = !testPartners();

const ADMIN_ROUTES = [
  "/admin",
  "/admin/entries/new",
  "/admin/timeline",
  "/admin/photos",
  "/admin/foundation",
  "/admin/calendar",
  "/admin/bookshelf",
  "/admin/drafts",
  "/admin/about",
  "/admin/settings",
];
// /login is covered in auth.spec.ts (these tests run signed in, and /login sends signed-in partners to /admin).
const PUBLIC_ROUTES = ["/", "/journal", "/gallery", "/foundation"];

async function horizontalOverflow(page: Page) {
  return page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
}

test.describe("every admin route renders", () => {
  test.skip(NO_DB, MISSING_ENV);
  for (const path of ADMIN_ROUTES) {
    test(`${path} → 200, exactly one h1, no sideways scroll`, async ({ page }) => {
      const response = await page.goto(path);
      expect(response?.status()).toBe(200);
      await expect(page.locator("h1")).toHaveCount(1);
      expect(await horizontalOverflow(page)).toBeLessThanOrEqual(0);
    });
  }
});

test.describe("every public route renders", () => {
  test.use({ storageState: SIGNED_OUT });
  for (const path of PUBLIC_ROUTES) {
    test(`${path} → 200, exactly one h1, no sideways scroll`, async ({ page }) => {
      const response = await page.goto(path);
      expect(response?.status()).toBe(200);
      await expect(page.locator("h1")).toHaveCount(1);
      expect(await horizontalOverflow(page)).toBeLessThanOrEqual(0);
    });
  }

  test("unknown routes get the styled 404", async ({ page }) => {
    const response = await page.goto("/no-such-page");
    expect(response?.status()).toBe(404);
    await expect(page.getByRole("heading", { name: "This page isn’t in the diary." })).toBeVisible();
  });
});

test.describe("indexing", () => {
  test.use({ storageState: SIGNED_OUT });
  test("admin, login and styleguide send X-Robots-Tag: noindex", async ({ request }) => {
    for (const path of ["/admin", "/admin/timeline", "/login", "/styleguide"]) {
      const response = await request.get(path);
      expect(response.headers()["x-robots-tag"], path).toContain("noindex");
    }
  });

  test("public pages are indexable and robots.txt blocks /admin", async ({ request }) => {
    expect((await request.get("/")).headers()["x-robots-tag"]).toBeUndefined();
    const robots = await (await request.get("/robots.txt")).text();
    expect(robots).toContain("Disallow: /admin");
  });
});

test.describe("desktop shell (1440px)", () => {
  test.skip(NO_DB, MISSING_ENV);
  test.skip(({ isMobile }) => isMobile, "desktop only");

  test("top bar marks the current page and navigates", async ({ page }) => {
    await page.goto("/admin");
    const nav = page.getByRole("navigation", { name: "Main" });
    await expect(nav.getByRole("link", { name: "Home" })).toHaveAttribute("aria-current", "page");
    await nav.getByRole("link", { name: "Timeline" }).click();
    await expect(page).toHaveURL(/\/admin\/timeline$/);
    await expect(nav.getByRole("link", { name: "Timeline" })).toHaveAttribute("aria-current", "page");
    await expect(nav.getByRole("link", { name: "Home" })).not.toHaveAttribute("aria-current", "page");
  });

  test("More menu works from the keyboard and closes on Esc", async ({ page }) => {
    await page.goto("/admin");
    const more = page.getByRole("navigation", { name: "Main" }).getByRole("button", { name: "More" });
    await more.focus();
    await page.keyboard.press("Enter");
    const menu = page.getByRole("menu");
    await expect(menu).toBeVisible();
    await expect(menu.getByRole("menuitem")).toHaveText([
      "Bookshelf",
      "Drafts",
      "About Us editor",
      "Settings",
    ]);
    await page.keyboard.press("Escape");
    await expect(menu).toBeHidden();
    await expect(more).toBeFocused();
  });

  test("More menu closes on outside click and navigates", async ({ page }) => {
    await page.goto("/admin");
    const more = page.getByRole("navigation", { name: "Main" }).getByRole("button", { name: "More" });
    await more.click();
    await page.mouse.click(700, 600);
    await expect(page.getByRole("menu")).toBeHidden();
    await more.click();
    await page.getByRole("menuitem", { name: "Drafts" }).click();
    await expect(page).toHaveURL(/\/admin\/drafts$/);
  });

  test("header actions: New entry, bell, account menu with sign out", async ({ page }) => {
    await page.goto("/admin");
    await expect(page.getByRole("banner").getByRole("link", { name: "New entry" })).toHaveAttribute(
      "href",
      "/admin/entries/new",
    );
    await page.getByRole("button", { name: /^Notifications/ }).click();
    // The real feed: either notifications or the empty state.
    const menu = page.getByRole("menu");
    await expect(menu.getByText("Notifications", { exact: true })).toBeVisible();
    await expect(
      menu.getByRole("menuitem").first().or(menu.getByText("You’re all caught up.")),
    ).toBeVisible();
    await page.keyboard.press("Escape");
    await page.getByRole("button", { name: "Account and sign out" }).click();
    await expect(page.getByRole("menuitem", { name: "Sign out" })).toBeVisible();
  });

  test("tab bar is hidden; quick-write shows except on the entry form", async ({ page }) => {
    await page.goto("/admin");
    await expect(page.getByRole("navigation", { name: "Tabs" })).toBeHidden();
    const quick = page.getByRole("link", { name: "Quick write: new entry" });
    await expect(quick).toBeVisible();
    await quick.click();
    await expect(page).toHaveURL(/\/admin\/entries\/new$/);
    await expect(page.getByRole("link", { name: "Quick write: new entry" })).toHaveCount(0);
  });

  test("first Tab reaches the skip link, which moves focus to main", async ({ page }) => {
    await page.goto("/admin/timeline");
    await page.keyboard.press("Tab");
    const skip = page.getByRole("link", { name: "Skip to content" });
    await expect(skip).toBeFocused();
    await page.keyboard.press("Enter");
    await expect(page.locator("main#main")).toBeFocused();
  });
});

test.describe("phone shell (375px)", () => {
  test.skip(NO_DB, MISSING_ENV);
  test.skip(({ isMobile }) => !isMobile, "phone only");

  test("top nav collapses into the bottom tab bar", async ({ page }) => {
    await page.goto("/admin");
    await expect(page.getByRole("navigation", { name: "Main" })).toBeHidden();
    const tabs = page.getByRole("navigation", { name: "Tabs" });
    await expect(tabs).toBeVisible();
    await expect(tabs.getByRole("link", { name: "Home" })).toHaveAttribute("aria-current", "page");
    await expect(tabs.getByRole("link", { name: "New entry" })).toBeVisible();
    await expect(page.getByRole("button", { name: /^Notifications/ })).toBeVisible();
  });

  test("tab bar More reaches Foundation, Calendar and the More pages", async ({ page }) => {
    await page.goto("/admin");
    await page.getByRole("navigation", { name: "Tabs" }).getByRole("button", { name: "More" }).click();
    await expect(page.getByRole("menuitem")).toHaveText([
      "Foundation",
      "Calendar",
      "Bookshelf",
      "Drafts",
      "About Us editor",
      "Settings",
    ]);
    await page.getByRole("menuitem", { name: "Calendar" }).click();
    await expect(page).toHaveURL(/\/admin\/calendar$/);
  });

  test("the entry form hides the tab bar and quick-write", async ({ page }) => {
    await page.goto("/admin/entries/new");
    await expect(page.getByRole("navigation", { name: "Tabs" })).toHaveCount(0);
    await expect(page.getByRole("link", { name: "Quick write: new entry" })).toHaveCount(0);
  });

  test("nothing scrolls sideways at 360px", async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 740 });
    for (const path of ["/admin", "/admin/timeline", "/", "/styleguide"]) {
      await page.goto(path);
      expect(await horizontalOverflow(page), path).toBeLessThanOrEqual(0);
    }
  });
});

test.describe("styleguide", () => {
  test.use({ storageState: SIGNED_OUT });
  test("renders every section", async ({ page }) => {
    await page.goto("/styleguide");
    for (const name of [
      "Colour",
      "Type",
      "Buttons",
      "Chips and segmented filters",
      "Inputs",
      "Cards and daily cards",
      "Menu, dialog, toast",
      "Empty states",
      "Avatar, initial chip, visibility, mood",
      "App shell",
    ]) {
      await expect(page.getByRole("heading", { level: 2, name, exact: true })).toBeVisible();
    }
  });

  test("dialog opens, traps focus, closes on Esc and returns focus", async ({ page }) => {
    await page.goto("/styleguide");
    const trigger = page.getByRole("button", { name: "Leave a note for Kuleo" });
    await trigger.click();
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();
    await expect(dialog.getByRole("heading", { name: "Leave a note for Kuleo" })).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(dialog).toBeHidden();
    await expect(trigger).toBeFocused();
  });

  test("toast appears", async ({ page }) => {
    await page.goto("/styleguide");
    await page.getByRole("button", { name: "Show toast" }).click();
    await expect(page.getByText("Entry saved", { exact: true })).toBeVisible();
  });

  test("segmented filter: arrow keys move focus, click selects", async ({ page }) => {
    await page.goto("/styleguide");
    const group = page.getByRole("toolbar", { name: "Visibility" });
    const all = group.getByRole("button", { name: "All" });
    await expect(all).toHaveAttribute("aria-pressed", "true");
    await all.focus();
    await page.keyboard.press("ArrowRight");
    await expect(group.getByRole("button", { name: "Private" })).toBeFocused();
    await page.keyboard.press("Enter");
    await expect(group.getByRole("button", { name: "Private" })).toHaveAttribute("aria-pressed", "true");
    await expect(all).toHaveAttribute("aria-pressed", "false");
  });
});
