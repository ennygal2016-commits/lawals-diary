# Lawal's diary — Design document

Sources: Part 2 of "Couple's Diary — PRD, Design Doc & Claude Code Build Prompt.pdf" (behaviour, layouts,
architecture, data, security) and the **Nocturne** design artifact "Couple's Diary — Nocturne.html" (visuals).
Renders of the six Nocturne boards are in `docs/screens/`.

**Visual decision (confirmed 2026-11-07):** the app uses Nocturne's dark palette and its fonts —
Instrument Serif, Geist and Geist Mono — instead of the PDF's cream theme with Cormorant Garamond and Inter.
Where Nocturne has no screen (Photos, Foundation, Bookshelf, Settings, Login), use the PDF's component specs below
translated into Nocturne tokens. **This file wins on visuals**; `PRD.md` wins on behaviour.

## 1. Design principles

The look is a night-time journal: a near-black page, a serif for anything emotional and a quiet sans for the
controls, mono for small labels. One pink accent for actions, lavender for the second partner, and very little
else.

- **Calm.** Generous space, one column of content at 760–1150 px, soft glows rather than heavy shadows.
- **Personal.** Serif headings and italic quotes make it read like a journal. Each partner has a colour.
- **Private by signal.** Every item carries a visibility badge (lock / globe + label) so visibility is never in doubt.
- **Thumb-first.** Primary actions are large, full width and sticky on phones.

## 2. Design tokens

Defined once as CSS variables in `src/app/globals.css` and mapped into Tailwind (`bg-surface`, `text-muted`,
`rounded-card`, …). `src/lib/design-tokens.ts` mirrors them for the styleguide; `tests/unit/tokens.test.ts`
fails if the two drift or if any text pair falls below WCAG AA.

### Colour

