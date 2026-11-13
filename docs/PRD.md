# Lawal's diary — Product Requirements

Source: Part 1 of "Couple's Diary — PRD, Design Doc & Claude Code Build Prompt.pdf" (repo root), with the
placeholders filled in and the open questions answered. **This file wins on behaviour**; `DESIGN.md` wins on
visuals.

| Placeholder      | Value                                                      |
| ---------------- | ---------------------------------------------------------- |
| Site name        | Lawal's diary                                              |
| Partner A        | Nurat — nickname **D_Gal** — accent (pink)                 |
| Partner B        | Afeez — nickname **Kuleo** — lavender                      |
| Emails           | In the `ADMIN_EMAILS` env var only (never committed)       |
| Shared time zone | `America/Toronto` (Eastern; EST/EDT handled automatically) |
| Domain           | Decided in Phase 12 (`NEXT_PUBLIC_SITE_URL` until then)    |

## Answered open questions (2026-11-07)

- **Bible translation:** King James Version (public domain). Notice line: "King James Version — public domain."
- **Public site:** open to anyone, no family password. It can still be switched off in Settings ("Coming soon").
- **Foundation currency:** CAD only. No currency picker; the `currency` column stays (always `CAD`) so another
  currency could be added later without a migration.

## 1. Vision

Lawal's diary is a private, faith-centred diary that two spouses keep together. It records the days of their
relationship, holds their photos, and sends small daily words of scripture, romance and encouragement. It can
show a curated part of their story to family and friends, and it runs a scholarship foundation in their name.

## 2. Users

| User                             | Access                                                       | Main jobs                                                                                                |
| -------------------------------- | ------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------- |
| Partner A and Partner B (admins) | Full access to `/admin` after sign-in. Exactly two accounts. | Write and read entries, upload photos, leave notes, review foundation applications, edit the public site |
| Public visitor (family, friends) | Public pages only, no account                                | Read the About Us story, browse public entries and the gallery                                           |
| Foundation applicant             | Public application form, no account                          | Apply for a scholarship or school-fees support, get a reference number                                   |

There is no self-service sign-up. Both admin accounts are created by a seed script or an invite link that only
works for the two allowed emails.

## 3. Goals and non-goals

Goals:

- Writing an entry takes under 60 seconds on a phone.
- Every day the home page offers something new to read: a scripture verse, a romance line, a love prompt, a
  faith line and an encouragement.
- Nothing is public unless one of you marks it public. Private is the default everywhere.
- Photos are stripped of GPS and other EXIF data before they are stored.
- Each of you sees what the other wrote and gets notified of it.

Non-goals for v1: more than two admins, native mobile apps, end-to-end encryption, payments through the site,
social sharing.

## 4. Information architecture

**Admin navigation (top bar):** Home · Timeline · Photos · Foundation · Calendar · More (Bookshelf, Drafts,
About Us editor, Settings), then the **+ New entry** button, a notifications bell, and the account menu (avatar)
holding Settings and **Sign out**. Below 1024 px the bar collapses into a bottom tab bar (Home, Timeline, +,
Photos, More); on phones "More" also holds Foundation and Calendar.

**Public navigation:** Our story (About Us) · Journal (public entries) · Gallery · Foundation (apply).

## 5. Functional requirements

### 5.1 Authentication and accounts

- **FR-1.** Email magic link and email + password sign-in, with an allowlist of exactly two emails. Any other
  email is rejected with a neutral message.
- **FR-2.** Sessions last 30 days on a trusted device. Sign out ends the session on that device.
- **FR-3.** Each profile has a display name, a nickname the partner sees (D_Gal, Kuleo), an avatar, a time zone
  and notification preferences.
- **FR-4.** Optional: a second factor (TOTP) in Settings.

### 5.2 Home dashboard

- **FR-5.** Header: today's date ("Tuesday 3 November") and a greeting by local time (Good morning before 12:00,
  Good afternoon before 17:00, Good evening after) with the user's nickname. The user's avatar sits on the right.
- **FR-6.** Scripture for today: one verse with its reference and translation, chosen deterministically by date
  so both of you see the same verse. Show the translation's notice under the card.
