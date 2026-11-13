-- Lawal's diary — security (DESIGN.md §8).
-- * is_admin() gates every private table through RLS.
-- * The anon role gets NO table privileges; it can only select from the three public_* views.
-- * New auth users are rejected unless their email is in admin_allowlist; allowed users get a profile.

-- ---------------------------------------------------------------------------
-- is_admin()
-- security definer so it can read profiles without recursing into profiles' own RLS.
-- ---------------------------------------------------------------------------
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles
    where user_id = (select auth.uid()) and role = 'admin'
  );
$$;
revoke execute on function public.is_admin() from public, anon;
grant execute on function public.is_admin() to authenticated;

-- ---------------------------------------------------------------------------
-- Allowlist trigger on auth.users
-- ---------------------------------------------------------------------------
create or replace function public.enforce_admin_allowlist()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.email is null
     or not exists (select 1 from public.admin_allowlist where email = lower(new.email)) then
    -- Deliberately vague: the message can reach a client through GoTrue.
    raise exception 'Sign-up is not available.' using errcode = 'P0001';
  end if;
  return new;
end;
$$;

create trigger enforce_admin_allowlist
  before insert or update of email on auth.users
  for each row execute function public.enforce_admin_allowlist();

create or replace function public.create_profile_for_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (user_id, partner, display_name, nickname)
  select new.id, a.partner, a.display_name, a.nickname
  from public.admin_allowlist a
  where a.email = lower(new.email)
  on conflict (user_id) do nothing;
  return new;
end;
$$;

create trigger create_profile_for_new_user
  after insert on auth.users
  for each row execute function public.create_profile_for_new_user();

revoke execute on function public.enforce_admin_allowlist() from public, anon, authenticated;
revoke execute on function public.create_profile_for_new_user() from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- Privileges: anon gets nothing on tables or sequences. authenticated keeps table privileges, filtered by RLS.
-- ---------------------------------------------------------------------------
revoke all on all tables in schema public from anon;
revoke all on all sequences in schema public from anon;
alter default privileges for role postgres in schema public revoke all on tables from anon;
alter default privileges for role postgres in schema public revoke all on sequences from anon;
alter default privileges for role postgres in schema public revoke execute on functions from anon;

-- The allowlist is for the service role and the triggers only.
revoke all on public.admin_allowlist from authenticated;

-- Profiles: users may only change their own presentation fields — never user_id, partner or role.
revoke insert, update, delete on public.profiles from authenticated;
grant update (display_name, nickname, avatar_path, timezone, notify_prefs) on public.profiles to authenticated;

-- ---------------------------------------------------------------------------
-- Row level security on every table
-- ---------------------------------------------------------------------------
alter table public.admin_allowlist enable row level security;
alter table public.profiles enable row level security;
alter table public.photos enable row level security;
alter table public.entries enable row level security;
alter table public.entry_photos enable row level security;
alter table public.comments enable row level security;
alter table public.notes enable row level security;
alter table public.notifications enable row level security;
alter table public.daily_content enable row level security;
alter table public.books enable row level security;
alter table public.book_quotes enable row level security;
alter table public.about_page enable row level security;
alter table public.settings enable row level security;
alter table public.foundation_applications enable row level security;
alter table public.application_documents enable row level security;
alter table public.application_events enable row level security;

-- admin_allowlist: no policies at all (service role bypasses RLS).

-- profiles
create policy "admins read profiles" on public.profiles
  for select to authenticated using ((select public.is_admin()));
create policy "admins update own profile" on public.profiles
  for update to authenticated
  using ((select public.is_admin()) and user_id = (select auth.uid()))
  with check ((select public.is_admin()) and user_id = (select auth.uid()));

-- entries: both read; only the author writes (CLAUDE.md open item, default yes).
create policy "admins read entries" on public.entries
  for select to authenticated using ((select public.is_admin()));
create policy "admins insert own entries" on public.entries
  for insert to authenticated
  with check ((select public.is_admin()) and author_id = (select auth.uid()));
create policy "authors update entries" on public.entries
  for update to authenticated
  using ((select public.is_admin()) and author_id = (select auth.uid()))
  with check ((select public.is_admin()) and author_id = (select auth.uid()));
create policy "authors delete entries" on public.entries
  for delete to authenticated
  using ((select public.is_admin()) and author_id = (select auth.uid()));

-- photos
create policy "admins read photos" on public.photos
  for select to authenticated using ((select public.is_admin()));
create policy "admins insert own photos" on public.photos
  for insert to authenticated
  with check ((select public.is_admin()) and uploader_id = (select auth.uid()));
create policy "admins update photos" on public.photos
  for update to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));
create policy "admins delete photos" on public.photos
  for delete to authenticated using ((select public.is_admin()));