| Token                                 | Value                 | Use                                                                                             | Contrast on `--bg` |
| ------------------------------------- | --------------------- | ----------------------------------------------------------------------------------------------- | ------------------ |
| `--bg`                                | `#0E0C14`             | Page background                                                                                 | —                  |
| `--surface`                           | `#15121C`             | Cards and panels                                                                                | —                  |
| `--raised`                            | `#17141F`             | Inputs, icon buttons                                                                            | —                  |
| `--overlay`                           | `#1C1826`             | Menus, dialogs, subtle buttons                                                                  | —                  |
| `--note`                              | `#1A1420`             | Highlighted note card                                                                           | —                  |
| `--selected`                          | `#1F1A28`             | Selected tile fill                                                                              | —                  |
| `--placeholder-tint`                  | `#1D1826`             | Photo placeholder                                                                               | —                  |
| `--border`                            | `#2A2535`             | Card and input borders                                                                          | —                  |
| `--border-strong`                     | `#2E2838`             | Chips, featured card, timeline rail                                                             | —                  |
| `--border-accent`                     | `#3A2F45`             | Note composer, dialogs, CTA panels                                                              | —                  |
| `--border-muted`                      | `#3A3345`             | Subtle pill buttons, dashed empty states                                                        | —                  |
| `--border-dashed`                     | `#4A4356`             | Dashed "add" tiles, More filters                                                                | —                  |
| `--divider`                           | `#241F2E`             | Header bottom, month heading rule                                                               | —                  |
| `--divider-soft`                      | `#1E1A26`             | List row dividers                                                                               | —                  |
| `--fg`                                | `#F2EDF5`             | Body text and headings                                                                          | 16.8               |
| `--fg-soft`                           | `#C9C2D3`             | Nav links, secondary copy                                                                       | 11.2               |
| `--muted`                             | `#A49DB0`             | Eyebrows, meta                                                                                  | 7.4                |
| `--faint`                             | `#8E879A`             | Timestamps, counters, **placeholders**                                                          | 5.6                |
| `--subtle`                            | `#6F6880`             | **Large text only (≥ 24 px)**: de-emphasised year, title placeholder                            | 3.7                |
| `--accent`                            | `#FF8A9B`             | Partner A, primary buttons, links, active nav, entry dots, focus ring                           | 8.7                |
| `--accent-hover`                      | `#FFB3BE`             | Hover                                                                                           | —                  |
| `--accent-ink`                        | `#1A0E12`             | Text on accent fills                                                                            | 8.4 on accent      |
| `--accent-soft`                       | `#2A1E28`             | Active nav pill, hover pill                                                                     | —                  |
| `--lavender`                          | `#B9A6FF`             | Partner B, unread badge, public, special dates                                                  | 9.2                |
| `--lavender-ink`                      | `#140F22`             | Text on lavender                                                                                | 8.9 on lavender    |
| `--lavender-soft` / `--lavender-text` | `#221D33` / `#D9CEFF` | Partner B avatar fill / initial                                                                 | 11.0               |
| `--success`                           | `#7EE0B5`             | "Draft saved", live dot                                                                         | 12.2               |
| `--warning`                           | `#FFC98A`             | Warnings                                                                                        | —                  |
| `--danger` / `--danger-soft`          | `#FF6B6B` / `#2C1517` | Delete, errors                                                                                  | 7.0                |
| `--inverse` / `--inverse-ink`         | `#F2EDF5` / `#0E0C14` | Selected chips, today pill, quick-write, toast (the dark-theme equivalent of the PDF's `--ink`) | 16.8               |

**Accessibility adjustment:** Nocturne uses `#6F6880` for input placeholders and future calendar days, which is
3.3–3.7:1 — below AA for normal text. Rule: `--subtle` only on text ≥ 24 px (the "2026" in month headings, the
34 px title placeholder). Normal-size placeholders and dimmed calendar numbers use `--faint` (≥ 5.0:1).
Borders (`--border`, `--border-strong`) are below 3:1 by design; controls are identified by their filled
background and label, and the focus ring (accent, ≥ 7.7:1 on every surface) carries the non-text contrast.

**Partner colours:** partner A (Nurat) is `--accent` pink; partner B (Afeez) is `--lavender`. Used for avatars,
initial chips, timeline rail dots, milestone dots, and the italic nickname in greetings and note headings.

**Moods** (dot + label, never colour alone): Loved `#FF8A9B` · Happy `#FFC98A` · Calm `#7EC8E0` ·
Excited `#B9A6FF` · Funny `#7EE0B5` · Tired `#8E879A` · Bittersweet `#D6A3C9` · Sad `#6F8FD1`.
Nocturne replaces the PDF's emoji with these dots.

### Radius, shadow, spacing

| Token                  | Value                            | Use                                   |
| ---------------------- | -------------------------------- | ------------------------------------- |
| `rounded-input`        | 10 px                            | Inputs, selects                       |
| `rounded-btn`          | 12 px                            | Buttons, icon buttons, menus, toasts  |
| `rounded-btn-lg`       | 14 px                            | 56 px buttons, mood tiles, search box |
| `rounded-card`         | 20 px                            | Cards                                 |
| `rounded-panel`        | 24 px                            | Scripture card, phone tab bar         |
| `rounded-hero`         | 28 px                            | Public hero photo, CTA panel          |
| `rounded-full`         | 999 px                           | Chips, pills, avatars                 |
| `shadow-menu`          | `0 12px 32px rgba(0,0,0,.45)`    | Dropdowns and dialogs                 |
| `shadow-fab`           | `0 8px 30px rgba(0,0,0,.5)`      | Quick-write, toasts                   |
| `shadow-glow`          | `0 0 24px rgba(255,138,155,.35)` | Primary buttons                       |
| `shadow-glow-lavender` | `0 0 32px rgba(185,166,255,.35)` | Lavender CTA                          |

Spacing: 4 px base — 4, 8, 12, 16, 24, 32, 48, 64.

### Type

| Role                                                       | Font                                                | Size / weight                                   |
| ---------------------------------------------------------- | --------------------------------------------------- | ----------------------------------------------- |
| Page title ("Timeline", "Calendar") — `.page-title`        | Instrument Serif                                    | 64 px desktop / 44 px phone, 400, line-height 1 |
| Greeting ("Good evening, _Kuleo._")                        | Instrument Serif, nickname italic in partner colour | clamp(44, 6vw, 72) desktop / 42 phone           |
| Public hero names                                          | Instrument Serif, "&" italic accent                 | clamp(56, 11vw, 148)                            |
| Wordmark "Lawal's diary"                                   | Instrument Serif                                    | 26 px desktop / 22 px phone                     |
| Section heading ("Recently", "Milestones")                 | Instrument Serif                                    | 34–44 px                                        |
| Month heading ("November 2026")                            | Instrument Serif                                    | 32 px                                           |
| Scripture quote                                            | Instrument Serif italic                             | clamp(28, 3.4vw, 42) / 26 phone                 |
| Daily-card quote                                           | Instrument Serif italic                             | 25 px / 20 phone                                |
| Card title (entry cards)                                   | Instrument Serif                                    | 24 px / 20 phone                                |
| Eyebrow ("SCRIPTURE FOR TODAY", field labels) — `.eyebrow` | Geist Mono                                          | 12 px / 11 phone, 0.14em, uppercase, `--muted`  |
| Body and controls                                          | Geist                                               | 16 px (nav 15 px), 400–600                      |
| Row title (timeline)                                       | Geist                                               | 17 px / 500                                     |
| Meta ("Mon 2 · Everyday · 2 comments")                     | Geist 13 px `--muted`; dates in Geist Mono          |                                                 |
| Counters, timestamps, refs                                 | Geist Mono                                          | 11–14 px                                        |

Icons: Lucide, 16–18 px, stroke 1.75; accent in card eyebrows, `--muted` elsewhere. Faith uses a custom Latin
cross drawn in Lucide's style (Lucide's "Cross" is a medical plus).

