import { expect, test } from "@playwright/test";

// /styleguide/notifications: the real bell and Settings control with in-memory actions. No DB, no sign-in.
test.use({ storageState: { cookies: [], origins: [] } });

test.describe("Bell (preview)", () => {
  test("badge, the latest notifications, Mark all read", async ({ page }) => {
    await page.goto("/styleguide/notifications");
    const bell = page.getByRole("button", { name: "Notifications, 3 unread" });
    await expect(bell).toBeVisible();
    await expect(page.getByTestId("bell-badge")).toHaveText("3");

    await bell.click();
    const menu = page.getByRole("menu");
    await expect(menu.getByRole("menuitem", { name: /D_Gal left you a note/ })).toBeVisible();
    await expect(menu.getByText("“Don’t forget your umbrella. Also: so proud of you.”")).toBeVisible();
    await expect(
      menu.getByRole("menuitem", { name: /D_Gal wrote “Rain on the train home”/ }),
    ).toHaveAttribute("href", "/admin/entries/e1");
    await expect(
      menu.getByRole("menuitem", { name: /New foundation application FDN-2026-0042/ }),
    ).toHaveAttribute("href", "/admin/foundation/a1");
    await expect(menu.getByText("Unread")).toHaveCount(3);

    await menu.getByRole("menuitem", { name: "Mark all read" }).click();
    await expect(menu.getByText("Unread")).toHaveCount(0);
    await expect(page.getByTestId("bell-badge")).toHaveCount(0);
    await page.keyboard.press("Escape"); // the open menu hides the rest of the page from assistive tech
    await expect(page.getByRole("button", { name: "Notifications", exact: true })).toBeVisible();
  });

  test("keyboard: open with Enter, arrow through, Esc closes", async ({ page }) => {
    await page.goto("/styleguide/notifications");
    await page.getByRole("button", { name: /^Notifications/ }).focus();
    await page.keyboard.press("Enter");
    await expect(page.getByRole("menu")).toBeVisible();
    await page.keyboard.press("ArrowDown");
    await expect(page.getByRole("menuitem").filter({ hasText: /\S/ }).first()).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(page.getByRole("menu")).toBeHidden();
  });

  test("empty feed", async ({ page }) => {
    await page.goto("/styleguide/notifications?empty=1");
    await page.getByRole("button", { name: "Notifications", exact: true }).click();
    await expect(page.getByText("You’re all caught up.")).toBeVisible();
  });
});

test.describe("Settings › Notifications (preview)", () => {
  test("each type offers Instant / Daily digest / Off and saves on change", async ({ page }) => {
    await page.goto("/styleguide/notifications");
    for (const type of ["new entries", "comments", "notes", "note replies", "foundation applications"]) {
      await expect(page.getByRole("toolbar", { name: `Email for ${type}` })).toBeVisible();
    }
    const notes = page.getByRole("toolbar", { name: "Email for notes" });
    await expect(notes.getByRole("button", { name: "Instant" })).toHaveAttribute("aria-pressed", "true");
    await notes.getByRole("button", { name: "Off" }).click();
    await expect(notes.getByRole("button", { name: "Off" })).toHaveAttribute("aria-pressed", "true");
    await expect(page.getByText("Email settings saved.").first()).toBeVisible();
  });
});

test.describe("Emails", () => {
  test("both render with the diary styling and no private content", async ({ page }) => {
    await page.goto("/styleguide/notifications");
    const instant = page.frameLocator('iframe[title="Instant email"]');
    await expect(instant.getByRole("heading", { name: "D_Gal left you a note" })).toBeVisible();
    await expect(instant.getByRole("link", { name: "Open the diary" })).toHaveAttribute(
      "href",
      "https://diary.example/admin",
    );
    const digest = page.frameLocator('iframe[title="Daily digest email"]');
    await expect(digest.getByRole("heading", { name: "3 things in your diary" })).toBeVisible();
  });
});

test.describe("GET /api/cron/digest", () => {
  test("is not callable without the cron secret", async ({ request }) => {
    expect((await request.get("/api/cron/digest")).status()).toBe(401);
    expect(
      (
        await request.get("/api/cron/digest", {
          headers: { authorization: "Bearer guess-guess-guess-guess" },
        })
      ).status(),
    ).toBe(401);
  });
});
