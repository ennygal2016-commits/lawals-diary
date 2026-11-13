import { mkdirSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { expect, test as setup } from "@playwright/test";

import { MISSING_ENV, STORAGE_STATE_A, signIn, testPartners } from "./helpers";

setup("sign in as partner A for the shell tests", async ({ page }) => {
  const partners = testPartners();
  if (!partners) {
    // No Supabase (e.g. CI without secrets): leave a signed-out state so the projects still start; every test
    // that needs a session skips itself with the same message.
    mkdirSync(dirname(STORAGE_STATE_A), { recursive: true });
    writeFileSync(STORAGE_STATE_A, JSON.stringify({ cookies: [], origins: [] }));
    setup.skip(true, MISSING_ENV);
    return;
  }
  const a = partners[0]!;

  await page.goto("/login");
  await signIn(page, a.email, a.password);
  await expect(page).toHaveURL(/\/admin$/);
  await page.context().storageState({ path: STORAGE_STATE_A });
});