## 3. Components

All live in `src/components/ui` (shadcn/ui structure, Radix primitives from `radix-ui`) and are shown on
`/styleguide`.

| Component                         | Spec                                                                                                                                                                                                                                                                                                                                                                                            |
| --------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Top bar                           | ≥ 1024 px: sticky, `rgba(14,12,20,.78)` + 16 px blur, 1 px `--divider` bottom. Content width 1240. Wordmark (rings + name), nav pills 15 px (active: `--accent-soft` pill, `--accent` text, 500), More ▾, then **+ New entry** (primary), bell (44 px raised square, lavender unread badge), avatar (account menu: Settings, Sign out). < 1024 px: wordmark, bell and avatar only (not sticky). |
| More menu / dropdown              | 200 px wide, `--overlay`, 1 px border, 12 px radius, `shadow-menu`. Icon + label rows 44 px. Closes on outside click and Esc; arrow keys move.                                                                                                                                                                                                                                                  |
| Bottom tab bar                    | < 1024 px. Floating 68 px bar, 12 px from the sides, 16 px from the bottom (+ safe area), 24 px radius, `rgba(28,24,38,.88)` + blur, `--border-strong`. Home · Timeline · **+** (52 px accent square, 18 px radius, glow) · Photos · More (menu opens upward: Foundation, Calendar, Bookshelf, Drafts, About Us editor, Settings). Hidden on the entry form.                                    |
| Floating quick-write              | `--inverse` circle with a dark pen-line icon, bottom-left: 56 px at 24 px desktop; 52 px at 20 px left / 100 px bottom on phones (above the tab bar). Hidden on the entry form.                                                                                                                                                                                                                 |
| Primary button                    | `--accent` fill, `--accent-ink` 15 px / 600 text, 12 px radius, 44 px tall (56 lg, 60 full width with 16 px radius), accent glow.                                                                                                                                                                                                                                                               |
| Secondary button                  | Transparent, 1 px `--accent` border, `--accent` text ("Send note", "Write about it", "Upload").                                                                                                                                                                                                                                                                                                 |
| Ghost / subtle / inverse / danger | Ghost: `--fg-soft` text, raised hover. Subtle: 36 px pill, `--overlay` fill, `--border-muted` ("Reply once"). Inverse: light fill. Danger: `--danger` border + text.                                                                                                                                                                                                                            |
| Chip / segmented filter           | 40 px pill, 1 px `--border-strong`, `--fg-soft` 14 px / 500. Selected: `--inverse` fill, `--inverse-ink` text. Counts in mono brackets: "New (0)". "More filters" is dashed. Toolbar semantics with `aria-pressed`; ← → move focus.                                                                                                                                                             |
| Input                             | `--raised` fill, 1 px `--border`, 10 px radius, 48 px tall, 15 px text, `--faint` placeholder. Labels are eyebrows above the field.                                                                                                                                                                                                                                                             |
| Title input                       | Borderless with a 1 px `--border-strong` underline, Instrument Serif 34 px, italic `--subtle` placeholder "Give the day a name".                                                                                                                                                                                                                                                                |
| Textarea                          | `--bg` well inside a card, 1 px border, 12 px radius, 14 × 16 padding; mono "0 / 1000" counter.                                                                                                                                                                                                                                                                                                 |
| Select                            | Same box as Input; menu like the dropdown, 44 px items, accent check.                                                                                                                                                                                                                                                                                                                           |
| Card                              | `--surface`, 1 px `--border`, 20 px radius, 28 px padding (20 phone). Variants: featured (scripture: 24 px radius, `--border-strong`, 40 × 44 padding, decorative concentric circles top-right), accent border.                                                                                                                                                                                 |
| Daily card                        | Eyebrow row with an accent Lucide icon, then the italic serif text, then the attribution in `--accent` 14 px (mono for scripture references); scripture adds the licence notice in `--faint` on the right. Desktop grid: `repeat(auto-fit, minmax(280px, 1fr))` (3 + 1 at 1150). Phone: horizontal swipe row of 250 px cards with page dots (Phase 4).                                          |
| Note card                         | Composer: accent-bordered card, serif "Leave a note for _Kuleo_" heading (nickname italic in partner colour), textarea, counter, secondary Send note. Received note: 2 px partner-colour left rule, italic serif quote, mono timestamp, subtle "Reply once".                                                                                                                                    |
| Mood picker                       | 4 × 2 grid of 72 px tiles, 14 px radius, `--surface`, 1 px `--border`; each a 14 px mood dot over a 12 px label. Selected: 2 px border in the mood colour, `--selected` fill, dot glow.                                                                                                                                                                                                         |
| Timeline row                      | Rail on the left (1 px `--border-strong`) with a 10 px ring dot in the author's colour; 64 px thumbnail (10 px radius, tint when no photo), title 17 px / 500, meta row with initial chip, mono weekday + day, category, comment count; visibility pill (mono 11 px uppercase, 32 px) on the right. 1 px `--divider-soft` rows.                                                                 |
| Entry card (Home "Recently")      | 180 px photo area with an overlay visibility pill bottom-left, then serif 24 px title, initial chip, mono date, mood dot + label on the right.                                                                                                                                                                                                                                                  |
| Photo tile                        | Square, 8 px radius, `object-fit: cover`, 24 px blurred dark circle with lock / globe bottom-left.                                                                                                                                                                                                                                                                                              |
| Calendar cell                     | 48 px tall cell; number in a 34 × 30 pill. Today: `--inverse` pill, 600. Selected: 1.5 px `--accent` ring. Entry: 4 px `--accent` dot under the number; special date: `--lavender` dot. Legend under the grid. Future days use `--faint`.                                                                                                                                                       |
| Visibility badge                  | pill (timeline), overlay (on photos), icon (photo tiles). Always icon + "Private"/"Public" text or an accessible label.                                                                                                                                                                                                                                                                         |
| Avatar / initial chip             | Round, 1 px border in partner colour; avatar 44 px with soft partner fill; initial chip 22–24 px.                                                                                                                                                                                                                                                                                               |
| Empty state                       | Centred `--muted` 15 px text and one secondary button. Panel (surface fill) or dashed (`--border-muted`, optional icon — calendar, foundation).                                                                                                                                                                                                                                                 |
| Toast                             | Bottom centre (above the tab bar on phones), `--inverse` fill, `--inverse-ink` text, 12 px radius, 4 s, dismiss button. Error variant: `--danger` border on `--danger-soft`.                                                                                                                                                                                                                    |
| Dialog                            | `--surface`, 1 px `--border-accent`, 20 px radius, max 520 px, blurred `rgba(14,12,20,.72)` overlay, serif 30 px title, 44 px close button.                                                                                                                                                                                                                                                     |
| Focus                             | Every interactive element: 2 px `--accent` outline, 2 px offset (`:focus-visible`).                                                                                                                                                                                                                                                                                                             |

