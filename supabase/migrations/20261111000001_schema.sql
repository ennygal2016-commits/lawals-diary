-- Lawal's diary — schema (DESIGN.md §7).
-- Every table: id uuid pk, created_at, updated_at (kept current by set_updated_at()).
-- Security (RLS, policies, views, grants) lives in the next migration.

create extension if not exists pgcrypto with schema extensions;

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------
create type public.partner_key as enum ('a', 'b');
create type public.profile_role as enum ('admin');
create type public.mood as enum ('loved', 'happy', 'calm', 'excited', 'funny', 'tired', 'bittersweet', 'sad');
create type public.entry_category as enum ('everyday', 'date_night', 'travel', 'milestone', 'food', 'family', 'other');
create type public.visibility as enum ('private', 'public');
create type public.entry_status as enum ('draft', 'published');
create type public.daily_kind as enum ('scripture', 'romance', 'love', 'faith', 'encouragement');
create type public.book_status as enum ('want_to_read', 'reading', 'finished');
create type public.school_level as enum ('primary', 'secondary', 'tertiary', 'vocational');
create type public.application_status as enum ('new', 'reviewing', 'shortlisted', 'approved', 'declined', 'funded');

-- ---------------------------------------------------------------------------
-- updated_at trigger
-- ---------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- Admin allowlist. Holds the two emails (from ADMIN_EMAILS, written by the seed script — never committed).
-- RLS on with no policies and no grants: only the service role and security-definer functions can read it.
-- ---------------------------------------------------------------------------
create table public.admin_allowlist (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  partner public.partner_key not null unique,
  display_name text not null,
  nickname text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint admin_allowlist_email_lower check (email = lower(email))
);
create unique index admin_allowlist_email_key on public.admin_allowlist (email);

-- ---------------------------------------------------------------------------
-- Profiles
-- ---------------------------------------------------------------------------
create table public.profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users (id) on delete cascade,
  partner public.partner_key not null unique,
  display_name text not null check (char_length(display_name) between 1 and 60),
  nickname text not null check (char_length(nickname) between 1 and 40),
  avatar_path text,
  timezone text not null default 'America/Toronto',
  notify_prefs jsonb not null default '{}'::jsonb,
  role public.profile_role not null default 'admin',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Photos (declared before entries because entries.cover_photo_id points here)