-- comments: both read; only the author writes.
create policy "admins read comments" on public.comments
  for select to authenticated using ((select public.is_admin()));
create policy "admins insert own comments" on public.comments
  for insert to authenticated
  with check ((select public.is_admin()) and author_id = (select auth.uid()));
create policy "authors update comments" on public.comments
  for update to authenticated
  using ((select public.is_admin()) and author_id = (select auth.uid()))
  with check ((select public.is_admin()) and author_id = (select auth.uid()));
create policy "authors delete comments" on public.comments
  for delete to authenticated
  using ((select public.is_admin()) and author_id = (select auth.uid()));

-- notes: sender writes; sender or recipient reads and updates (recipient marks read and replies).
create policy "admins read their notes" on public.notes
  for select to authenticated
  using ((select public.is_admin()) and (select auth.uid()) in (from_id, to_id));
create policy "admins send notes" on public.notes
  for insert to authenticated
  with check ((select public.is_admin()) and from_id = (select auth.uid()));
create policy "admins update their notes" on public.notes
  for update to authenticated
  using ((select public.is_admin()) and (select auth.uid()) in (from_id, to_id))
  with check ((select public.is_admin()) and (select auth.uid()) in (from_id, to_id));
create policy "senders delete notes" on public.notes
  for delete to authenticated
  using ((select public.is_admin()) and from_id = (select auth.uid()));

-- notifications: each partner sees and clears their own; either partner can notify the other.
create policy "admins read own notifications" on public.notifications
  for select to authenticated
  using ((select public.is_admin()) and user_id = (select auth.uid()));
create policy "admins create notifications" on public.notifications
  for insert to authenticated with check ((select public.is_admin()));
create policy "admins update own notifications" on public.notifications
  for update to authenticated
  using ((select public.is_admin()) and user_id = (select auth.uid()))
  with check ((select public.is_admin()) and user_id = (select auth.uid()));
create policy "admins delete own notifications" on public.notifications
  for delete to authenticated
  using ((select public.is_admin()) and user_id = (select auth.uid()));

-- Everything else: admins only, all operations.
do $$
declare
  t text;
begin
  foreach t in array array[
    'entry_photos', 'daily_content', 'books', 'book_quotes', 'about_page', 'settings',
    'foundation_applications', 'application_documents', 'application_events'
  ]
  loop
    execute format(
      'create policy "admins manage %1$s" on public.%1$I for all to authenticated '
      'using ((select public.is_admin())) with check ((select public.is_admin()))',
      t
    );
  end loop;
end;
$$;

-- ---------------------------------------------------------------------------
-- Public views — the only things anon can read.
-- Views run with the owner's rights (security_invoker off), so they bypass RLS by design;
-- their WHERE clauses are the public rule. security_barrier stops predicate push-down leaks.
-- All three return nothing while the public site is switched off in Settings.
-- ---------------------------------------------------------------------------
create view public.public_entries with (security_barrier = true) as
select
  e.id,
  e.slug,
  e.title,
  e.entry_date,
  e.category,
  e.body_json,
  e.body_text,
  e.cover_photo_id,
  case when e.public_show_location then e.location end as location,
  case when e.public_show_mood then e.mood end as mood,
  e.public_show_comments as show_comments,
  p.display_name as author_name,
  p.partner as author_partner,
  e.created_at,
  e.updated_at
from public.entries e
join public.profiles p on p.user_id = e.author_id
where e.visibility = 'public'
  and e.status = 'published'
  and e.deleted_at is null
  and exists (select 1 from public.settings s where s.public_site_enabled);

create view public.public_photos with (security_barrier = true) as
select
  ph.id,
  ph.variants,
  ph.width,
  ph.height,
  ph.caption,
  ph.taken_on,
  ph.in_gallery,
  ph.on_about,
  ph.created_at
from public.photos ph
where ph.deleted_at is null
  and (
    ph.in_gallery
    or ph.on_about
    or exists (
      select 1
      from public.entry_photos ep
      join public.entries e on e.id = ep.entry_id
      where ep.photo_id = ph.id
        and e.visibility = 'public' and e.status = 'published' and e.deleted_at is null
    )
  )
  and exists (select 1 from public.settings s where s.public_site_enabled);

create view public.public_about with (security_barrier = true) as
select
  a.hero_photo_id,
  a.couple_names,
  a.story_json,
  a.milestones,
  a.photo_ids,
  a.published_at
from public.about_page a
where a.published_at is not null
  and exists (select 1 from public.settings s where s.public_site_enabled);

revoke all on public.public_entries, public.public_photos, public.public_about from anon, authenticated;
grant select on public.public_entries, public.public_photos, public.public_about to anon, authenticated;