## 4. Page layouts

Widths are **content** widths (side padding 20 px phone, 32 px desktop, added outside).

| Page                                         | Route                                                                  | Layout                                                                                                                                                                                                                                                                                                                                                                                  |
| -------------------------------------------- | ---------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Home                                         | `/admin`                                                               | 1150. Eyebrow date line with a live dot, greeting with the nickname, "{partner} wrote … ago" line; days-together ring card on the right. Full-width scripture card, daily-card grid, note composer + note lists side by side (stacked on phones), full-width New entry, "Recently" grid of 6 (auto-fit 300 px). Phone: swipe row of daily cards, latest note card, compact recent list. |
| New / edit entry                             | `/admin/entries/new`, `/admin/entries/[id]/edit`                       | 760. Close (X) top-left, "Draft saved · 12:11" (success) top-right. Title, Date + Location side by side, Mood, Category, Photos ("n / 20 · GPS removed"), What happened, then a sticky bottom bar with the Private/Public toggle and Save entry.                                                                                                                                        |
| Entry                                        | `/admin/entries/[id]`                                                  | 760. Cover photo, title, meta, body, photos, comments.                                                                                                                                                                                                                                                                                                                                  |
| Timeline                                     | `/admin/timeline`                                                      | 760. Title with "412 ENTRIES · NURAT 214 · AFEEZ 198" on the right, search (52 px, ⌘K hint), chips + More filters, month groups with the rail.                                                                                                                                                                                                                                          |
| Photos                                       | `/admin/photos`                                                        | 1150. Title with Upload on the right, filter chips, count, grid.                                                                                                                                                                                                                                                                                                                        |
| Foundation                                   | `/admin/foundation`, `/admin/foundation/[id]`                          | 800. Intro, status chips, search + level select + Search, list or empty state.                                                                                                                                                                                                                                                                                                          |
| Calendar                                     | `/admin/calendar?month=2026-11&day=3`                                  | 760. Month heading with year in `--subtle`, round prev/next buttons, grid card, legend, selected-day panel.                                                                                                                                                                                                                                                                             |
| Bookshelf, Drafts, About Us editor, Settings | `/admin/bookshelf`, `/admin/drafts`, `/admin/about`, `/admin/settings` | 760 (Bookshelf 1150).                                                                                                                                                                                                                                                                                                                                                                   |
| Public                                       | `/`, `/journal`, `/journal/[slug]`, `/gallery`, `/foundation`          | Header 1240 with right-aligned links (active: 1 px accent underline). Our story: centred hero with two faint rings behind "Nurat _&_ Afeez", tagline, 1150 hero photo (28 px radius), 720 story column, milestones row with rail and partner-colour dots, gallery strip, lavender foundation CTA panel, mono footer.                                                                    |
| Login                                        | `/login`                                                               | 440, centred.                                                                                                                                                                                                                                                                                                                                                                           |

