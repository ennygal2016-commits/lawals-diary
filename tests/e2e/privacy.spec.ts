import { randomUUID } from "node:crypto";
import { readdirSync, statSync } from "node:fs";
import { join, relative, sep } from "node:path";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { expect, test } from "@playwright/test";

import { type Database, PRIVATE_TABLES } from "@/types/database";

/**
 * Privacy suite (Phase 12): as an anonymous visitor, try every private page, API route, storage object, table,
 * view and database function, and assert each attempt is denied. Runs in both projects (375 px and 1440 px).
 * The database and storage half needs the Supabase dev project from .env.local and skips without it.
 */
test.use({ storageState: { cookies: [], origins: [] } });

const FAKE_ID = "00000000-0000-4000-8000-000000000001";

/** Every page under src/app/admin, found on disk so new pages are covered automatically. */
function adminRoutes(): string[] {
  const root = join("src", "app", "admin");
  const out: string[] = [];
  const walk = (dir: string) => {
    for (const name of readdirSync(dir)) {
      const full = join(dir, name);
      if (statSync(full).isDirectory()) walk(full);
      else if (name === "page.tsx") {
        const rel = relative(root, dir).split(sep).filter(Boolean);
        out.push(
          "/" +
            ["admin", ...rel]
              .filter((s) => !/^\(.*\)$/.test(s))
              .map((s) => (/^\[.*\]$/.test(s) ? FAKE_ID : s))
              .join("/"),
        );
      }
    }
  };
  walk(root);
  return out.sort();
}

const ADMIN_ROUTES = adminRoutes();

test.describe("private pages send anonymous visitors to sign in", () => {
  test("the route list covers the whole admin area", () => {
    expect(ADMIN_ROUTES).toEqual(
      expect.arrayContaining([
        "/admin",
        "/admin/entries/new",
        `/admin/entries/${FAKE_ID}`,
        `/admin/entries/${FAKE_ID}/edit`,
        "/admin/drafts",
        "/admin/timeline",
        "/admin/photos",
        "/admin/calendar",
        "/admin/foundation",
        `/admin/foundation/${FAKE_ID}`,
        "/admin/bookshelf",
        `/admin/bookshelf/${FAKE_ID}`,
        "/admin/about",
        "/admin/about/preview",
        "/admin/settings",
      ]),
    );
  });

  for (const path of ADMIN_ROUTES) {
    test(`${path} → 307 to /login, nothing private in the response`, async ({ request }) => {
      const res = await request.get(path, { maxRedirects: 0 });
      expect(res.status()).toBe(307);
      const location = new URL(res.headers()["location"] ?? "", "http://x");
      expect(location.pathname).toBe("/login");
      // /admin is where sign-in lands anyway, so it carries no ?next=.
      expect(location.searchParams.get("next")).toBe(path === "/admin" ? null : path);
      expect(res.headers()["x-robots-tag"]).toContain("noindex");
      expect((await res.body()).length).toBeLessThan(200); // a bare redirect, no page
    });
  }

  test("a browser lands on the sign-in page, not the diary", async ({ page }) => {
    for (const path of ["/admin", "/admin/timeline", "/admin/photos", `/admin/entries/${FAKE_ID}`]) {
      await page.goto(path);
      await expect(page).toHaveURL(/\/login(\?next=|$)/);
      await expect(page.getByRole("heading", { level: 1, name: "Welcome back" })).toBeVisible();
      await expect(page.locator('a[href="/admin/timeline"]')).toHaveCount(0);
    }
  });

  test("a forged session cookie doesn't get in", async ({ browser, baseURL }) => {
    const context = await browser.newContext({ storageState: { cookies: [], origins: [] } });
    const host = new URL(baseURL!).hostname;
    const forged = Buffer.from(
      JSON.stringify({ access_token: "forged.jwt.token", refresh_token: "nope", user: { id: FAKE_ID } }),
    ).toString("base64");
    await context.addCookies(
      ["sb-access-token", "sb-localhost-auth-token", "sb-127-auth-token"].map((name) => ({
        name,
        value: `base64-${forged}`,
        domain: host,
        path: "/",
      })),
    );
    const res = await context.request.get("/admin", { maxRedirects: 0 });
    expect(res.status()).toBe(307);
    expect(res.headers()["location"]).toContain("/login");
    await context.close();
  });
});

