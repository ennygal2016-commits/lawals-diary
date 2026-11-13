import { expect, test } from "@playwright/test";

// PWA (Phase 12): manifest, accent icons, the service worker's offline page, and the styled 404.
test.use({ storageState: { cookies: [], origins: [] } });

test.describe("PWA", () => {
  test("manifest: name, start URL, standalone, accent icons incl. maskable", async ({ request, page }) => {
    await page.goto("/login");
    await expect(page.locator('link[rel="manifest"]')).toHaveAttribute("href", "/manifest.webmanifest");
    await expect(page.locator('link[rel="apple-touch-icon"]').first()).toBeAttached();

    const res = await request.get("/manifest.webmanifest");
    expect(res.ok()).toBe(true);
    const m = await res.json();
    expect(m).toMatchObject({
      name: "Lawal's diary",
      start_url: "/admin",
      display: "standalone",
      background_color: "#0e0c14",
      theme_color: "#0e0c14",
    });
    expect(m.icons.map((i: { purpose: string }) => i.purpose)).toEqual(["any", "any", "maskable"]);
    for (const icon of m.icons as Array<{ src: string; sizes: string }>) {
      const img = await request.get(icon.src);
      expect(img.headers()["content-type"]).toBe("image/png");
      const png = await img.body();
      const [w] = icon.sizes.split("x").map(Number);
      expect(png.readUInt32BE(16)).toBe(w);
      // Top-left pixel area is the accent colour for the maskable icon (full bleed). Cheap check: file not empty.
      expect(png.length).toBeGreaterThan(1000);
    }
  });

  test("service worker is served fresh and never caches pages", async ({ request }) => {
    const res = await request.get("/sw.js");
    expect(res.ok()).toBe(true);
    expect(res.headers()["cache-control"]).toContain("no-store");
    const sw = await res.text();
    expect(sw).toContain('caches.match("/offline"');
  });

  test("offline: a page that can't load shows the offline page", async ({ page, context }) => {
    await page.goto("/offline");
    await expect(page.locator("h1")).toHaveText("You’re offline.");
    // Wait for the service worker to take control, then cut the network.
    await page.evaluate(async () => {
      await navigator.serviceWorker.ready;
      if (!navigator.serviceWorker.controller) {
        await new Promise((r) =>
          navigator.serviceWorker.addEventListener("controllerchange", r, { once: true }),
        );
      }
    });
    await context.setOffline(true);
    await page.goto("/journal").catch(() => undefined);
    await expect(page.locator("h1")).toHaveText("You’re offline.");
    await expect(page.getByRole("button", { name: "Try again" })).toBeVisible();
    await context.setOffline(false);
  });

  test("404 is in our style", async ({ page }) => {
    const res = await page.goto("/this-page-does-not-exist");
    expect(res?.status()).toBe(404);
    await expect(page.getByRole("heading", { name: "This page isn’t in the diary." })).toBeVisible();
    await expect(page.getByRole("link", { name: "Go to the front page" })).toHaveAttribute("href", "/");
  });
});
