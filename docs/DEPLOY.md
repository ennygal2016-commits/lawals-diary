# Deploying Lawal's diary to lawalsdiary.com

One section per step, in order. Each step ends with a **Check** — don't move on until it passes. Keep a password
manager open: you'll create several secrets, and none of them ever goes into chat, a commit or a screenshot.

| #   | Step                                   | Where                   | Time   |
| --- | -------------------------------------- | ----------------------- | ------ |
| 1   | Code on GitHub (private)               | github.com              | 10 min |
| 2   | Production Supabase project + schema   | supabase.com            | 20 min |
| 3   | Seed and the two admin users           | your computer           | 10 min |
| 4   | Upstash rate limit                     | upstash.com             | 5 min  |
| 5   | Turnstile keys                         | dash.cloudflare.com     | 5 min  |
| 6   | Vercel project + environment variables | vercel.com              | 15 min |
| 7   | Connect lawalsdiary.com                | Vercel + your registrar | 15 min |
| 8   | Resend: DNS (SPF/DKIM) + Supabase SMTP | resend.com + registrar  | 20 min |
| 9   | Daily backups                          | GitHub                  | 10 min |
| 10  | First sign-in and launch checks        | lawalsdiary.com         | 20 min |

**Plan limits to know before you start (Supabase Free):** 500 MB database, **1 GB file storage**, projects pause
after 7 days with no activity (the daily email digest keeps it awake). Each photo is stored at three sizes in two
formats (about 1–1.5 MB per photo), so 1 GB is roughly 700–1,000 photos. When you get close, Supabase Pro
(about US$25/month) gives 100 GB and built-in daily backups.

---

## 1. Code on GitHub (private)

1. github.com → **New repository** → name `lawals-diary` → **Private** → don't add a README or .gitignore.
2. Ask Claude Code to commit and push (it has never committed without being asked), or run in `C:\dev\lawals-diary`:

   ```bash
   git add -A
   git commit -m "Lawal's diary v1"
   git remote add origin https://github.com/<you>/lawals-diary.git
   git push -u origin main
   ```

3. `.env.local` is ignored by `.gitignore` (every `.env.*` except `.env.example`), so no keys are pushed.

**Check:** the repository page shows the code and is marked **Private**; **Actions** shows the **CI** workflow
running (green in ~10 minutes; database tests show as skipped until you add dev secrets — optional, see the top
of `.github/workflows/ci.yml`).

## 2. Production Supabase project and schema

1. supabase.com → **New project**. Name `lawals-diary-prod`, region **Canada (Central)**, a strong database
   password (generate it; save it in the password manager as "Supabase prod DB password").
2. **SQL Editor → New query.** Paste and **Run** each file from `supabase/migrations/`, in order, exactly as in
   `docs/SETUP.md` §3 (files `…0001_schema.sql` to `…0009_public_site.sql`). Each ends with "Success. No rows
   returned".
3. **Authentication → Sign In / Providers:** turn **off** "Allow new users to sign up". Keep **Email** on.
4. **Authentication → URL Configuration:**
   - Site URL: `https://lawalsdiary.com`
   - Redirect URLs: `https://lawalsdiary.com/auth/callback**` (only this one — no localhost in production).
5. **Authentication → Emails → Magic Link:** set the link `href` to
   `{{ .RedirectTo }}&token_hash={{ .TokenHash }}&type=magiclink` (same as the dev project). Subject: "Your sign-in
   link for Lawal's diary".
6. **Project Settings → API:** copy the **Project URL**, the **anon public** key and the **service_role** key into
   the password manager. The service_role key bypasses every privacy rule: it goes only into Vercel (step 6) and,
   briefly, the seed file (step 3).

**Check:** **Table Editor** lists the tables (profiles, entries, photos, …); **Storage** lists `photos-private`,
`photos-public` and `foundation-docs`; `photos-public` is the only public bucket.

## 3. Seed and the two admin users

The seed adds both emails to the allowlist, creates the two accounts (and their profiles), the settings row, the
About page and the daily-words library. Run it from your computer, pointing at production **once**:

1. In `C:\dev\lawals-diary`, create a file named `.env.seed-prod` (ignored by git) containing:

   ```
   NEXT_PUBLIC_SUPABASE_URL=https://<prod-ref>.supabase.co
   SUPABASE_SERVICE_ROLE_KEY=<prod service_role key>
   ADMIN_EMAILS=<Nurat's email>,<Afeez's email>
   ```

   Nurat's email first (partner A, pink), then Afeez's (partner B, lavender). **No passwords**: in production
   you both sign in with a magic link.

2. Run:

   ```bash
   node --disable-warning=MODULE_TYPELESS_PACKAGE_JSON --env-file=.env.seed-prod scripts/seed.mts
   ```

3. **Delete `.env.seed-prod`** straight away.

