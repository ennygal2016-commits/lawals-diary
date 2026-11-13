import { expect, test } from "@playwright/test";

// Phase 11 admin screens through their /styleguide previews: the real components with sample data and fake
// actions. No DB, no sign-in. The signed-in versions are in public-site.spec.ts (skipped without Supabase).
test.use({ storageState: { cookies: [], origins: [] } });

test.describe("/admin/bookshelf (preview)", () => {
  test("shelf grouped Reading / Want to read / Finished, with counts and readers", async ({ page }) => {
    await page.goto("/styleguide/bookshelf");
    await expect(page.locator("h1")).toHaveText("Bookshelf");
    const headings = page.getByRole("heading", { level: 2 });
    await expect(headings).toHaveText([
      /^Reading\s*2 books$/,
      /^Want to read\s*1 book$/,
      /^Finished\s*2 books$/,
    ]);
    const reading = page.getByRole("region", { name: /Reading/ }).first();
    await expect(reading.getByRole("link", { name: /Things Fall Apart/ })).toBeVisible();
    await expect(reading.getByLabel("Reading: Nurat, Afeez")).toBeVisible();
    await expect(page.getByRole("link", { name: /Gilead/ })).toHaveAttribute(
      "href",
      "/styleguide/bookshelf/00000000-0000-4000-8000-00000000b005",
    );
  });

  test("empty shelf", async ({ page }) => {
    await page.goto("/styleguide/bookshelf?empty=1");
    await expect(page.getByText("No books yet. Add one by its ISBN, or type the details in.")).toBeVisible();
    await expect(page.getByRole("button", { name: "Add the first book" })).toBeVisible();
  });

  test("add by ISBN fills the form; unknown ISBN falls back to manual entry", async ({ page }) => {
    await page.goto("/styleguide/bookshelf");
    await page.getByRole("button", { name: "Add a book" }).click();
    const dialog = page.getByRole("dialog", { name: "Add a book" });
    await expect(dialog).toBeVisible();

    await dialog.getByRole("textbox", { name: "ISBN" }).first().fill("978-0-14-044913-6");
    await dialog.getByRole("button", { name: "Look up" }).click();
    await expect(dialog.getByRole("status")).toHaveText(
      "Found “Crime and Punishment”. Check the details, then add it.",
    );
    await expect(dialog.getByRole("textbox", { name: "Title" })).toHaveValue("Crime and Punishment");
    await expect(dialog.getByRole("textbox", { name: "Author" })).toHaveValue("Fyodor Dostoyevsky");

    await dialog.getByRole("textbox", { name: "ISBN" }).first().fill("9780000000002");
    await dialog.getByRole("button", { name: "Look up" }).click();
    await expect(dialog.getByRole("status")).toHaveText(
      "Open Library doesn’t know that ISBN. Fill in the details yourself.",
    );
    await expect(dialog.getByRole("textbox", { name: "Title" })).toHaveValue("");

    // Title is required.
    await dialog.getByRole("button", { name: "Add to the shelf" }).click();
    await expect(dialog.getByText("Enter the title.")).toBeVisible();

    await dialog.getByRole("textbox", { name: "Title" }).fill("Americanah");
    await dialog.getByRole("checkbox", { name: "Nurat" }).check();
    await dialog.getByRole("radio", { name: "4 stars" }).click();
    await expect(dialog.getByText("4 / 5")).toBeVisible();
    await expect(dialog.getByLabel("Cover (optional)")).toBeAttached();
    await dialog.getByRole("button", { name: "Add to the shelf" }).click();
    await expect(page.getByText("Book added to the shelf.").first()).toBeVisible();
    await expect(dialog).toBeHidden();
  });

  test("book page: details, quotes, edit form and remove confirmation", async ({ page }) => {
    await page.goto("/styleguide/bookshelf/00000000-0000-4000-8000-00000000b004");
    await expect(page.locator("h1")).toHaveText("Pride and Prejudice");
    await expect(page.getByText("Jane Austen").first()).toBeVisible();
    await expect(page.getByLabel("Rated 5 out of 5")).toBeVisible();
    await expect(page.getByRole("heading", { name: "Favourite quotes" })).toBeVisible();
    await expect(page.getByText("I declare after all there is no enjoyment like reading!")).toBeVisible();
    await expect(page.getByText("p. 54 · added by Nurat")).toBeVisible();
    // Only the quote you added can be removed.
    await expect(page.getByRole("button", { name: "Remove this quote" })).toHaveCount(1);

    await expect(page.getByRole("textbox", { name: "Title" })).toHaveValue("Pride and Prejudice");
    await expect(page.getByLabel("Started")).toHaveValue("2026-09-01");
    await expect(page.getByLabel("Finished")).toHaveValue("2026-10-12");
    await page.getByRole("button", { name: "Save", exact: true }).click();
    await expect(page.getByText("Saved.").first()).toBeVisible();

    await page.getByRole("textbox", { name: "Add a quote" }).fill("Till this moment I never knew myself.");
    await page.getByRole("button", { name: "Add quote" }).click();
    await expect(page.getByText("Quote added.").first()).toBeVisible();

    await page.getByRole("button", { name: "Remove from the shelf" }).click();
    await expect(page.getByRole("dialog", { name: "Remove this book?" })).toBeVisible();
    await expect(page.getByText("Its notes and quotes go too.")).toBeVisible();
  });
});

