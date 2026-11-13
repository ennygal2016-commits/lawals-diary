import { expect, test } from "@playwright/test";

// The public site, signed out. Without Supabase configured the site counts as "on" and shows empty pages; with
// the dev project it shows whatever has been published. Either way nothing private is reachable.
test.use({ storageState: { cookies: [], origins: [] } });

test.describe("public site", () => {
  test("/ is Our story with the names, tagline and the foundation call to action", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("h1")).toContainText("&");
    await expect(page.getByText(/^Our story/).first()).toBeVisible();
    await expect(page.getByRole("link", { name: "Apply to the foundation" })).toHaveAttribute(
      "href",
      "/foundation",
    );
    await expect(page.locator('meta[property="og:image"]')).toHaveAttribute("content", /opengraph-image/);
  });

  test("/journal and /gallery render (empty state when nothing is shared)", async ({ page }) => {
    await page.goto("/journal");
    await expect(page.locator("h1")).toHaveText("Journal");
    await expect(
      page.getByText("Nothing shared yet — check back soon.").or(page.getByRole("listitem").first()),
    ).toBeVisible();

    await page.goto("/gallery");
    await expect(page.locator("h1")).toHaveText("Gallery");
    await expect(
      page.getByText("No photos shared yet.").or(page.getByRole("list", { name: "Photos" })),
    ).toBeVisible();
  });

  test("a made-up journal slug is a 404", async ({ page }) => {
    const res = await page.goto("/journal/no-such-entry-here");
    expect(res?.status()).toBe(404);
    const bad = await page.request.get("/journal/NOT%20A%20SLUG");
    expect(bad.status()).toBe(404);
  });

  test("robots.txt disallows the private routes and points at the sitemap", async ({ request }) => {
    const res = await request.get("/robots.txt");
    expect(res.ok()).toBe(true);
    const body = await res.text();
    expect(body).toMatch(/User-Agent: \*/i);
    for (const path of ["/admin", "/login", "/styleguide", "/api"])
      expect(body).toContain(`Disallow: ${path}`);
    expect(body).toMatch(/Sitemap: .*\/sitemap\.xml/);
  });

  test("sitemap.xml lists public pages only", async ({ request }) => {
    const res = await request.get("/sitemap.xml");
    expect(res.ok()).toBe(true);
    const xml = await res.text();
    const urls = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => new URL(m[1]!).pathname);
    expect(urls).toEqual(expect.arrayContaining(["/", "/journal", "/gallery", "/foundation"]));
    for (const u of urls) expect(u).toMatch(/^\/(journal(\/[a-z0-9-]+)?|gallery|foundation)?$/);
  });

  test("Open Graph image is a 1200×630 PNG", async ({ request }) => {
    const res = await request.get("/opengraph-image");
    expect(res.ok()).toBe(true);
    expect(res.headers()["content-type"]).toBe("image/png");
    const png = await res.body();
    expect(png.subarray(1, 4).toString("latin1")).toBe("PNG");
    expect(png.readUInt32BE(16)).toBe(1200);
    expect(png.readUInt32BE(20)).toBe(630);
  });

  test("public pages are indexable; admin is not", async ({ request }) => {
    const pub = await request.get("/journal");
    expect(pub.headers()["x-robots-tag"]).toBeUndefined();
    const admin = await request.get("/admin", { maxRedirects: 0 });
    expect(admin.headers()["x-robots-tag"]).toContain("noindex");
  });

  test("data export needs a session", async ({ request }) => {
    const res = await request.get("/api/export", { maxRedirects: 0 });
    expect(res.status()).toBe(401);
  });
});
