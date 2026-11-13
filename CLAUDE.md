# Lawal's diary — project notes for Claude Code

Private two-person diary for Nurat ("D_Gal", partner A, pink) and Afeez ("Kuleo", partner B, lavender), with a
small public site and a scholarship foundation. Built in 12 phases; this file is updated at the end of each.

**Sources of truth:** `docs/PRD.md` (behaviour — wins on behaviour), `docs/DESIGN.md` (visuals — wins on visuals),
`docs/screens/*.png` (Nocturne renders). Originals at the repo root: the PRD/Design/Build-prompt PDF and the
Nocturne HTML/PDF.

## Status

| Phase                                        | State                                                                                                   |
| -------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| 1 — Scaffold and design system               | **Done** (2026-11-07)                                                                                   |
| 2 — Supabase, schema, security               | **Built** (2026-11-11) — verified in PGlite; awaiting the cloud dev project                             |
| 3 — Authentication, profiles                 | **Built** (2026-11-11) — signed-out e2e pass; signed-in e2e need the keys                               |
| 4 — Home dashboard                           | **Built** (2026-11-11) — layout e2e pass on sample data; signed-in e2e need the keys                    |
| 5 — Entries and the editor                   | **Built** (2026-11-11) — form e2e pass on the preview; signed-in e2e need the keys                      |
| 6 — Photo pipeline and library               | **Built** (2026-11-11) — preview e2e + GPS unit tests pass; storage e2e need the keys                   |
| 7 — Timeline and search                      | **Built** (2026-11-11) — preview e2e + SQL checks pass; DB e2e need the keys                            |
| 8 — Calendar                                 | **Built** (2026-11-11) — preview e2e pass; DB e2e need the keys                                         |
| 9 — Notifications                            | **Built** (2026-11-11) — preview e2e + email/cron unit tests pass; Realtime/DB e2e need the keys        |
| 10 — Foundation                              | **Built** (2026-11-11) — public form + admin preview e2e + SQL checks pass; DB e2e need the keys        |
| 11 — Bookshelf, About, Settings, public site | **Built** (2026-11-12) — previews + public-site e2e + SQL checks pass; DB e2e need the keys             |
| 12 — Polish, testing, deployment             | **Built** (2026-11-12) — privacy/axe/PWA e2e + Lighthouse ≥ 90 pass; deployment walkthrough in progress |

## Stack (do not substitute without asking)

Next.js **15.5** App Router · React 19 · TypeScript 5.9 strict (`noUncheckedIndexedAccess` on) · Tailwind CSS v4
(CSS-first config in `globals.css`) · shadcn/ui on the unified `radix-ui` package · Lucide · Supabase via
`@supabase/ssr` · Tiptap · sharp + heic-convert · Zod + React Hook Form · date-fns + date-fns-tz · Resend + React
Email · Cloudflare Turnstile · Upstash rate limit · Vitest · Playwright · Vercel.

Pinned on purpose: `typescript@5.9` (TS 7 is out but unsupported by Next 15 tooling), `eslint@9` (eslint-config-next
15 peer range), `next@15.5.x`.

## Commands

```bash
npm run dev            # http://localhost:3000  (/admin, /styleguide)
npm run build          # cleans .next first (OneDrive workaround), then next build
npm run lint           # eslint .
npm run typecheck      # tsc --noEmit
npm run format         # prettier --write .
npm run test           # vitest (unit)
npm run test:e2e       # playwright — builds + starts on :3100 with ENABLE_STYLEGUIDE=1, desktop 1440 + phone 375
npm run check          # lint + typecheck + format:check + unit tests
npm run db:seed        # allowlist, both accounts + profiles, settings, about row, daily content (idempotent)
npm run test:db        # vitest integration: anon can't read any private table/bucket (needs .env.local)
npm run lighthouse     # Home/Timeline/Photos, mobile + desktop, median of 3; fails under 90 (server must be running)
npx playwright install chromium   # once per machine
E2E_PORT=3210 npx playwright test   # use another port if :3100 is taken (another project on this PC uses it)
E2E_BASE_URL=https://lawalsdiary.com npx playwright test tests/e2e/privacy.spec.ts --no-deps   # against prod
```

Deployment: `docs/DEPLOY.md` (10 steps). CI: `.github/workflows/ci.yml` (lint, typecheck, format, Vitest,
Playwright on every push; DB tests run only if the `DEV_*` secrets are set). Nightly encrypted DB dump:
`.github/workflows/backup.yml` (secrets PROD_DB_URL, BACKUP_PASSPHRASE).

**The repo lives at `C:\dev\lawals-diary`** (moved 2026-11-11 out of OneDrive and away from the apostrophe
path). Supabase setup for a new project: `docs/SETUP.md` (run every file in `supabase/migrations/` in order, incl. 0004). Node ≥ 22.18 (runs `scripts/seed.mts` with built-in
type stripping).