test.describe("API routes refuse anonymous callers", () => {
  const sameSite = (baseURL: string) => ({ origin: new URL(baseURL).origin });
  const crossSite = { origin: "https://evil.example" };

  test("data export", async ({ request }) => {
    expect((await request.get("/api/export", { maxRedirects: 0 })).status()).toBe(401);
  });

  test("calendar data", async ({ request }) => {
    expect((await request.get("/api/calendar?month=2026-11")).status()).toBe(401);
  });

  test("photo upload: 401 same-site, 403 cross-site, GET not allowed", async ({ request, baseURL }) => {
    const multipart = {
      photos: { name: "a.jpg", mimeType: "image/jpeg", buffer: Buffer.from([0xff, 0xd8]) },
    };
    const same = await request.post("/api/photos/upload", { headers: sameSite(baseURL!), multipart });
    expect(same.status()).toBe(401);
    expect(await same.json()).toMatchObject({ photos: [] });
    const cross = await request.post("/api/photos/upload", { headers: crossSite, multipart });
    expect(cross.status()).toBe(403);
    expect((await request.get("/api/photos/upload")).status()).toBe(405);
  });

  test("daily digest cron needs the secret", async ({ request }) => {
    expect((await request.get("/api/cron/digest")).status()).toBe(401);
    const wrong = await request.get("/api/cron/digest", {
      headers: { authorization: "Bearer not-the-secret-0123456789" },
    });
    expect(wrong.status()).toBe(401);
  });

  test("foundation form refuses cross-site posts", async ({ request }) => {
    const res = await request.post("/api/foundation/apply", { headers: crossSite, multipart: { name: "x" } });
    expect(res.status()).toBe(403);
    expect((await request.get("/api/foundation/apply")).status()).toBe(405);
  });

  test("sign-out refuses cross-site posts", async ({ request }) => {
    const res = await request.post("/auth/signout", { headers: crossSite, maxRedirects: 0 });
    expect(res.status()).toBe(403);
  });

  test("unknown API paths are 404, not a directory listing", async ({ request }) => {
    expect((await request.get("/api")).status()).toBe(404);
    expect((await request.get("/api/admin")).status()).toBe(404);
  });
});

