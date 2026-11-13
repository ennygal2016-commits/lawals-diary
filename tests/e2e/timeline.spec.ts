import { createClient } from "@supabase/supabase-js";
import { expect, test, type Page } from "@playwright/test";

import { MISSING_ENV, testPartners } from "./helpers";

// Signed in as partner A. Seeds marked entries with the service role, checks the real database search and filters,
// then removes them. Desktop only — writes shared data.
test.skip(!testPartners() || !process.env.SUPABASE_SERVICE_ROLE_KEY, MISSING_ENV);
test.skip(({ isMobile }) => isMobile, "desktop only — writes shared data");
test.describe.configure({ mode: "serial" });

const marker = `zq${Date.now().toString(36)}`; // a unique, searchable word

function service() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { persistSession: false },
  });
}

test.beforeAll(async () => {
  const db = service();
  const { data: profiles } = await db.from("profiles").select("user_id, partner").order("partner");
  const [a, b] = profiles!;
  const rows = [
    {
      author_id: a!.user_id,
      title: `${marker} lakeside picnic`,
      body_text: "herons",
      location: "Toronto Island",
      entry_date: "2025-07-12",
      visibility: "public",
      mood: "calm",
      category: "travel",
    },
    {
      author_id: b!.user_id,
      title: `${marker} quiet sunday`,
      body_text: "we walked to the market",
      location: "Kensington",
      entry_date: "2025-07-06",
      visibility: "private",
      mood: "loved",
      category: "everyday",
    },
    {
      author_id: a!.user_id,
      title: `${marker} june rain`,
      body_text: "umbrella",
      location: "Union Station",
      entry_date: "2025-06-20",
      visibility: "private",
      mood: null,
      category: "everyday",
    },
  ] as const;
  for (const r of rows) {
    await db.from("entries").insert({ ...r, status: "published" });
  }
  // A draft and a deleted entry must never show.
  await db
    .from("entries")
    .insert({ author_id: a!.user_id, title: `${marker} draft`, status: "draft", entry_date: "2025-07-01" });
  await db.from("entries").insert({
    author_id: a!.user_id,
    title: `${marker} deleted`,
    status: "published",
    entry_date: "2025-07-02",
    deleted_at: new Date().toISOString(),
  });
});

test.afterAll(async () => {
  await service().from("entries").delete().like("title", `${marker}%`);
});

/** The result titles — after the page shows its result count (allInnerTexts doesn't wait for rendering). */
async function titles(page: Page) {
  await expect(page.getByText(/^\d+ results?$|No entries match/).first()).toBeVisible();
  return page.locator("main ol > li").getByRole("link").allInnerTexts();
}

test("full-text search over title, body and location (prefix words), drafts and deleted excluded", async ({
  page,
}) => {
  await page.goto(`/admin/timeline?q=${marker}`);
  expect((await titles(page)).sort()).toEqual(
    [`${marker} june rain`, `${marker} lakeside picnic`, `${marker} quiet sunday`].sort(),
  );

  await page.goto(`/admin/timeline?q=${marker}+walk`); // body: "walked" (stemmed)
  expect(await titles(page)).toEqual([`${marker} quiet sunday`]);

  await page.goto(`/admin/timeline?q=${marker}+unio`); // location prefix
  expect(await titles(page)).toEqual([`${marker} june rain`]);
});

test("months are grouped newest first with the right counts", async ({ page }) => {
  await page.goto(`/admin/timeline?q=${marker}`);
  await titles(page); // waits for the results to render
  const headings = await page.getByRole("heading", { level: 2 }).allInnerTexts();
  // Lower-cased: the counts are styled in capitals.
  expect(headings.map((h) => h.replace(/\s+/g, " ").trim().toLowerCase())).toEqual([
    "july 2025 2 entries",
    "june 2025 1 entry",
  ]);
});

test("filters: visibility, author, mood, category, date range", async ({ page }) => {
  const check = async (qs: string, expected: string[]) => {
    await page.goto(`/admin/timeline?q=${marker}&${qs}`);
    expect((await titles(page)).sort(), qs).toEqual(expected.map((t) => `${marker} ${t}`).sort());
  };
  await check("v=public", ["lakeside picnic"]);
  await check("v=private", ["quiet sunday", "june rain"]);
  await check("author=b", ["quiet sunday"]);
  await check("mood=calm,loved", ["lakeside picnic", "quiet sunday"]);
  await check("category=everyday", ["quiet sunday", "june rain"]);
  await check("from=2025-07-01&to=2025-07-10", ["quiet sunday"]);
  await check("photos=1", []);
  await expect(page.getByText(/No entries match/).filter({ visible: true })).toBeVisible();
});

test("the row shows author chip, day, category, comment count and visibility", async ({ page }) => {
  await page.goto(`/admin/timeline?q=${marker}+lakeside`);
  const row = page.locator("main ol > li").first();
  await expect(row.getByText("Sat 12")).toBeVisible();
  await expect(row.getByText("Travel")).toBeVisible();
  await expect(row.getByText("0 comments")).toBeVisible();
  // Text pill on wider screens, globe icon on phones.
  await expect(
    row
      .getByText("Public")
      .or(row.getByRole("img", { name: "Public" }))
      .filter({ visible: true }),
  ).toBeVisible();
});