End of every phase: `npm run check` and `npm run test:e2e` must both pass. e2e needs `.env.local` with the
Supabase dev project and `ADMIN_PASSWORD_A/B`; the `setup` project signs in as partner A for the shell tests.

## Folder structure

```
CLAUDE.md  .env.example  next.config.ts  components.json  vitest.config.mts  playwright.config.ts
docs/        PRD.md · DESIGN.md · SETUP.md (Supabase dev project) · screens/ (Nocturne renders)
scripts/     seed.mts
public/      (static assets; robots.txt / sitemap.xml / OG images are metadata routes in src/app)
src/
  app/
    layout.tsx            fonts (next/font: Instrument Serif, Geist, Geist Mono), metadata
    globals.css           ALL design tokens (:root) + Tailwind @theme mapping + base styles
    (public)/             public site: / (Our story), journal, journal/[slug], gallery, foundation
    admin/                admin shell layout + every admin route (placeholders until their phase)
    login/                page + login-form (password + magic link, useActionState, works without JS)
    auth/callback         magic-link landing (token_hash or PKCE code) → safe ?next
    auth/signout          POST, same-origin only → signOut(local) → /login?signed_out=1
    auth/denied           signed in without a profile → sign out → neutral message
    admin/page.tsx        Home: getViewer + getHomeData → <HomeView>
    admin/entries/new     <EntryForm> (?date=YYYY-MM-DD pre-fills); [id] read view + comments; [id]/edit (author only)
    admin/drafts          your drafts + "Recently deleted" (restore within 30 days)
    api/photos/upload     Node route: sniff → HEIC→JPEG → rotate → strip metadata → 400/1200/2400 WebP+JPEG → photos-private
    admin/photos          <PhotoLibrary> (?filter=gallery|about|public-entries|private)
    admin/timeline        <TimelineView> (?q, v, author, mood, category, from, to, photos)
    admin/calendar        <CalendarView> (?month=YYYY-MM&day=D; no day → today in the current month)
    api/foundation/apply  POST (public): same-site → 5/IP/h → Turnstile → Zod → docs cleaned → service-role insert
    (public)/foundation   intro + <ApplicationForm>; /foundation/thanks?ref=FDN-…
    admin/foundation      <FoundationAdminList> (?status, q, level, page) + [id] <FoundationAdminDetail>
    api/cron/digest       GET, Bearer CRON_SECRET (vercel.json: daily 12:00 UTC) → runDigest
    api/calendar          GET ?month=YYYY-MM → { entries: {date: n}, special: {date: [labels]} } (401 signed out)
    admin/settings/       Profile: profile-form (RHF + Zod), avatar-editor (square cropper)
    styleguide/home       Home with sample data (?empty=1) — dev tool, same gate as /styleguide
    styleguide/entry      the entry form without a database (?empty=1)
    styleguide/photos     the Photos UI with 64 sample photos and in-memory actions (uploads hit the real route)
    styleguide/timeline   the Timeline over 75 sample entries filtered in memory (?empty=1)
    styleguide/calendar   the Calendar with sample data, today pinned to 2026-11-03 (?today=)
    styleguide/foundation     admin list (?empty=1) and [id] detail (?status=) with sample data
    styleguide/notifications  bell with sample feed (?empty=1), Settings › Notifications, both emails rendered
    styleguide/           every token + component; dev only (ENABLE_STYLEGUIDE=1 in prod)
    not-found.tsx
  components/
    ui/                   button, chip (+ SegmentedFilter), input (Input, TitleInput, Textarea, Field), select,
                          card, daily-card, dropdown-menu, dialog, toast, empty-state, avatar,
                          badges (InitialChip, VisibilityBadge, MoodDot)
    home/                 home-view (pure presentation), home-header (greeting, days-together ring),
                          daily-row (2×2 grid / phone swipe row + dots), notes-section, note-dialog
    entries/              entry-card, entry-form (autosave), mood-picker, photo-field (upload + library), rich-text-editor
                          (Tiptap), rich-text (safe React renderer), entry-actions (edit/delete/restore), comments
    photos/               photo-library (chips, count, grid, infinite scroll, page-wide drop), lightbox, upload-queue,
                          use-photo-uploads (XHR per file, progress, 2 at a time), photo-actions (injectable actions)
    timeline/             timeline-view (search, chips, More filters panel, month groups, rail rows, infinite scroll)
    foundation/           application-form (RHF + Zod, docs, honeypot), turnstile (hand-rolled widget), admin-list,
                          admin-detail, admin-controls (status/note/payment; injectable), status-pill, live-refresh
    calendar/             calendar-view (WAI-ARIA grid, keyboard, dots + hearts, day panel; injectable month loader)
    shell/                notification-bell (Realtime + focus refresh, latest 20, Mark all read; injectable actions),
                          top-bar (optional `bell` slot), header-actions (More, bell, account menu), bottom-nav (tab bar,
                          quick-write), wordmark, page (PageContainer/PageHeader/PlaceholderPage),
                          public-header, public-footer, skip-link
  lib/
    site.ts               site name, partners, shared time zone
    nav.ts                admin/public nav config + isActive
    moods.ts              moods + categories
    design-tokens.ts      TS mirror of the colour tokens (tested against globals.css)
    contrast.ts           WCAG contrast maths
    utils.ts              cn()
    daily.ts              pickDaily (pure), KIND_OFFSET, dailyPresentation, translationNotice
    daily-content.ts      seed library: 38 KJV verses, 33 public-domain romance lines, 32 each love/faith/encouragement
    rich-text.ts          entry body schema: sanitizeDoc (allow-list nodes/marks, safe links), docToPlainText
    images/photo.ts       processPhoto (sharp + heic-convert): 3 sizes × WebP/JPEG, no metadata, 25 MB
    images/sniff.ts       magic-byte sniffing (JPEG, PNG, WebP, HEIC brands; AVIF refused)
    images/variants.ts    variants JSON shape helpers (client-safe); images/accept.ts client-safe constants
    http.ts               isSameOrigin (CSRF guard: Origin host vs Host / X-Forwarded-Host)
    images/document.ts    cleanDocument: PDF kept; photos → JPEG, oriented, ≤3000 px, no metadata
    notifications.ts      types, email prefs (parsePrefs, defaults), describeNotification, excerptOf, pickForDigest
    calendar.ts           month grid (Monday first), date maths in UTC, dayHeading, special dates + anniversary
    timeline.ts           TimelineFilters ⇄ URL (parseTimelineParams, timelineQueryString), groupByMonth, timelineDay
    dates.ts              greetingFor, homeDate ("Tuesday 3 November"), noteStamp, entryDay, togetherStats
    auth/redirect.ts      safeNextPath (only /admin paths), loginPathFor
    supabase/             env (+ 30-day SESSION_COOKIE_OPTIONS), server, browser, middleware, service
    images/avatar.ts      processAvatar: sniff → rotate → crop → 512² WebP, no metadata
    validation/           auth.ts (+ neutral AUTH_MESSAGES), profile.ts, notes.ts, entry.ts (+ slugFor, RESTORE_DAYS), photo.ts,
                          foundation.ts (applicationSchema(today), admin filters, status/note/payment)
  middleware.ts           session refresh on every route; /admin/** → /login?next=…; noindex + no-store
  server/
    actions/              auth.ts (signInWithPassword, sendMagicLink), profile.ts (updateProfile, uploadAvatar, removeAvatar),
                          notes.ts (sendNote, replyNote, markNotesRead), entries.ts (autosaveDraft, saveEntry,
                          deleteEntry, restoreEntry, addComment, deleteComment, listLibraryPhotos),
                          photos.ts (listPhotos, getPhotoDetail, updatePhoto, deletePhoto), timeline.ts (loadTimeline),
                          notifications.ts (markNotificationsRead, refreshNotifications), profile.ts + updateNotificationPrefs
    photos/storage.ts     storeProcessedPhoto, syncPublicCopies (FR-28), photoIdsOfEntries
    queries/viewer.ts     getViewer() — signed-in profile + signed avatar URL (React cache, once per request)
    queries/entries.ts    getEntry, getComments, getDraftsAndDeleted
    queries/photos.ts     signPaths (batch signed URLs), signThumbs, photoThumbs
    queries/photo-library.ts  LibraryPhoto, applyPhotoFilter, getPhotoCounts
    queries/timeline.ts   fetchTimeline (rpc timeline_search, 30 + 1 per page), getTimelineStats
    queries/calendar.ts   getCalendarMonth (dots + hearts), getDayEntries
    queries/foundation.ts getApplicationList (+ status counts), getApplication (signed doc URLs, history)
    actions/foundation.ts setApplicationStatus, addApplicationNote, recordPayment
    rate-limit.ts         Upstash sliding window 5/h (in-memory fallback), clientIp
    turnstile.ts          verifyTurnstile (fails closed in production without a secret)
    queries/notifications.ts  getNotificationFeed (latest 20 + unread), getMyNotifyPrefs
    notifications/        notify.ts (notifyPartner → row + after() deliverInstant), mailer.ts (Resend), digest.ts (runDigest)
    queries/home.ts       getHomeData() — daily picks, notes (20 per list + counts), 6 latest entries, partner line
  types/database.ts       hand-written supabase-js types + PRIVATE_TABLES — update with every migration
  emails/                 layout (tokens as hex; audience partners|applicant), notification-email, digest-email,
                          application-received-email — React Email
supabase/
  migrations/             0001 schema · 0002 security (is_admin, allowlist trigger, RLS, grants, views) · 0003 storage
                          · 0004 notes guard (only the recipient replies, once; notes immutable)
                          · 0005 photos.public_variants, photo_library view, public_photos exposes public copies only
                          · 0006 timeline_search() — FTS + filters + month/total window counts (security invoker)
                          · 0007 notifications.emailed_at, application → both admins trigger, Realtime publication
                          · 0008 next_foundation_reference (service role), set_application_status, record_application_payment
tests/
  unit/        vitest — tokens, nav, auth, avatar, schema (migration drift + seed), daily (pickDaily + dates), notes, rich-text, entries, photos (GPS fixture → no metadata in any variant), timeline (URL filters, months), calendar, notifications (wording, prefs, digest, emails, cron auth),
               foundation (form schema, admin filters), foundation-server (documents, rate limit, Turnstile, same-origin)
  stubs/       server-only.ts (Vitest alias so server modules can be unit-tested)
  integration/ vitest — rls.test.ts against the dev project (skips without .env.local)
  e2e/         playwright — auth.setup (partner A state), shell, auth, profile, home (signed in, note round trip as
               both partners), home-layout (/styleguide/home, signed out, no DB),
               entries (signed in: autosave, drafts, photo, publish, comments, delete/restore), entry-form-layout (no DB),
               photos (signed in: upload GPS fixture → all 6 stored variants clean; public copies; delete), photos-layout (no DB),
               timeline (signed in: seeded entries → real FTS, filters, months), timeline-layout (no DB),
               calendar (signed in: API counts, dot, Write about it), calendar-layout (no DB; also API 401s),
               notifications (signed in: live Realtime badge, Mark all read, application trigger, prefs), notifications-layout (no DB),
               foundation (signed in: real submit → admin flow), foundation-public (form, 429, 403), foundation-admin-layout (no DB)
  fixtures/    gps-exif.jpg (EXIF with GPS IFD, camera make, orientation 6); tests/metadata.ts shared checks
```