## 5. Stack

Next.js 15 (App Router) + React 19 + TypeScript strict · Tailwind CSS v4 + shadcn/ui (`radix-ui`) + Lucide ·
Supabase (Postgres, Auth, Storage, RLS) via `@supabase/ssr` · Tiptap (StarterKit + Link) · sharp + heic-convert ·
Zod + React Hook Form · date-fns + date-fns-tz · Resend + React Email · Cloudflare Turnstile · Upstash rate limit ·
Vitest + Playwright · Vercel.

## 6. Architecture

Browsers reach only the Next.js app. It reads and writes Supabase **as the signed-in user**, so row-level
security applies to every query. The service-role key is used only in server code that must act without a user
(the public foundation form, crons) and lives in `src/lib/supabase/service.ts`, which ESLint forbids importing
from client code. Photos pass through the upload route, which strips metadata before anything reaches storage.

## 7. Data model

All tables have `id uuid primary key default gen_random_uuid()`, `created_at` and `updated_at`.

| Table                     | Key columns                                                                                                                                                                                                                                                                             |
| ------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `profiles`                | `user_id` (FK auth.users), `display_name`, `nickname`, `avatar_path`, `timezone`, `notify_prefs jsonb`, `role ('admin')`                                                                                                                                                                |
| `entries`                 | `author_id`, `title`, `entry_date date`, `location`, `mood` enum, `category` enum, `body_json jsonb`, `body_text`, `visibility ('private' \| 'public')`, `status ('draft' \| 'published')`, `slug`, `cover_photo_id`, `deleted_at`, `search tsvector` (generated)                       |
| `photos`                  | `uploader_id`, `storage_path`, `variants jsonb`, `width`, `height`, `caption`, `taken_on date`, `in_gallery bool`, `on_about bool`, `deleted_at`                                                                                                                                        |
| `entry_photos`            | `entry_id`, `photo_id`, `position`                                                                                                                                                                                                                                                      |
| `comments`                | `entry_id`, `author_id`, `body`, `deleted_at`                                                                                                                                                                                                                                           |
| `notes`                   | `from_id`, `to_id`, `body`, `read_at`, `reply_body`, `replied_at`                                                                                                                                                                                                                       |
| `notifications`           | `user_id`, `type`, `payload jsonb`, `read_at`                                                                                                                                                                                                                                           |
| `daily_content`           | `kind ('scripture' \| 'romance' \| 'love' \| 'faith' \| 'encouragement')`, `text`, `attribution`, `reference`, `translation`, `active bool`                                                                                                                                             |
| `books`                   | `title`, `author`, `isbn`, `cover_path`, `status`, `readers uuid[]`, `started_on`, `finished_on`, `rating`, `notes`                                                                                                                                                                     |
| `book_quotes`             | `book_id`, `text`, `page`, `added_by`                                                                                                                                                                                                                                                   |
| `about_page`              | single row: `hero_photo_id`, `story_json`, `milestones jsonb`, `photo_ids uuid[]`, `published_at`                                                                                                                                                                                       |
| `foundation_applications` | `reference` (unique), applicant and guardian fields, `school`, `level` enum, `class_year`, `amount_requested`, `currency` (default and only value `'CAD'`), `reason`, `status` enum (new, reviewing, shortlisted, approved, declined, funded), `amount_paid`, `paid_on`, `receipt_path` |
| `application_documents`   | `application_id`, `storage_path`, `mime`, `size`                                                                                                                                                                                                                                        |
| `application_events`      | `application_id`, `actor_id`, `from_status`, `to_status`, `note`                                                                                                                                                                                                                        |
| `settings`                | single row: `anniversary`, `bible_translation` (default KJV), `public_site_enabled`, `special_dates jsonb`                                                                                                                                                                              |