- **FR-7.** Four smaller cards: Romance for today (a quote with attribution, e.g. a public-domain sonnet), Love
  for today (a small action prompt), Faith for today, Encouragement for today. All are chosen by date from
  curated libraries that admins can edit in Settings.
- **FR-8.** Leave a note for {partner nickname}: a short composer (max 1,000 characters). The partner is notified
  and can reply once to mark the note "answered".
- **FR-9.** Two collapsible lists: "Earlier notes from {partner} (n)" and "Notes you sent (n · m answered)".
- **FR-10.** A full-width + New entry button, then the 6 most recent entries as cards (cover photo, title,
  author, date, mood).
- **FR-11.** A floating quick-write button (pencil, bottom-left) on every admin page opens the new-entry form.
- **FR-12.** Optional extras: "On this day" (entries from the same date in earlier years) and a days-together
  counter from a set anniversary date. (Nocturne shows the days-together ring on Home — build it in Phase 4.)

### 5.3 Entries

- **FR-13.** Fields: Title (required, max 120 characters, placeholder "Give the day a name"), Date (defaults to
  today, any past date allowed), Location (free text, placeholder "Where were you?"), Mood (optional, one of
  Loved, Happy, Calm, Excited, Funny, Tired, Bittersweet, Sad), Category (one of Everyday (default), Date night,
  Travel, Milestone, Food, Family, Other), Photos (0–20), What happened? (rich text), Visibility (Private by
  default, or Public).
- **FR-14.** The rich-text editor supports bold, italic, H2, bullet list, quote and link. Paste strips foreign
  styling. Images go only through the Photos field.
- **FR-15.** Autosave a draft every 5 seconds after a change and on blur. Drafts appear under More → Drafts until
  published. A sticky Save entry button sits at the bottom of the form.
- **FR-16.** An entry page shows the cover photo, title, date, location, mood, category, author chip and body,
  then the photo strip, then comments. The author can edit or delete it. Deletion is soft, with 30 days to
  restore.
- **FR-17.** Comments: either partner can comment on any entry. The other partner is notified. Comment counts
  show on the timeline.
- **FR-18.** Public entries show on the public Journal without comments, location or mood unless the author opts
  in.

### 5.4 Timeline

- **FR-19.** A search box does full-text search over title, body and location.
- **FR-20.** Visibility chips: All · Private · Public. More filters opens author, mood, category, date range and
  "has photos".
- **FR-21.** Entries are grouped by month ("November 2026") with an entry count per month and listed newest
  first. Each row shows the thumbnail, title, author initial chip, weekday and day, category, comment count and
  the visibility badge.
- **FR-22.** Infinite scroll in pages of 30. Filters live in the URL so a view can be bookmarked.

### 5.5 Photos

- **FR-23.** Upload accepts JPEG, PNG, HEIC and WebP up to 25 MB each, several at once, by drag and drop or
  picker. HEIC is converted to JPEG.
- **FR-24.** Server-side processing strips all EXIF, including GPS, and keeps only orientation (applied to the
  pixels). It makes three sizes: 400 px, 1200 px and 2400 px, as WebP plus a JPEG fallback. The UI says
  "Location data is removed on upload".
- **FR-25.** Filter chips: All · In gallery · On About page · In public entries · Private, with a total count
  ("56 photos").
- **FR-26.** A square grid of 5 columns on desktop, 3 on tablet and 2 on phone. Each tile carries a visibility
  badge.
- **FR-27.** A lightbox with keyboard and swipe navigation shows caption, date, the linked entry and toggles for
  "Show in public gallery" and "Use on About page". Delete is here too.
- **FR-28.** A photo is public only if it is in the gallery, on the About page, or attached to a public entry.
  Private photos are never reachable without a session.

### 5.6 Calendar

- **FR-29.** A month grid starting on Monday with previous and next arrows. Today is a filled pill. A small accent
  dot marks days with at least one entry.
- **FR-30.** Selecting a day shows that day's entries below the grid. An empty day shows "Nothing written on this
  day." with a Write about it button that opens the new-entry form pre-filled with that date.
