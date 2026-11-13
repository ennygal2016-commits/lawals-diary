import { existsSync } from "node:fs";
import { defineConfig, devices } from "@playwright/test";

import { STORAGE_STATE_A } from "./tests/e2e/helpers";

// E2E_BASE_URL runs the suites against a deployed site (e.g. the privacy suite after launch, DEPLOY.md §10).
// Then nothing is built locally and .env.local (the DEV project) is NOT loaded, so dev keys never meet production.
const REMOTE = process.env.E2E_BASE_URL?.replace(/\/+$/, "");

// The auth tests need the Supabase dev project and the two partner passwords from .env.local.
if (!REMOTE && existsSync(".env.local")) process.loadEnvFile(".env.local");

const PORT = Number(process.env.E2E_PORT ?? 3100);
const baseURL = REMOTE ?? `http://127.0.0.1:${PORT}`;

export default defineConfig({
  testDir: "tests/e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? "github" : "list",
  use: { baseURL, trace: "retain-on-failure" },
  projects: [
    // Signs in as partner A once and saves the cookies for the shell tests.
    { name: "setup", testMatch: /auth\.setup\.ts/ },
    {
      name: "desktop",
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 1440, height: 900 },
        storageState: STORAGE_STATE_A,
      },
      dependencies: ["setup"],
    },
    {
      name: "phone",
      use: { ...devices["Pixel 7"], viewport: { width: 375, height: 812 }, storageState: STORAGE_STATE_A },
      dependencies: ["setup"],
    },
  ],
  webServer: REMOTE
    ? undefined
    : {
        // Runs against a production build so tests see what Vercel will serve.
        command: `npm run build && npx next start -p ${PORT}`,
        url: baseURL,
        reuseExistingServer: !process.env.CI,
        timeout: 300_000,
        env: { ENABLE_STYLEGUIDE: "1", NEXT_PUBLIC_SITE_URL: baseURL },
      },
});