## Conventions

- Tokens: use Tailwind token classes (`bg-surface`, `text-muted`, `border-border-strong`, `rounded-card`,
  `shadow-glow`). No raw hex in components except one-off translucent overlays already in DESIGN.md.
- `--subtle` text only at ≥ 24 px. Placeholders are `--faint`.
- Type roles: `.page-title`, `.eyebrow`, `.serif` utilities (globals.css).
- Partner colour: partner A → accent, partner B → lavender. Components take `partner: "a" | "b"`.
- Never infer pronouns from names in UI copy — use names/nicknames ("Something only Kuleo needs to read…").
- Buttons default to `type="button"`; `asChild` for links.
- Every form control goes through `<Field>` (label, hint, error, aria wiring).
- Page width: `<PageContainer width="wide|medium|narrow">` = 1150 / 800 / 760 content.
- Mutations: server actions with Zod validation (from Phase 2 on). Service-role client only in
  `src/lib/supabase/service.ts`; ESLint blocks importing it outside `src/server`, `src/app/api`, `scripts`, `tests`.
- Server code that touches secrets imports `server-only`; library code tested by Vitest must not (it throws there).
- Auth errors are neutral (`AUTH_MESSAGES`): same text for an unknown email and a wrong password; the magic
  link always answers "If that email belongs to this diary…".