- **FR-31.** Optional: anniversaries and birthdays (set in Settings) are marked (Nocturne: a lavender dot, with a
  legend).

### 5.7 Foundation

- **FR-32.** The public page explains the scholarship and offers an application form: applicant name, date of
  birth, contact phone and email, guardian details, school name, level (Primary, Secondary, Tertiary,
  Vocational), class or year, amount requested (CAD), reason (up to 2,000 characters), supporting documents (PDF
  or image, up to 5 files of 10 MB each), and consent checkboxes. Protected with Cloudflare Turnstile and rate
  limiting.
- **FR-33.** On submit the applicant sees a reference number (e.g. `FDN-2026-0042`) and gets a confirmation email.
  Both admins get a notification.
- **FR-34.** Admin list: status chips with counts — All · New · Reviewing · Shortlisted · Approved · Declined ·
  Funded (paid). Search by name, reference or school, and filter by level. The empty state reads "No applications
  yet".
- **FR-35.** Application detail: every field, the documents, a status changer, private admin notes, and for Funded
  a record of the amount paid, date and receipt upload. Each status change is logged with who made it and when.
- **FR-36.** Only the two admins can see applications. Documents sit in a private storage bucket.

### 5.8 Bookshelf

- **FR-37.** Books you read together or apart: title, author, cover (looked up by ISBN through Open Library, or
  uploaded), status (Want to read, Reading, Finished), who is reading, start and finish dates, rating 1–5, notes
  and favourite quotes.
- **FR-38.** Shown as a shelf of covers grouped by status.

### 5.9 About Us editor

- **FR-39.** Edits the public story page: hero photo, couple names, an "our story" rich-text body, a list of
  milestones (date, title, short text, optional photo) and photos chosen from the library. Has Preview and
  Publish buttons.

### 5.10 Notifications

- **FR-40.** In-app notifications (bell with an unread count) for a new entry by the partner, a comment, a note,
  a note reply and a new foundation application.
- **FR-41.** Email digests (instant, daily or off, per type) and optional web push. Each partner sets these in
  Settings.

### 5.11 Settings

- **FR-42.** Profile, nickname, avatar, time zone, notification preferences, anniversary date, the daily-content
  libraries (add, edit or disable verses, quotes and prompts), the Bible translation, the public site on/off
  switch, a data export (ZIP of JSON plus original photos) and the danger zone.

## 6. Non-functional requirements

| Area              | Requirement                                                                                                                                                       |
| ----------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Privacy           | Private by default. Row-level security in the database, so a bug in the UI cannot leak private rows. `noindex` on every admin route.                              |
| Security          | HTTPS only, secure HTTP-only cookies, CSRF protection on mutations, input validation with Zod, uploads checked by MIME sniffing, and rate limits on public forms. |
| Performance       | Largest Contentful Paint under 2.5 s on 4G. Images lazy-loaded with responsive `srcset`. Timeline queries under 200 ms for 5,000 entries.                         |
| Accessibility     | WCAG 2.2 AA: contrast of at least 4.5:1, focus rings, labelled controls, keyboard support for the calendar and lightbox.                                          |
| Reliability       | Daily database backups kept for 30 days, and versioned photo storage (see CLAUDE.md "Open items" — needs the Supabase plan decision).                             |
| Responsiveness    | Works from 360 px phones to 1920 px desktops. Installable as a PWA.                                                                                               |
| Content licensing | Show the translation's notice. KJV is public domain.                                                                                                              |

## 7. Success measures

- At least 4 entries a week between the two of you after the first month.
- Every note answered within 24 hours.
- No private item ever reachable without signing in (checked by automated tests).

## 8. Release plan

| Release    | Scope                                                                                    |
| ---------- | ---------------------------------------------------------------------------------------- |
| v1.0 (MVP) | Auth, Home, Entries, Timeline, Photos, Calendar, Notes, in-app notifications             |
| v1.1       | Foundation (public form and admin), email notifications, public site and About Us editor |
| v1.2       | Bookshelf, Drafts list, On this day, web push, data export                               |