**Check:** the output ends with "Seed complete."; Supabase → **Authentication → Users** shows exactly the two
emails, both confirmed; **Table Editor → profiles** has two rows with partners `a` and `b`.

## 4. Upstash rate limit

The public foundation form allows 5 applications per IP per hour. On Vercel this needs a shared store.

1. upstash.com → **Create database** → Redis, name `lawals-diary`, region **us-east-1** (closest to Vercel's
   default), free plan.
2. Copy **UPSTASH_REDIS_REST_URL** and **UPSTASH_REDIS_REST_TOKEN** (REST API section).

**Check:** the database shows "Active".

## 5. Turnstile keys

1. dash.cloudflare.com → **Turnstile → Add widget**. Name `lawalsdiary.com`, hostnames `lawalsdiary.com` and
   `www.lawalsdiary.com`, widget mode **Managed**.
2. Copy the **Site Key** and the **Secret Key**.

**Check:** the widget is listed. (The always-pass test keys from SETUP.md must **not** be used in production —
without real keys the production form refuses every submission, by design.)

## 6. Vercel project and environment variables

1. vercel.com → **Add New → Project** → import the GitHub repo. Framework: Next.js (detected). Leave build
   settings as they are.
2. Before the first deploy, open **Environment Variables** and add these for **Production** (and Preview, except
   where noted):

   | Name                             | Value                                                    |
   | -------------------------------- | -------------------------------------------------------- |
   | `NEXT_PUBLIC_SITE_URL`           | `https://lawalsdiary.com` (Production only)              |
   | `NEXT_PUBLIC_SHARED_TIMEZONE`    | `America/Toronto`                                        |
   | `NEXT_PUBLIC_SUPABASE_URL`       | prod Project URL (step 2)                                |
   | `NEXT_PUBLIC_SUPABASE_ANON_KEY`  | prod anon key                                            |
   | `SUPABASE_SERVICE_ROLE_KEY`      | prod service_role key — mark **Sensitive**               |
   | `RESEND_API_KEY`                 | from step 8 (add it then) — **Sensitive**                |
   | `EMAIL_FROM`                     | `Lawal's diary <hello@lawalsdiary.com>` (after step 8)   |
   | `NEXT_PUBLIC_TURNSTILE_SITE_KEY` | Turnstile site key (step 5)                              |
   | `TURNSTILE_SECRET_KEY`           | Turnstile secret key — **Sensitive**                     |
   | `UPSTASH_REDIS_REST_URL`         | step 4                                                   |
   | `UPSTASH_REDIS_REST_TOKEN`       | step 4 — **Sensitive**                                   |
   | `CRON_SECRET`                    | a new random string (`openssl rand -hex 32`) — Sensitive |

   Do **not** set `ADMIN_PASSWORD_A/B`, `ADMIN_EMAILS` or `ENABLE_STYLEGUIDE` in Vercel. (The allowlist lives in
   the database; `/styleguide` must 404 in production.)

3. **Deploy.**
4. **Settings → Cron Jobs:** the daily digest (`/api/cron/digest`, 12:00 UTC) from `vercel.json` is listed.

**Check:** the deployment is "Ready"; `https://<project>.vercel.app/` shows Our story; `/admin` sends you to
`/login`; `/styleguide` is a 404.

## 7. Connect lawalsdiary.com

1. Vercel → Project → **Settings → Domains** → add `lawalsdiary.com`, then `www.lawalsdiary.com` and choose
   **Redirect to lawalsdiary.com**.
2. At your domain registrar's DNS page, add exactly the records Vercel shows. Usually:
   - `A` record, host `@`, value `76.76.21.21`
   - `CNAME` record, host `www`, value `cname.vercel-dns.com`
     Remove any other `A`/`AAAA` record on `@` (parking pages).
3. Wait for both domains to show **Valid Configuration** (minutes to a few hours). Vercel issues the HTTPS
   certificate automatically.

**Check:** `https://lawalsdiary.com` loads with a padlock; `https://www.lawalsdiary.com` redirects to it;
`https://lawalsdiary.com/robots.txt` ends with `Sitemap: https://lawalsdiary.com/sitemap.xml`.

## 8. Resend: DNS (SPF/DKIM) and Supabase SMTP