- Profiles carry `partner` ('a' | 'b') — use it for colours, never compare names.
- Content decisions: KJV (public domain); currency CAD only; public site open; time zone `America/Toronto`.

## Decisions log

| Date       | Decision                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| ---------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 2026-11-07 | Visuals follow the Nocturne artifact (dark, Instrument Serif / Geist / Geist Mono), confirmed by the user; overrides the master prompt's cream theme + Cormorant/Inter. PDF component specs fill gaps.                                                                                                                                                                                                                                                                      |
| 2026-11-07 | `--subtle` (#6F6880) restricted to large text for WCAG AA; small placeholders use `--faint`.                                                                                                                                                                                                                                                                                                                                                                                |
| 2026-11-07 | Sign out lives in the avatar account menu (Nocturne "Account and sign out"), as a POST form.                                                                                                                                                                                                                                                                                                                                                                                |
| 2026-11-07 | Breakpoint for top nav ↔ tab bar is 1024 px (`lg`). Phone "More" also contains Foundation + Calendar.                                                                                                                                                                                                                                                                                                                                                                       |
| 2026-11-07 | Toast built on Radix Toast (already in `radix-ui`), not `sonner` — no extra dependency.                                                                                                                                                                                                                                                                                                                                                                                     |
| 2026-11-07 | Faith icon is a custom Latin cross in Lucide style.                                                                                                                                                                                                                                                                                                                                                                                                                         |
| 2026-11-07 | Styleguide is dynamic and 404s in production unless `ENABLE_STYLEGUIDE=1`.                                                                                                                                                                                                                                                                                                                                                                                                  |
| 2026-11-07 | Security headers (nosniff, frame SAMEORIGIN, referrer, permissions) + `X-Robots-Tag: noindex` on /admin, /login, /styleguide from `next.config.ts`.                                                                                                                                                                                                                                                                                                                         |
| 2026-11-11 | User sent Phase 3 before Phase 2 existed; chose "Phase 2 first, then 3" — both built this session.                                                                                                                                                                                                                                                                                                                                                                          |
| 2026-11-11 | Supabase: a separate **cloud dev project** (no Docker on this PC), not `supabase start`. Supabase CLI not approved → migrations applied in the SQL Editor; types hand-written.                                                                                                                                                                                                                                                                                              |
| 2026-11-11 | Allowlist emails live in `admin_allowlist` (RLS on, no policies, no grants), written by the seed from `ADMIN_EMAILS` — never in git. A trigger rejects other emails on insert and on email change.                                                                                                                                                                                                                                                                          |
| 2026-11-11 | anon has no table privileges at all; it reads only `public_entries` / `public_photos` / `public_about` (owner-rights views, empty while the public site is off). Applicant inserts will use the service role.                                                                                                                                                                                                                                                               |
| 2026-11-11 | Author-only update/delete for entries and comments in RLS; profile updates limited by column grants (no role/partner/user_id).                                                                                                                                                                                                                                                                                                                                              |
| 2026-11-11 | FR-18 opt-ins: `entries.public_show_comments/location/mood`, default false. `profiles.partner` added for colours.                                                                                                                                                                                                                                                                                                                                                           |
| 2026-11-11 | Avatars: `photos-private/avatars/{user_id}/{uuid}.webp`, 512², via a server action (body limit 11 MB); JPEG/PNG/WebP only until the Phase 6 HEIC pipeline. Shown through 1-hour signed URLs.                                                                                                                                                                                                                                                                                |
| 2026-11-11 | Sessions: 30-day sliding auth cookie (FR-2). Magic links use `shouldCreateUser: false`; the email template uses token_hash so links work across devices.                                                                                                                                                                                                                                                                                                                    |
| 2026-11-11 | Deps added (approved): `@supabase/supabase-js`, `@supabase/ssr`, `zod`, `react-hook-form`, `@hookform/resolvers`, `sharp`, `date-fns(-tz)`, `server-only`. Stray `cn` package removed.                                                                                                                                                                                                                                                                                      |
| 2026-11-11 | Phase 4 prompt vs Nocturne: daily cards are a **2 × 2 grid** (prompt) not 3 + 1; the note composer card looks like Nocturne's inline textarea but **opens a dialog** (prompt); phone keeps the swipe row + dots.                                                                                                                                                                                                                                                            |
| 2026-11-11 | Home right side: days-together ring when `settings.anniversary` is set (Nocturne), otherwise the viewer's avatar (prompt/FR-5). Phone shows "Day n" in the eyebrow instead of the ring.                                                                                                                                                                                                                                                                                     |
| 2026-11-11 | Greeting and dates use the viewer's profile time zone; the daily pick uses the shared zone so both partners match. `KIND_OFFSET` = 0/7/13/19/29.                                                                                                                                                                                                                                                                                                                            |
| 2026-11-11 | Notes: list opens → markNotesRead; replies also set read_at. sendNote/replyNote insert `notifications` rows now (bell UI is Phase 9). Partner line uses names, never pronouns.                                                                                                                                                                                                                                                                                              |
| 2026-11-11 | Entry cards use token-coloured placeholders per category until photos arrive (Phase 6).                                                                                                                                                                                                                                                                                                                                                                                     |
| 2026-11-11 | Mood picker keeps Nocturne's coloured-dot tiles (DESIGN.md) rather than the prompt's "emoji tiles". Toggle buttons, so mood can be cleared.                                                                                                                                                                                                                                                                                                                                 |
| 2026-11-11 | Autosave runs only for drafts: at most every 5 s while typing + on field blur; needs a title first. A published entry changes only on Save entry (so half-edits never go public); beforeunload + the close-X dialog guard unsaved changes.                                                                                                                                                                                                                                  |
| 2026-11-11 | A new entry's first autosave creates the draft and swaps the URL to /admin/entries/[id]/edit (history.replaceState). Save entry publishes, sets the slug (title + 6 id chars) and notifies the partner once.                                                                                                                                                                                                                                                                |
| 2026-11-11 | Entry bodies: Tiptap JSON is re-sanitised on the server (allow-list) and rendered as React elements — never innerHTML. Pasted H1/H3… become H2; links only http(s)/mailto.                                                                                                                                                                                                                                                                                                  |
| 2026-11-11 | Soft delete sets deleted_at; restore within 30 days from the entry page or Drafts → "Recently deleted". Purging older rows is not built yet (cron, Phase 9/12). Comments are soft-deleted.                                                                                                                                                                                                                                                                                  |
| 2026-11-11 | Tiptap deps: @tiptap/react, @tiptap/pm, @tiptap/starter-kit (includes Link), @tiptap/extensions (Placeholder).                                                                                                                                                                                                                                                                                                                                                              |
| 2026-11-11 | Photo variants: `{"400"                                                                                                                                                                                                                                                                                                                                                                                                                                                     | "1200"             | "2400": {"webp","jpeg"}}`at`photos/{uid}/{photoId}/{size}.{webp                                           | jpg}`. Each size is resized straight from the source (no re-encoded intermediate). Transparent images flatten to white for JPEG. |
| 2026-11-11 | MIME sniffing hand-rolled from magic bytes (no `file-type` dependency). HEIC via heic-convert (serverExternalPackages). AVIF and animated images are refused.                                                                                                                                                                                                                                                                                                               |
| 2026-11-11 | Public copies (FR-28): `photos.public_variants` in photos-public under an unguessable `{photoId}-{24 hex}/` folder, created/removed by syncPublicCopies after photo toggles, entry save/delete/restore. `public_photos` exposes only these. Site switched off → views hide them, but copies stay at their unguessable URLs.                                                                                                                                                 |
| 2026-11-11 | Photo delete is permanent (row + private files + public copies); entry_photos cascade; affected covers move to the next photo where the deleter is the author.                                                                                                                                                                                                                                                                                                              |
| 2026-11-11 | The client uploads one file per request (XHR) for per-file progress; two in parallel. `taken_on` is not read from EXIF yet (exifr not approved) — the lightbox shows the upload date.                                                                                                                                                                                                                                                                                       |
| 2026-11-11 | Lightbox handles Esc itself: Radix makes a visible toast the top layer, which would swallow the first Esc. Toast text appears twice in the DOM (Radix announcer) — tests use `.first()`.                                                                                                                                                                                                                                                                                    |
| 2026-11-11 | Deps added (approved stack): `heic-convert`, dev `@types/heic-convert`.                                                                                                                                                                                                                                                                                                                                                                                                     |
| 2026-11-11 | Timeline search is one SQL function, `timeline_search()` (security invoker → RLS applies): words reduced to letters/digits, each a prefix term (`lak` finds lake, `walked` finds walking), max 10 words / 200 chars; stop-word-only input = no search. Month and total counts are window counts over the whole filtered set.                                                                                                                                                |
| 2026-11-11 | Timeline URL: `q, v (private                                                                                                                                                                                                                                                                                                                                                                                                                                                | public), author (a | b), mood (comma list), category (comma list), from, to (yyyy-mm-dd; reversed range is swapped), photos (1 | 0)`. Junk in the URL is ignored. Author filter uses partner keys, not names.                                                     |
| 2026-11-11 | The timeline controls stay mounted while the list re-keys on each URL change, so the search box keeps focus during the 300 ms debounce. ⌘K / Ctrl+K focuses search; Esc clears it. Phones show the lock/globe icon instead of the text pill.                                                                                                                                                                                                                                |
| 2026-11-11 | Calendar: today uses DESIGN.md's `--inverse` pill (light on the dark theme; the prompt's "dark pill" is the old cream theme). Special dates and the anniversary get a small lavender heart (prompt: heart; DESIGN: lavender for special dates).                                                                                                                                                                                                                             |
| 2026-11-11 | `settings.special_dates` shape: `[{ "date": "1994-11-18", "label": "Afeez’s birthday" }]`, repeating yearly; malformed items are skipped; 29 Feb → 28 Feb. The anniversary shows as "4th anniversary". Settings UI for both is Phase 11.                                                                                                                                                                                                                                    |
| 2026-11-11 | Calendar keyboard: arrows/Home/End move focus (crossing months loads that month), PageUp/PageDown = month, Shift+PageUp/Down = year, Enter/Space select. Only selection changes `day` in the URL; month changes drop `day`. Future days: no "Write about it".                                                                                                                                                                                                               |
| 2026-11-11 | API routes fail closed with 401 when Supabase env is missing (was a 500). Timeline filter clicks build on the latest requested filters, so quick successive clicks are never lost (regression test added).                                                                                                                                                                                                                                                                  |
| 2026-11-11 | Notifications: partner rows are written by the actions via `notifyPartner` (never fails the action); foundation applications notify BOTH admins from a DB trigger (no applicant name in the payload — applicants may be minors).                                                                                                                                                                                                                                            |
| 2026-11-11 | Emails are content-free ("D_Gal left you a note" + link); entry/note/comment words stay behind sign-in. The bell shows titles and short excerpts. No images or tracking in emails.                                                                                                                                                                                                                                                                                          |
| 2026-11-11 | Email prefs in `profiles.notify_prefs` (instant / daily / off per type). Defaults: entry + comment daily; note, note reply, application instant. Instant mails go out via `after()` once the response is sent; `emailed_at` prevents doubles; the daily digest also picks up instant mails that failed (15 min grace). Without RESEND_API_KEY nothing is sent.                                                                                                              |
| 2026-11-11 | Digest cron: Vercel Cron daily at 12:00 UTC (07:00 EST / 08:00 EDT). Route needs `Authorization: Bearer CRON_SECRET` (≥16 chars, timing-safe); fails closed.                                                                                                                                                                                                                                                                                                                |
| 2026-11-11 | Deps added (approved stack): `resend`, `@react-email/components`. Vitest compiles JSX (oxc) and aliases `server-only` to a stub.                                                                                                                                                                                                                                                                                                                                            |
| 2026-11-11 | Foundation submit is a route handler (`/api/foundation/apply`, multipart, files up to 5 × 10 MB), not a server action. Order: same-site → rate limit → Turnstile → Zod → documents cleaned in memory → only then any write (service role). Upload failure rolls back the row and its admin notifications.                                                                                                                                                                   |
| 2026-11-11 | Applicant rules: both consents required; at least one email (applicant or guardian) for the reference; under-18s need a guardian name + phone or email. Honeypot field. Amounts CAD, ≤ 100,000.                                                                                                                                                                                                                                                                             |
| 2026-11-11 | Documents: PDFs stored as sent; photos/scans (JPEG/PNG/WebP/HEIC) re-encoded to JPEG with metadata stripped (same rule as photos). Receipts likewise. Doc links are signed for 10 minutes.                                                                                                                                                                                                                                                                                  |
| 2026-11-11 | Status changes and payments go through SQL functions (security invoker) so the status and its application_events row are written together, with the admin as actor. Private notes are events with a note and no status. Payment only once Funded.                                                                                                                                                                                                                           |
| 2026-11-11 | Turnstile widget is hand-rolled (no dependency); without a secret the server accepts in dev and refuses in production. Rate limit via Upstash (`@upstash/ratelimit`, `@upstash/redis`), in-memory fallback. Client IP from X-Forwarded-For (set by Vercel).                                                                                                                                                                                                                 |
| 2026-11-11 | BUG FIXED: POST routes compared Origin to `nextUrl.origin`, which Next normalises (127.0.0.1 → localhost) — same-site posts were refused. Now `isSameOrigin()` (Origin host vs Host/X-Forwarded-Host) in sign-out, photo upload and foundation apply.                                                                                                                                                                                                                       |
| 2026-11-11 | Public foundation intro copy is placeholder text; data-retention period and a fuller privacy notice are still open (applicants may be minors).                                                                                                                                                                                                                                                                                                                              |
| 2026-11-12 | Bookshelf: ISBN lookup via Open Library (server-side fetch, 8 s timeout); unknown ISBN falls back to manual entry. Cover = Open Library image (only covers.openlibrary.org accepted, downloaded and re-encoded) or an upload through the photo pipeline (metadata stripped). Quotes: only the partner who added one can remove it.                                                                                                                                          |
| 2026-11-12 | About Us: editors save a draft; **Publish** copies it to `about_page.published_snapshot`, which is all the public `/` reads (migration 0009). Publishing marks the chosen hero / milestone / page photos `on_about` and makes public copies; photos dropped since the last publish go private again. Milestones sorted by date.                                                                                                                                             |
| 2026-11-12 | Public site switch (`settings.public_site_enabled`): off → every public page renders “Coming soon”, the `public_*` views return nothing and `/api/foundation/apply` answers 503. Public pages revalidate every 60 s, so the switch takes up to a minute. Without Supabase configured the site counts as on (empty pages).                                                                                                                                                   |
| 2026-11-12 | Public reads go through `createPublicClient()` (anon key, no session) and only the `public_*` views: public_site, public_entries, public_photos, public_entry_photos, public_comments, public_about. Comments show only if the author opted in (`show_comments`).                                                                                                                                                                                                           |
| 2026-11-12 | `robots.ts` disallows /admin, /login, /auth, /styleguide, /api; `sitemap.ts` lists /, /journal, /gallery, /foundation + public entry slugs (empty when the site is off). OG images via next/og with our tokens: a site card and one per public entry (title + date only). `public/robots.txt` deleted.                                                                                                                                                                      |
| 2026-11-12 | Data export: `GET /api/export` (signed-in admins only; 401 otherwise) streams a ZIP: `data.json` (every private table, read through the user's RLS session), `photos/*.jpg` (2400 px cleaned copies — originals are never kept, by design) and a README. Hand-rolled stored-mode ZIP writer (`src/lib/zip.ts`, CRC-32 tested) — no archiver/jszip dependency.                                                                                                               |
| 2026-11-12 | Settings also gained: anniversary + special dates, Bible translation + notice (`settings.bible_notice`, shown under Home's verse), the daily-words library (add / edit / turn off per kind; turned-off items are never picked).                                                                                                                                                                                                                                             |
| 2026-11-12 | e2e: `shell.spec.ts` split — admin-route and shell tests skip without Supabase; public routes, indexing and styleguide run signed out. The earlier “build hang” at Collecting page data was CPU contention from another project's build, not our code.                                                                                                                                                                                                                      |
| 2026-11-12 | Phase 12 choices (user): add `@axe-core/playwright` + `lighthouse` (dev only); domain **lawalsdiary.com**; backups = Supabase Free + nightly encrypted `pg_dump` via GitHub Actions (30-day artifacts) + monthly in-app ZIP for photos; big uploads = **shrink in the browser**.                                                                                                                                                                                            |
| 2026-11-12 | Browser shrink (`src/lib/images/shrink.ts`): photos/covers/receipts/foundation photos are redrawn to ≤ 2400 px JPEG (canvas also drops EXIF) so each request stays ≤ 4 MB (Vercel caps bodies at 4.5 MB). Avatars are cropped to ≤ 1024 px in the browser. Undecodable files (HEIC outside Safari) go as-is if ≤ 4 MB; the server still sniffs, converts and strips everything. Foundation attachments: 4 MB in total.                                                      |
| 2026-11-12 | Privacy suite `tests/e2e/privacy.spec.ts`: every admin page (found on disk) → 307 /login; forged cookie refused; every API refuses (401/403/405); every private table (select/insert/update/delete), photo_library, all RPCs, sign-up, and planted objects in private buckets (download, public/authenticated/signed URL, list, upload, overwrite, delete) denied for anon. Static test: every exported server action checks the session (found and fixed `loadTimeline`).  |
| 2026-11-12 | axe (WCAG 2.2 AA tags, serious+critical fail) on every public page and every /styleguide preview + three open dialogs at 375/1440. Fixed: note composer name (visible text first), swipe row keyboard-reachable region, 24 px page dots, email footer links underlined, rating `role=img`, turned-off library items use muted colours (not opacity).                                                                                                                        |
| 2026-11-12 | Lighthouse fixes: metadata rendered in `<head>` (`htmlLimitedBots: /.*/`); toast viewport mounted only while toasts exist; daily swipe row `scroll-px-5` (its 20 px load-time snap counted as a scroll and stopped LCP); Zod kept out of client bundles (schemas in `lib/validation/*`, client constants in `lib/photos.ts`, `lib/iso-date.ts`); note dialogs lazy + mounted on first open; first 6 thumbnails eager/high priority; `optimizePackageImports: ["radix-ui"]`. |
| 2026-11-12 | PWA: `app/manifest.ts` (start `/admin`, standalone), accent icons from `scripts/generate-icons.mjs` (192/512/maskable, apple-icon, icon.svg). `public/sw.js`: pages network-only with `/offline` fallback; caches only `/_next/static` + icons — never HTML, API or photos. Offline banner in the admin shell.                                                                                                                                                              |
| 2026-11-12 | Loading skeletons (`components/ui/skeleton.tsx`) for admin root, timeline, photos, entry, foundation, bookshelf. Error boundaries: admin (keeps shell), public, root, global — they show only Next's digest, never the error text. Admin 404 inside the shell. No loading.tsx on public dynamic routes: streaming would turn a real 404 into a 200 (admin `[id]` 404s are 200 + 404 UI — private, noindex).                                                                 |

## Known issues

- The old OneDrive folder is a stale copy — don't edit it. (Metadata routes `robots.ts`, `sitemap.ts`, OG images now work.)
- `npm run build` still deletes `.next` first (harmless; it was the OneDrive workaround).
- Vercel's 4.5 MB body cap is handled by shrinking in the browser (decision above). A PDF over 4 MB can't be sent
  to the foundation form; a HEIC photo over 4 MB from a non-Safari browser is refused with a clear message.
- Lighthouse mobile scores swing ±15 on this PC when other dev servers run; the script takes the median of 3.
- HEIC conversion is covered by unit tests only with a synthetic header (no real iPhone HEIC fixture available);
  try one real HEIC upload when Supabase is connected.
- `npm audit`: Next 15 bundles an old PostCSS (build-time only, processes our own CSS). Fix requires Next 16.

## Open items (defaults used until the user decides)

- Public photos: `photos-public` bucket with unguessable paths (DESIGN) vs signed URLs (PRD FR-28). Built: public bucket.
- Optional TOTP second factor (FR-4) not built.
- Supabase Free storage is 1 GB (≈ 700–1,000 photos at our 6 variants each); move to Pro when it fills.
- Foundation data-retention period and privacy notice (applicants may be minors) — the form shows a short neutral notice only.
- Not built (v1.2): web push (`web-push`), TOTP second factor. `exifr` was never approved — sharp metadata is used.
