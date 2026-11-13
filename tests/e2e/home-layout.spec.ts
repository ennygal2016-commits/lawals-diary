import { expect, test } from "@playwright/test";

// Layout checks against /styleguide/home (sample data, no database or sign-in needed).
test.use({ storageState: { cookies: [], origins: [] } });
const SMALL = ["Romance for today", "Love for today", "Faith for today", "Encouragement for today"];

test.describe("Home layout (sample data)", () => {
  test("one h1, no sideways scroll, scripture first and full width", async ({ page }) => {
    await page.goto("/styleguide/home");
    await expect(page.locator("h1")).toHaveCount(1);
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth),
    ).toBeLessThanOrEqual(0);
    const scripture = await page.getByRole("region", { name: "Scripture for today" }).boundingBox();
    const main = await page.getByRole("region", { name: "Recently" }).boundingBox();
    expect(Math.abs(scripture!.width - main!.width)).toBeLessThan(2);
  });

  test("desktop: the four daily cards form a 2 × 2 grid", async ({ page, isMobile }) => {
    test.skip(isMobile, "desktop only");
    await page.goto("/styleguide/home");
    const boxes = await Promise.all(SMALL.map((name) => page.getByRole("region", { name }).boundingBox()));
    const [romance, love, faith, encouragement] = boxes.map((b) => b!);
    expect(Math.abs(romance!.y - love!.y)).toBeLessThan(2);
    expect(Math.abs(faith!.y - encouragement!.y)).toBeLessThan(2);
    expect(faith!.y).toBeGreaterThan(romance!.y + romance!.height - 1);
    expect(Math.abs(romance!.x - faith!.x)).toBeLessThan(2);
  });

  test("phone: the daily cards are a swipe row with page dots", async ({ page, isMobile }) => {
    test.skip(!isMobile, "phone only");
    await page.goto("/styleguide/home");
    const romance = (await page.getByRole("region", { name: "Romance for today" }).boundingBox())!;
    const love = (await page.getByRole("region", { name: "Love for today" }).boundingBox())!;
    expect(Math.round(romance.width)).toBe(250);
    expect(Math.abs(romance.y - love.y)).toBeLessThan(2);
    await page.getByRole("button", { name: "Show Faith" }).click();
    await expect(page.getByRole("button", { name: "Show Faith" })).toHaveAttribute("aria-current", "true");
  });

  test("note lists collapse and expand; Reply once opens the reply dialog", async ({ page }) => {
    await page.goto("/styleguide/home");
    const sentToggle = page.getByRole("button", { name: /Notes you sent/ });
    await expect(sentToggle).toHaveAttribute("aria-expanded", "false");
    await sentToggle.click();
    await expect(sentToggle).toHaveAttribute("aria-expanded", "true");
    await expect(page.getByText("Kuleo")).not.toHaveCount(0);

    await page.getByRole("button", { name: "Reply once" }).click();
    const dialog = page.getByRole("dialog", { name: /Reply to D_Gal/ });
    await expect(dialog).toBeVisible();
    await expect(dialog.getByText(/Don’t forget your umbrella/)).toBeVisible();
    await page.keyboard.press("Escape");

    await page.getByRole("button", { name: "Write a note for D_Gal" }).click();
    const compose = page.getByRole("dialog", { name: /Leave a note for D_Gal/ });
    await expect(compose.getByLabel("Your note")).toBeFocused();
    await expect(compose.getByLabel("Your note")).toHaveAttribute("maxlength", "1000");
  });

  test("empty states", async ({ page }) => {
    await page.goto("/styleguide/home?empty=1");
    await expect(page.getByText("Nothing written yet. The first entry starts the diary.")).toBeVisible();
    await expect(page.getByRole("link", { name: "Write the first entry" })).toBeVisible();
    await page.getByRole("button", { name: /Earlier notes from D_Gal/ }).click();
    await expect(page.getByText("No notes from D_Gal yet.")).toBeVisible();
  });
});