-- ---------------------------------------------------------------------------
create table public.photos (
  id uuid primary key default gen_random_uuid(),
  uploader_id uuid not null references auth.users (id) on delete restrict,
  storage_path text not null unique,
  variants jsonb not null default '{}'::jsonb,
  width integer check (width > 0),
  height integer check (height > 0),
  caption text check (char_length(caption) <= 500),
  taken_on date,
  in_gallery boolean not null default false,
  on_about boolean not null default false,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index photos_created_idx on public.photos (created_at desc) where deleted_at is null;
create index photos_uploader_idx on public.photos (uploader_id);

-- ---------------------------------------------------------------------------
-- Entries
-- ---------------------------------------------------------------------------
create table public.entries (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references auth.users (id) on delete restrict,
  title text not null check (char_length(title) between 1 and 120),
  entry_date date not null default ((now() at time zone 'America/Toronto')::date),
  location text check (char_length(location) <= 200),
  mood public.mood,
  category public.entry_category not null default 'everyday',
  body_json jsonb not null default '{}'::jsonb,
  body_text text not null default '',
  visibility public.visibility not null default 'private',
  status public.entry_status not null default 'draft',
  slug text unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  cover_photo_id uuid references public.photos (id) on delete set null,
  -- FR-18: what a public entry may show beyond title, date, body and photos. All off by default.
  public_show_comments boolean not null default false,
  public_show_location boolean not null default false,
  public_show_mood boolean not null default false,
  deleted_at timestamptz,
  search tsvector generated always as (
    setweight(to_tsvector('english'::regconfig, coalesce(title, '')), 'A')
    || setweight(to_tsvector('english'::regconfig, coalesce(body_text, '')), 'B')
    || setweight(to_tsvector('english'::regconfig, coalesce(location, '')), 'C')
  ) stored,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index entries_timeline_idx on public.entries (entry_date desc, created_at desc) where deleted_at is null;
create index entries_author_idx on public.entries (author_id);
create index entries_search_idx on public.entries using gin (search);
create index entries_public_idx on public.entries (entry_date desc)
  where visibility = 'public' and status = 'published' and deleted_at is null;

create table public.entry_photos (
  id uuid primary key default gen_random_uuid(),
  entry_id uuid not null references public.entries (id) on delete cascade,
  photo_id uuid not null references public.photos (id) on delete cascade,
  position smallint not null default 0 check (position between 0 and 19),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (entry_id, photo_id)
);
create index entry_photos_photo_idx on public.entry_photos (photo_id);
create index entry_photos_entry_idx on public.entry_photos (entry_id, position);

-- ---------------------------------------------------------------------------
-- Comments, notes, notifications
-- ---------------------------------------------------------------------------
create table public.comments (
  id uuid primary key default gen_random_uuid(),
  entry_id uuid not null references public.entries (id) on delete cascade,
  author_id uuid not null references auth.users (id) on delete restrict,
  body text not null check (char_length(body) between 1 and 2000),
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index comments_entry_idx on public.comments (entry_id, created_at) where deleted_at is null;

create table public.notes (
  id uuid primary key default gen_random_uuid(),
  from_id uuid not null references auth.users (id) on delete restrict,
  to_id uuid not null references auth.users (id) on delete restrict,
  body text not null check (char_length(body) between 1 and 1000),
  read_at timestamptz,
  reply_body text check (char_length(reply_body) between 1 and 1000),
  replied_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (from_id <> to_id)
);
create index notes_to_idx on public.notes (to_id, created_at desc);
create index notes_from_idx on public.notes (from_id, created_at desc);

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  type text not null check (type in ('entry', 'comment', 'note', 'note_reply', 'application')),
  payload jsonb not null default '{}'::jsonb,
  read_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index notifications_unread_idx on public.notifications (user_id, created_at desc) where read_at is null;

-- ---------------------------------------------------------------------------
-- Daily content
-- ---------------------------------------------------------------------------
create table public.daily_content (
  id uuid primary key default gen_random_uuid(),
  kind public.daily_kind not null,
  text text not null check (char_length(text) between 1 and 1000),
  attribution text,
  reference text,
  translation text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (kind, text)
);
create index daily_content_pick_idx on public.daily_content (kind, id) where active;

-- ---------------------------------------------------------------------------
-- Bookshelf
-- ---------------------------------------------------------------------------
create table public.books (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(title) between 1 and 200),
  author text check (char_length(author) <= 200),
  isbn text check (isbn ~ '^[0-9X]{10}([0-9]{3})?$'),
  cover_path text,
  status public.book_status not null default 'want_to_read',
  readers uuid[] not null default '{}',
  started_on date,
  finished_on date,
  rating smallint check (rating between 1 and 5),
  notes text check (char_length(notes) <= 5000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index books_status_idx on public.books (status);

create table public.book_quotes (
  id uuid primary key default gen_random_uuid(),
  book_id uuid not null references public.books (id) on delete cascade,
  text text not null check (char_length(text) between 1 and 2000),
  page text check (char_length(page) <= 20),
  added_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index book_quotes_book_idx on public.book_quotes (book_id);

-- ---------------------------------------------------------------------------
-- About page (single row) and settings (single row)
-- ---------------------------------------------------------------------------
create table public.about_page (
  id uuid primary key default gen_random_uuid(),
  singleton boolean not null default true unique check (singleton),
  hero_photo_id uuid references public.photos (id) on delete set null,
  couple_names text not null default 'Nurat & Afeez',
  story_json jsonb not null default '{}'::jsonb,
  milestones jsonb not null default '[]'::jsonb,
  photo_ids uuid[] not null default '{}',
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.settings (
  id uuid primary key default gen_random_uuid(),
  singleton boolean not null default true unique check (singleton),
  anniversary date,
  bible_translation text not null default 'KJV',
  public_site_enabled boolean not null default true,
  special_dates jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Foundation
-- ---------------------------------------------------------------------------
create table public.foundation_applications (
  id uuid primary key default gen_random_uuid(),
  reference text not null unique check (reference ~ '^FDN-[0-9]{4}-[0-9]{4,}$'),
  applicant_name text not null check (char_length(applicant_name) between 1 and 120),
  applicant_dob date not null,
  applicant_phone text check (char_length(applicant_phone) <= 40),
  applicant_email text check (char_length(applicant_email) <= 254),
  guardian_name text check (char_length(guardian_name) <= 120),
  guardian_phone text check (char_length(guardian_phone) <= 40),
  guardian_email text check (char_length(guardian_email) <= 254),
  guardian_relationship text check (char_length(guardian_relationship) <= 60),
  school text not null check (char_length(school) between 1 and 200),
  level public.school_level not null,
  class_year text not null check (char_length(class_year) between 1 and 60),
  amount_requested numeric(12, 2) not null check (amount_requested > 0),
  currency text not null default 'CAD' check (currency = 'CAD'),
  reason text not null check (char_length(reason) between 1 and 2000),
  consent_data boolean not null default false,
  consent_contact boolean not null default false,
  status public.application_status not null default 'new',
  admin_notes text check (char_length(admin_notes) <= 10000),
  amount_paid numeric(12, 2) check (amount_paid >= 0),
  paid_on date,
  receipt_path text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index foundation_applications_status_idx on public.foundation_applications (status, created_at desc);

create table public.application_documents (
  id uuid primary key default gen_random_uuid(),
  application_id uuid not null references public.foundation_applications (id) on delete cascade,
  storage_path text not null unique,
  mime text not null check (mime in ('application/pdf', 'image/jpeg', 'image/png', 'image/webp')),
  size integer not null check (size between 1 and 10485760),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index application_documents_app_idx on public.application_documents (application_id);

create table public.application_events (
  id uuid primary key default gen_random_uuid(),
  application_id uuid not null references public.foundation_applications (id) on delete cascade,
  actor_id uuid references auth.users (id) on delete set null,
  from_status public.application_status,
  to_status public.application_status,
  note text check (char_length(note) <= 2000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index application_events_app_idx on public.application_events (application_id, created_at);

-- Reference numbers: FDN-<year>-<0042>, one sequence for all years.
create sequence public.foundation_reference_seq;

-- ---------------------------------------------------------------------------
-- updated_at triggers on every table
-- ---------------------------------------------------------------------------
do $$
declare
  t text;
begin
  foreach t in array array[
    'admin_allowlist', 'profiles', 'photos', 'entries', 'entry_photos', 'comments', 'notes', 'notifications',
    'daily_content', 'books', 'book_quotes', 'about_page', 'settings', 'foundation_applications',
    'application_documents', 'application_events'
  ]
  loop
    execute format(
      'create trigger set_updated_at before update on public.%I for each row execute function public.set_updated_at()',
      t
    );
  end loop;
end;
$$;
