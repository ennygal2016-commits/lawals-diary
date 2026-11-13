# Setting up the Supabase dev project

About 15 minutes, once. You need this before you can sign in or run the database and sign-in tests.

> **Never paste the service-role key into a chat** (including Claude Code). It only goes in `.env.local`, which
> is never committed.

## 1. Create the project

1. Go to <https://supabase.com/dashboard> → **New project**.
2. Name: `lawals-diary-dev`. Region: **Canada (Central)**. Choose a strong database password and keep it in
   your password manager (you won't need it day to day).
3. Wait for the project to finish setting up (about 2 minutes).

## 2. Fill in `.env.local`

1. In the project folder (`C:\dev\lawals-diary`), copy `.env.example` to `.env.local`.
2. In Supabase: **Project Settings → API**. Copy into `.env.local`:
   - **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
   - **anon public** key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - **service_role** key → `SUPABASE_SERVICE_ROLE_KEY`
3. `ADMIN_EMAILS` → your two real emails, **Nurat's first**, comma-separated, no spaces.
4. `ADMIN_PASSWORD_A` and `ADMIN_PASSWORD_B` → passwords for this dev project only (12+ characters). The seed
   sets them and the tests sign in with them. Leave them empty when you set up production in Phase 12.

## 3. Run the migrations

In Supabase: **SQL Editor → New query**. For each file below, in this order, paste the whole file and press
**Run**. Each should end with "Success. No rows returned".

1. `supabase/migrations/20261111000001_schema.sql`
2. `supabase/migrations/20261111000002_security.sql`
3. `supabase/migrations/20261111000003_storage.sql`
4. `supabase/migrations/20261111000004_notes_guard.sql`
5. `supabase/migrations/20261111000005_photo_library.sql`
6. `supabase/migrations/20261111000006_timeline_search.sql`
7. `supabase/migrations/20261111000007_notifications.sql` (also turns on Realtime for the bell)
8. `supabase/migrations/20261111000008_foundation.sql` (references, status log, payments, live admin list)
9. `supabase/migrations/20261111000009_public_site.sql` (public site on/off, published Our story, public journal photos and comments)

Optional for development — emails. Without these, everything works and the bell is live; only emails are skipped.
Create a free account at <https://resend.com>, then in `.env.local` set `RESEND_API_KEY` and
`EMAIL_FROM="Lawal's diary <onboarding@resend.dev>"` (Resend's test sender only delivers to your own address
until a domain is verified in Phase 12). `CRON_SECRET` (any random string of 16+ characters) protects the daily
digest route.

For the foundation form (and its e2e test) add Cloudflare's always-pass Turnstile **test** keys to `.env.local`:
`NEXT_PUBLIC_TURNSTILE_SITE_KEY=1x00000000000000000000AA` and
`TURNSTILE_SECRET_KEY=1x0000000000000000000000000000000AA`. Real keys come in Phase 12.

(Supabase's Security Advisor will list the `public_*` views as "security definer views". That is on
purpose: they are the only public way into the data, and their `WHERE` clauses are the public rule.)

## 4. Auth settings

In Supabase, under **Authentication**:

1. **Sign In / Providers** → turn **off** "Allow new users to sign up". Keep the **Email** provider on.
2. **URL Configuration**:
   - Site URL: `http://localhost:3000`
   - Redirect URLs — add both:
     - `http://localhost:3000/auth/callback**`
     - `http://127.0.0.1:3100/auth/callback**`
3. **Emails → Magic Link** template: replace the link's `href` with

   ```
   {{ .RedirectTo }}&token_hash={{ .TokenHash }}&type=magiclink
   ```

   so a link opens correctly on any device (for example, requested on the laptop, opened on the phone).

## 5. Seed

```bash
npm run db:seed
```

This adds both emails to the allowlist, creates both accounts (each gets a profile automatically), the
settings row, the About page row and 160+ daily-content items. Safe to run again.

## 6. Check it

```bash
npm run test:db     # anonymous access is blocked everywhere (plants test rows, then cleans up)
npm run test:e2e    # whole app, including signing in as each partner
npm run dev         # then open http://localhost:3000/admin and sign in
```

The built-in Supabase email sender only sends a few emails an hour. That's fine for trying magic links now;
Resend takes over in Phase 9.