test.describe("nothing private is cached or indexed", () => {
  test("private responses say no-store / noindex; robots.txt blocks them", async ({ request }) => {
    const login = await request.get("/login");
    expect(login.headers()["cache-control"]).toContain("no-store");
    expect(login.headers()["x-robots-tag"]).toContain("noindex");
    const robots = await (await request.get("/robots.txt")).text();
    for (const p of ["/admin", "/api", "/login"]) expect(robots).toContain(`Disallow: ${p}`);
  });

  test("the service worker never caches pages or API responses", async ({ request }) => {
    const sw = await (await request.get("/sw.js")).text();
    expect(sw).toContain('request.mode === "navigate"');
    // Only hashed build assets go into the runtime cache.
    const puts = sw.match(/cache\.put\(/g) ?? [];
    expect(puts).toHaveLength(1);
    expect(sw).toMatch(/startsWith\("\/_next\/static\/"\)[\s\S]*cache\.put\(/);
  });
});

// ── Database and storage (Supabase dev project) ────────────────────────────────────────────────────────────

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const NO_DB =
  "Set NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY and SUPABASE_SERVICE_ROLE_KEY in .env.local.";

/** Denied = an error, or an empty result. Never a row. */
function expectDenied(result: { data: unknown; error: unknown }, what: string) {
  const empty = result.data === null || (Array.isArray(result.data) && result.data.length === 0);
  expect(result.error !== null || empty, `${what} returned data to an anonymous visitor`).toBe(true);
}

test.describe("database: anonymous visitors can't read or write private data", () => {
  test.skip(!url || !anonKey, NO_DB);
  const opts = { auth: { persistSession: false, autoRefreshToken: false } } as const;
  let anon: SupabaseClient<Database>;
  test.beforeAll(() => {
    anon = createClient<Database>(url!, anonKey!, opts);
  });

  for (const table of PRIVATE_TABLES) {
    test(`table ${table}: no read, no insert, no update, no delete`, async () => {
      expectDenied(await anon.from(table).select("*").limit(5), `select ${table}`);
      const insert = await anon.from(table).insert({} as never);
      expect(insert.error, `insert into ${table}`).not.toBeNull();
      const update = await anon
        .from(table)
        .update({} as never)
        .not("created_at", "is", null)
        .select();
      expectDenied(update, `update ${table}`);
      const del = await anon.from(table).delete().not("created_at", "is", null).select();
      expectDenied(del, `delete ${table}`);
    });
  }

  test("private view photo_library is closed", async () => {
    expectDenied(await anon.from("photo_library").select("*").limit(5), "photo_library");
  });

  test("functions: not an admin; search, references, status and payments refused", async () => {
    const admin = await anon.rpc("is_admin");
    expect(admin.error !== null || admin.data === false).toBe(true);
    expectDenied(await anon.rpc("timeline_search", { p_query: "a" }), "timeline_search");
    expectDenied(await anon.rpc("next_foundation_reference"), "next_foundation_reference");
    const status = await anon.rpc("set_application_status", { p_id: FAKE_ID, p_status: "approved" });
    expect(status.error).not.toBeNull();
    const pay = await anon.rpc("record_application_payment", {
      p_id: FAKE_ID,
      p_amount: 1,
      p_paid_on: "2026-11-12",
    });
    expect(pay.error).not.toBeNull();
  });

  test("public views expose only public columns", async () => {
    const { data } = await anon.from("public_entries").select("*").limit(1);
    for (const row of data ?? []) {
      expect(Object.keys(row)).not.toEqual(expect.arrayContaining(["author_id"]));
      expect(row).not.toHaveProperty("visibility", "private");
    }
  });

  test("sign-up is closed", async () => {
    const { data, error } = await anon.auth.signUp({
      email: `privacy-${randomUUID().slice(0, 8)}@example.com`,
      password: `x-${randomUUID()}`,
    });
    expect(error !== null || data.user === null).toBe(true);
  });
});

test.describe("storage: private files stay private", () => {
  test.skip(!url || !anonKey || !serviceKey, NO_DB);
  const opts = { auth: { persistSession: false, autoRefreshToken: false } } as const;
  const planted: Array<{ bucket: string; path: string }> = [];
  let anon: SupabaseClient<Database>;
  let service: SupabaseClient<Database>;

  test.beforeAll(async () => {
    anon = createClient<Database>(url!, anonKey!, opts);
    service = createClient<Database>(url!, serviceKey!, opts);
    for (const bucket of ["photos-private", "foundation-docs"]) {
      const path = `privacy-probe/${randomUUID()}.jpg`;
      const { error } = await service.storage
        .from(bucket)
        .upload(path, Buffer.from([0xff, 0xd8, 0xff, 0xd9]), { contentType: "image/jpeg" });
      if (error) throw new Error(`couldn't plant ${bucket}/${path}: ${error.message}`);
      planted.push({ bucket, path });
    }
  });

  test.afterAll(async () => {
    for (const { bucket, path } of planted) await service.storage.from(bucket).remove([path]);
  });

  test("download, public URL, signed URL and listing are all refused", async ({ request }) => {
    for (const { bucket, path } of planted) {
      const download = await anon.storage.from(bucket).download(path);
      expect(download.data, `${bucket} download`).toBeNull();

      const publicUrl = anon.storage.from(bucket).getPublicUrl(path).data.publicUrl;
      expect((await request.get(publicUrl)).ok(), `${bucket} public URL`).toBe(false);

      const authUrl = `${url}/storage/v1/object/authenticated/${bucket}/${path}`;
      const viaAnonKey = await request.get(authUrl, {
        headers: { apikey: anonKey!, authorization: `Bearer ${anonKey}` },
      });
      expect(viaAnonKey.ok(), `${bucket} authenticated URL with the anon key`).toBe(false);

      const signed = await anon.storage.from(bucket).createSignedUrl(path, 60);
      expect(signed.data, `${bucket} signed URL`).toBeNull();

      const list = await anon.storage.from(bucket).list("privacy-probe");
      expectDenied(list, `${bucket} list`);
    }
  });

  test("anonymous uploads, overwrites and deletes are refused", async () => {
    for (const { bucket, path } of planted) {
      const upload = await anon.storage
        .from(bucket)
        .upload(`privacy-probe/${randomUUID()}.jpg`, Buffer.from([1]), { contentType: "image/jpeg" });
      expect(upload.error, `${bucket} upload`).not.toBeNull();
      const overwrite = await anon.storage
        .from(bucket)
        .upload(path, Buffer.from([1]), { upsert: true, contentType: "image/jpeg" });
      expect(overwrite.error, `${bucket} overwrite`).not.toBeNull();
      await anon.storage.from(bucket).remove([path]);
      const still = await service.storage.from(bucket).download(path);
      expect(still.data, `${bucket} object survived an anonymous delete`).not.toBeNull();
    }
    const pub = await anon.storage
      .from("photos-public")
      .upload(`privacy-probe/${randomUUID()}.jpg`, Buffer.from([1]), { contentType: "image/jpeg" });
    expect(pub.error, "photos-public upload").not.toBeNull();
  });
});