test.describe("/admin/about (preview)", () => {
  test("hero, story, milestones and photos; Preview / Save draft / Publish", async ({ page }) => {
    await page.goto("/styleguide/about");
    await expect(page.locator("h1")).toHaveText("About Us");
    await expect(page.getByRole("status").filter({ hasText: "Published" })).toContainText(
      /Published (1 Oct|Oct 1,) 2026/,
    );
    for (const name of ["Names and hero photo", "Our story", "Milestones", "Photos for the page"]) {
      await expect(page.getByRole("heading", { name, exact: true })).toBeVisible();
    }
    await expect(page.getByRole("textbox", { name: "Your names" })).toHaveValue("Nurat & Afeez");
    await expect(page.getByText("We met at a friend’s wedding")).toBeVisible();

    const milestones = page.getByRole("listitem", { name: /^Milestone \d+$/ });
    await expect(milestones).toHaveCount(4);
    await page.getByRole("button", { name: "Add a milestone" }).click();
    await expect(milestones).toHaveCount(5);
    await expect(page.getByRole("status").filter({ hasText: "Published" })).toContainText("draft not saved");
    await page.getByRole("button", { name: "Remove milestone 5" }).click();
    await expect(milestones).toHaveCount(4);

    await expect(page.getByRole("img", { name: /^Chosen photo \d+$/ })).toHaveCount(5);
    await page.getByRole("button", { name: "Remove chosen photo 1" }).click();
    await expect(page.getByRole("img", { name: /^Chosen photo \d+$/ })).toHaveCount(4);

    await page.getByRole("button", { name: "Save draft" }).click();
    await expect(page.getByText("Draft saved.").first()).toBeVisible();

    await page.getByRole("button", { name: "Publish", exact: true }).click();
    const confirm = page.getByRole("dialog", { name: "Publish the About page?" });
    await expect(confirm).toBeVisible();
    await confirm.getByRole("button", { name: "Publish" }).click();
    await expect(page.getByText("Published. The Our story page is up to date.").first()).toBeVisible();
    await expect(page.getByRole("button", { name: "Preview" })).toBeVisible();
  });

  test("preview renders the public Our story page", async ({ page }) => {
    await page.goto("/styleguide/about/preview");
    await expect(page.locator("h1")).toHaveText(/Nurat\s*&\s*Afeez/);
    await expect(page.getByText("Our story · since 2021")).toBeVisible();
    await expect(page.getByRole("heading", { name: "How it began" })).toBeVisible();
    const milestones = page.getByRole("region", { name: "Milestones" });
    await expect(milestones.getByRole("heading", { level: 3 })).toHaveText([
      "We met",
      "First date",
      "The proposal",
      "Our wedding",
    ]);
    await expect(page.getByRole("heading", { name: "From the gallery" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Apply to the foundation" })).toHaveAttribute(
      "href",
      "/foundation",
    );
  });
});

test.describe("/admin/settings (preview)", () => {
  test("dates, scripture, public site switch and export", async ({ page }) => {
    await page.goto("/styleguide/settings");
    await expect(page.getByRole("textbox", { name: "Anniversary" })).toHaveValue("2023-05-08");
    await expect(page.getByRole("textbox", { name: "Name" })).toHaveValue("Afeez’s birthday");
    await page.getByRole("button", { name: "Add a special date" }).click();
    await expect(page.getByRole("textbox", { name: "Name" })).toHaveCount(2);
    await page.getByRole("button", { name: "Remove special date 2" }).click();
    await page.getByRole("button", { name: "Save dates" }).click();
    await expect(page.getByText("Dates saved.").first()).toBeVisible();

    await expect(page.getByRole("textbox", { name: "Translation" }).first()).toHaveValue("KJV");
    await expect(page.getByRole("textbox", { name: "Notice under the verse" })).toHaveValue(
      "King James Version — public domain.",
    );

    const sw = page.getByRole("switch", { name: "Public site" });
    await expect(sw).toHaveAttribute("aria-checked", "true");
    await sw.click();
    await expect(sw).toHaveAttribute("aria-checked", "false");
    await expect(
      page.getByText("Off: every public page shows “Coming soon”.", { exact: false }),
    ).toBeVisible();
    await expect(
      page.getByText("The public site is off — visitors see “Coming soon”.").first(),
    ).toBeVisible();

    await expect(page.getByRole("link", { name: "Download export (.zip)" })).toHaveAttribute("download", "");
  });

  test("daily library: filter by kind, add, edit and turn off", async ({ page }) => {
    await page.goto("/styleguide/settings");
    const kinds = page.getByRole("toolbar", { name: "Library" });
    await expect(kinds).toBeVisible();
    const before = await page.getByText(/^\d+ of \d+ in use$/).textContent();
    const [, inUse, total] = before!.match(/^(\d+) of (\d+) in use$/)!.map(Number) as [
      number,
      number,
      number,
    ];

    const firstOn = page.getByRole("switch", { name: "In use" }).first();
    await firstOn.click();
    await expect(page.getByText("Turned off — it won’t be picked.").first()).toBeVisible();
    await expect(page.getByText(`${inUse - 1} of ${total} in use`)).toBeVisible();

    await page.getByRole("button", { name: /^Add to / }).click();
    await page.getByRole("textbox", { name: "Text" }).fill("A new line for the library.");
    if (await page.getByRole("textbox", { name: "Reference" }).isVisible())
      await page.getByRole("textbox", { name: "Reference" }).fill("John 15:12");
    await page.getByRole("button", { name: "Add", exact: true }).click();
    await expect(page.getByText("Added to the library.").first()).toBeVisible();
    await expect(page.getByText(`${inUse} of ${total + 1} in use`)).toBeVisible();
  });
});

test.describe("Coming soon (preview)", () => {
  test("simple page with the site name", async ({ page }) => {
    await page.goto("/styleguide/coming-soon");
    await expect(page.locator("h1")).toHaveText("Coming soon");
    await expect(page.getByText("Lawal's diary", { exact: false }).first()).toBeVisible();
  });
});
