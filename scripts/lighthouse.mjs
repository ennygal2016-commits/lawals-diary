// Lighthouse on Home, Timeline and Photos (Phase 12). Run against a production server:
//   npm run build && ENABLE_STYLEGUIDE=1 npx next start -p 3100   (in another terminal)
//   npm run lighthouse            (or: node scripts/lighthouse.mjs http://127.0.0.1:3100)
// Signed in (tests/e2e/.auth/partner-a.json from the Playwright setup) it audits the real /admin pages;
// otherwise the /styleguide previews of the same screens. Fails if any score is under 90.
// SEO skips "is-crawlable": private pages are noindex on purpose.
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { chromium } from "@playwright/test";
import * as chromeLauncher from "chrome-launcher";
import lighthouse from "lighthouse";
import desktopConfig from "lighthouse/core/config/desktop-config.js";

const BASE = (process.argv[2] ?? process.env.LIGHTHOUSE_URL ?? "http://127.0.0.1:3100").replace(/\/+$/, "");
const MIN = 90;
const RUNS = Number(process.env.LIGHTHOUSE_RUNS ?? 3); // median of 3, like Lighthouse CI: one run is noisy
const STATE = "tests/e2e/.auth/partner-a.json";

let cookie = "";
if (existsSync(STATE)) {
  const { cookies } = JSON.parse(readFileSync(STATE, "utf8"));
  cookie = cookies.map((c) => `${c.name}=${c.value}`).join("; ");
}
const signedIn = cookie.length > 0;
const PAGES = signedIn
  ? [
      ["Home", "/admin"],
      ["Timeline", "/admin/timeline"],
      ["Photos", "/admin/photos"],
    ]
  : [
      ["Home", "/styleguide/home"],
      ["Timeline", "/styleguide/timeline"],
      ["Photos", "/styleguide/photos"],
    ];

const chrome = await chromeLauncher.launch({
  chromePath: process.env.CHROME_PATH ?? chromium.executablePath(),
  chromeFlags: ["--headless=new", "--no-sandbox", "--disable-gpu"],
});
mkdirSync("lighthouse-reports", { recursive: true });

const rows = [];
let failed = false;
try {
  for (const [name, path] of PAGES) {
    for (const device of ["mobile", "desktop"]) {
      const flags = {
        port: chrome.port,
        output: "html",
        logLevel: "error",
        onlyCategories: ["performance", "accessibility", "best-practices", "seo"],
        skipAudits: ["is-crawlable"],
        extraHeaders: signedIn ? { Cookie: cookie } : undefined,
      };
      const runs = [];
      for (let i = 0; i < RUNS; i++) {
        const r = await lighthouse(`${BASE}${path}`, flags, device === "desktop" ? desktopConfig : undefined);
        if (!r) throw new Error(`no result for ${path}`);
        runs.push(r);
      }
      runs.sort(
        (a, b) => (a.lhr.categories.performance.score ?? 0) - (b.lhr.categories.performance.score ?? 0),
      );
      const result = runs[Math.floor(runs.length / 2)];
      const file = `lighthouse-reports/${name.toLowerCase()}-${device}.html`;
      writeFileSync(file, result.report);
      const scores = Object.fromEntries(
        Object.entries(result.lhr.categories).map(([k, c]) => [k, Math.round((c.score ?? 0) * 100)]),
      );
      const low = Object.entries(scores).filter(([, s]) => s < MIN);
      if (low.length) failed = true;
      rows.push({ page: `${name} (${path})`, device, ...scores, report: file });
    }
  }
} finally {
  await chrome.kill();
}

console.table(rows);
console.log(
  signedIn ? "Audited the real pages (signed in)." : "Audited the /styleguide previews (no session).",
);
if (failed) {
  console.error(`Some scores are under ${MIN}. Open the HTML reports in lighthouse-reports/.`);
  process.exit(1);
}
