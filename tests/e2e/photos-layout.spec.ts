import { expect, test } from "@playwright/test";

// /styleguide/photos: the real Photos UI with 64 sample photos and in-memory actions. No database, no sign-in.
test.use({ storageState: { cookies: [], origins: [] } });

test.describe("Photos page (preview)", () => {
  test("one h1, Upload, chips with counts, the count, no sideways scroll", async ({ page }) => {
    await page.goto("/styleguide/photos");
    await expect(page.locator("h1")).toHaveText("Photos");
    await expect(page.getByRole("button", { name: "Upload", exact: true })).toBeVisible();
    const chips = page.getByRole("toolbar", { name: "Show photos" });
    for (const label of ["All", "In gallery", "On About page", "In public entries", "Private"]) {
      await expect(chips.getByRole("button", { name: new RegExp(`^${label} \\(\\d+\\)$`) })).toBeVisible();
    }
    await expect(page.getByText(/^64 photos$/)).toBeVisible();
    await expect(
      page.getByText("Location data is removed on upload.", { exact: false }).first(),
    ).toBeVisible();
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth),
    ).toBeLessThanOrEqual(0);
  });

  test("square grid: 5 columns on desktop, 2 on phone, each tile badged", async ({ page, isMobile }) => {
    await page.goto("/styleguide/photos");
    const tiles = page.getByRole("list", { name: "Photo library" }).getByRole("listitem");
    const boxes = await Promise.all([0, 1, 2, 3, 4, 5].map((i) => tiles.nth(i).boundingBox()));
    const firstRowY = boxes[0]!.y;
    const perRow = boxes.filter((b) => Math.abs(b!.y - firstRowY) < 2).length;
    expect(perRow).toBe(isMobile ? 2 : 5);
    expect(Math.abs(boxes[0]!.width - boxes[0]!.height)).toBeLessThan(2); // square
    await expect(tiles.first().getByRole("button")).toHaveAccessibleName(/\((public|private)\)$/);
    await expect(tiles.first().locator("[role=img]")).toBeVisible(); // the visible badge
  });

  test("tablet: 3 columns", async ({ page, isMobile }) => {
    test.skip(isMobile, "viewport set explicitly");
    await page.setViewportSize({ width: 800, height: 1000 });
    await page.goto("/styleguide/photos");
    const tiles = page.getByRole("list", { name: "Photo library" }).getByRole("listitem");
    const y = (await tiles.nth(0).boundingBox())!.y;
    expect(Math.abs((await tiles.nth(2).boundingBox())!.y - y)).toBeLessThan(2);
    expect((await tiles.nth(3).boundingBox())!.y).toBeGreaterThan(y + 10);
  });

  test("infinite scroll loads the next page", async ({ page }) => {
    await page.goto("/styleguide/photos");
    const tiles = page.getByRole("list", { name: "Photo library" }).getByRole("listitem");
    await expect(tiles).toHaveCount(40);
    await page.mouse.wheel(0, 20_000);
    await expect(tiles).toHaveCount(64);
    await expect(page.getByRole("button", { name: "Load more" })).toHaveCount(0);
  });

  test("filter chips change the URL and the grid", async ({ page }) => {
    await page.goto("/styleguide/photos");
    await page
      .getByRole("toolbar", { name: "Show photos" })
      .getByRole("button", { name: /^In gallery/ })
      .click();
    await expect(page).toHaveURL(/\?filter=gallery$/);
    await expect(page.getByText(/^16 photos · in gallery$/)).toBeVisible();
    await expect(page.getByRole("list", { name: "Photo library" }).getByRole("listitem")).toHaveCount(16);
  });

  test("lightbox: arrows, keyboard, Esc, caption, toggles, linked entry, delete", async ({ page }) => {
    await page.goto("/styleguide/photos");
    await page.getByRole("button", { name: /^Open photo 1[ :]/ }).click();
    const box = page.getByRole("dialog", { name: /^Photo 1 of 40\+/ });
    await expect(box).toBeVisible();
    await expect(box.getByRole("button", { name: "Previous photo" })).toBeDisabled();

    await box.getByRole("button", { name: "Next photo" }).click();
    await expect(page.getByRole("dialog", { name: /^Photo 2 of/ })).toBeVisible();
    await page.keyboard.press("ArrowRight");
    await expect(page.getByRole("dialog", { name: /^Photo 3 of/ })).toBeVisible();
    await page.keyboard.press("ArrowLeft");
    await expect(page.getByRole("dialog", { name: /^Photo 2 of/ })).toBeVisible();

    const dialog = page.getByRole("dialog", { name: /^Photo 2 of/ });
    await dialog.getByLabel("Caption").fill("By the lake");
    await dialog.getByRole("button", { name: "Save caption" }).click();
    await expect(page.getByText("Caption saved.").first()).toBeVisible();

    const gallery = dialog.getByRole("switch", { name: "Show in public gallery" });
    await expect(gallery).toHaveAttribute("aria-checked", "false");
    await gallery.click();
    await expect(gallery).toHaveAttribute("aria-checked", "true");
    await expect(dialog.getByText("Public", { exact: true })).toBeVisible();
    await expect(dialog.getByRole("switch", { name: "Use on About page" })).toBeVisible();

    await page.keyboard.press("Escape");
    await expect(dialog).toBeHidden();

    // Photo 8 (index 7) is in a public entry in the sample data.
    await page.getByRole("button", { name: /^Open photo 8[ :]/ }).click();
    const eighth = page.getByRole("dialog", { name: /^Photo 8 of/ });
    await expect(eighth.getByRole("link", { name: "The long walk along the lake" })).toBeVisible();
    await expect(eighth.getByText(/Also public because it’s in a public entry/)).toBeVisible();

    await eighth.getByRole("button", { name: "Delete photo" }).click();
    await page
      .getByRole("dialog", { name: "Delete this photo?" })
      .getByRole("button", { name: "Delete photo" })
      .click();
    await expect(page.getByText("Photo deleted.").first()).toBeVisible();
    await expect(page.getByRole("dialog", { name: /^Photo 8 of 39/ })).toBeVisible(); // moved on to the next one
  });

  test("lightbox swipe on touch", async ({ page, isMobile }) => {
    test.skip(!isMobile, "touch only");
    await page.goto("/styleguide/photos");
    await page.getByRole("button", { name: /^Open photo 1[ :]/ }).click();
    const stage = page.locator("[role=dialog] img").first();
    const b = (await stage.boundingBox())!;
    await page.evaluate(
      ({ x, y }) => {
        const el = document.elementFromPoint(x, y)!;
        const opts = { bubbles: true, pointerType: "touch", isPrimary: true } as const;
        el.dispatchEvent(new PointerEvent("pointerdown", { ...opts, clientX: x, clientY: y }));
        el.dispatchEvent(new PointerEvent("pointerup", { ...opts, clientX: x - 120, clientY: y }));
      },
      { x: b.x + b.width / 2, y: b.y + b.height / 2 },
    );
    await expect(page.getByRole("dialog", { name: /^Photo 2 of/ })).toBeVisible();
  });

  test("uploads show per-file rows; files that aren't photos are refused before sending", async ({
    page,
  }) => {
    await page.goto("/styleguide/photos");
    await page.getByTestId("photos-file").setInputFiles([
      { name: "notes.txt", mimeType: "text/plain", buffer: Buffer.from("hello") },
      { name: "huge.jpg", mimeType: "image/jpeg", buffer: Buffer.alloc(26 * 1024 * 1024, 1) },
    ]);
    const queue = page.getByRole("region", { name: "Uploads" });
    await expect(queue.getByText("Not a photo.")).toBeVisible();
    await expect(queue.getByText("Over 25 MB.")).toBeVisible();
    await expect(queue.getByRole("progressbar")).toHaveCount(2);
  });
});

test.describe("POST /api/photos/upload", () => {
  test("refuses signed-out callers", async ({ request }) => {
    const res = await request.post("/api/photos/upload", {
      multipart: {
        photos: { name: "a.jpg", mimeType: "image/jpeg", buffer: Buffer.from([0xff, 0xd8, 0xff, 0xe0]) },
      },
    });
    expect(res.status()).toBe(401);
  });
});