The daily pick is `content[(days since 2020-01-01 + kind offset) mod count]` over active rows of that kind,
ordered by id, computed in the shared time zone (`America/Toronto`) so both partners see the same items.

## 8. Security and privacy rules

- `is_admin()` returns true when `auth.uid()` is in `profiles` with role admin. Every private table has RLS:
  `using (is_admin())` for select, insert, update and delete.
- Public reads go through views: `public_entries` (published, public, not deleted), `public_photos` (gallery,
  about, or attached to a public entry) and `public_about`. Anonymous users can select from these views and
  nothing else.
- `foundation_applications`: anonymous users can insert only, through a server action that checks Turnstile and
  a rate limit (5 per IP per hour). They can never select.
- Storage buckets: `photos-private` (admins only, short-lived signed URLs), `photos-public` (copies of public
  photos, CDN-cached) and `foundation-docs` (admins only).
- Image pipeline: decode → rotate by orientation → strip all metadata → resize to 400, 1200 and 2400 px →
  encode WebP and JPEG → store. The original is never stored with its metadata.
- Admin routes are protected by middleware and send `X-Robots-Tag: noindex` (already sent by `next.config.ts`
  from Phase 1). The sign-up endpoint is disabled. A database trigger rejects new `auth.users` rows outside the
  two-email allowlist.

## 9. Server actions and routes

| Action / route                                                                              | Purpose                                                     |
| ------------------------------------------------------------------------------------------- | ----------------------------------------------------------- |
| `createEntry`, `updateEntry`, `deleteEntry`, `restoreEntry`, `autosaveDraft`                | Entries                                                     |
| `POST /api/photos/upload`                                                                   | Multipart upload, processing, returns photo records         |
| `updatePhoto`, `deletePhoto`                                                                | Caption and visibility flags                                |
| `addComment`, `deleteComment`                                                               | Comments                                                    |
| `sendNote`, `replyNote`, `markNoteRead`                                                     | Notes                                                       |
| `markNotificationsRead`                                                                     | Bell                                                        |
| `submitApplication` (public), `setApplicationStatus`, `addApplicationNote`, `recordPayment` | Foundation                                                  |
| `upsertBook`, `addQuote`                                                                    | Bookshelf                                                   |
| `saveAbout`, `publishAbout`                                                                 | About Us editor                                             |
| `updateProfile`, `updateSettings`, `upsertDailyContent`, `exportData`                       | Settings                                                    |
| `GET /api/calendar?month=YYYY-MM`                                                           | Days with entries for the dots                              |
| `GET /api/cron/digest` (Vercel Cron)                                                        | Daily email digest                                          |
| `POST /auth/signout`                                                                        | Sign out (placeholder redirect in Phase 1; real in Phase 3) |