Emails come from two places: the app (notifications, digest, foundation receipts — through the Resend API) and
Supabase Auth (magic links — through Resend's SMTP). Both send as `@lawalsdiary.com`.

1. resend.com → **Domains → Add domain** → `lawalsdiary.com`, region **North America (us-east-1)**.
2. Resend lists DNS records. Add each one at your registrar **exactly as shown** (copy-paste host and value):
   - **SPF** — a `TXT` record on `send` (value like `v=spf1 include:amazonses.com ~all`) and an `MX` record on
     `send` (value like `feedback-smtp.us-east-1.amazonses.com`, priority 10).
   - **DKIM** — a `TXT` record on `resend._domainkey` with the long `p=…` key.
   - **DMARC** (recommended) — a `TXT` record on `_dmarc`: `v=DMARC1; p=none;` (tighten to `p=quarantine` after
     a few weeks of clean sending).
3. Press **Verify DNS records**; wait for **Verified** (usually under an hour).
4. **API Keys → Create** two keys, both "Sending access" limited to `lawalsdiary.com`:
   - `vercel` → paste into Vercel as `RESEND_API_KEY`; set `EMAIL_FROM` (table above); **Redeploy**.
   - `supabase-smtp` → for the next step.
5. Supabase → **Authentication → Emails → SMTP Settings** → enable custom SMTP:
   - Sender email `signin@lawalsdiary.com`, sender name `Lawal's diary`
   - Host `smtp.resend.com`, port `465`, username `resend`, password = the `supabase-smtp` key
   - Without custom SMTP, Supabase only sends a couple of auth emails an hour; with it, check **Authentication →
     Rate Limits** and leave "emails sent per hour" at 30 or more.

**Check:** Resend shows the domain **Verified**; request a magic link at `https://lawalsdiary.com/login` and it
arrives from `signin@lawalsdiary.com` within a minute and isn't in spam (Gmail → "Show original" → SPF, DKIM and
DMARC all say PASS).

## 9. Daily backups

Supabase Free keeps no backups you can restore, so a GitHub Actions job (`.github/workflows/backup.yml`) dumps
the production database every night at 02:30 Toronto time, encrypts it, and keeps 30 days of copies.

1. Supabase → **Connect** (top bar) → **Session pooler** → copy the URI and put the database password from step 2
   into it. It looks like `postgresql://postgres.<ref>:<password>@aws-0-ca-central-1.pooler.supabase.com:5432/postgres`.
2. GitHub → repo → **Settings → Secrets and variables → Actions → New repository secret**:
   - `PROD_DB_URL` = that URI
   - `BACKUP_PASSPHRASE` = a new long random passphrase. **Save it in the password manager** — without it no
     backup can be opened.
3. **Actions → Nightly database backup → Run workflow.**
4. Photos are files, not database rows, and aren't in this dump: on the 1st of each month, sign in → **Settings →
   Export your data** and keep the ZIP somewhere safe (it has every photo at 2400 px plus all the data as JSON).

**Restore (keep these steps with the passphrase):** download the artifact from the run, then

```bash
gpg --decrypt lawals-diary-<date>.dump.gpg > backup.dump      # asks for BACKUP_PASSPHRASE
pg_restore --no-owner --no-privileges --clean --if-exists -d "<target database URI>" backup.dump
```

Restore into a fresh Supabase project (run migrations 1–9 first), never on top of the live one, then point
Vercel's variables at it.

**Check:** the manual run is green and its summary lists an artifact `db-backup-<date>` of a few hundred KB.

## 10. First sign-in and launch checks

1. Each of you: `https://lawalsdiary.com/login` → **Email me a magic link** → open the email on the same device.
   You stay signed in for 30 days on that device.
2. **Settings:** profile (display name, nickname, photo), notification emails, anniversary and special dates,
   and the **Public site** switch (on = Our story, Journal, Gallery and Foundation are visible to everyone).
3. On a phone: open `https://lawalsdiary.com/admin` → browser menu → **Add to Home Screen** (installs the app
   icon; it opens straight to Home).
4. Run the privacy suite against production from your computer (nothing is built; your dev keys aren't loaded):

   ```bash
   E2E_BASE_URL=https://lawalsdiary.com npx playwright test tests/e2e/privacy.spec.ts --no-deps
   ```

   Every private page must redirect to `/login`, every API must refuse. (Add
   `NEXT_PUBLIC_SUPABASE_URL=… NEXT_PUBLIC_SUPABASE_ANON_KEY=…` with the **prod** values in front to also try every
   table and function with the public anon key.)

5. Submit one test application on `/foundation` (check the reference email arrives), then delete it from
   `/admin/foundation`.

**Check — launch list**

- [ ] `/admin`, `/admin/timeline`, `/api/export` signed out → `/login` or 401
- [ ] `/styleguide` → 404
- [ ] Magic-link emails arrive, SPF/DKIM/DMARC pass
- [ ] A photo uploaded from an iPhone shows no location in the downloaded copy (Settings → Export)
- [ ] Public site switch hides everything within a minute ("Coming soon")
- [ ] Backup workflow green; passphrase saved; first monthly export saved
- [ ] Vercel → Project → **Deployment Protection** off for Production (the public site must be reachable)

**Rolling back:** Vercel → **Deployments** → pick the last good one → **Promote to Production** (instant). Database
changes are never rolled back automatically — that's what the backups are for.
