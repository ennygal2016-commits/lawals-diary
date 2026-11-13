-- Phase 11: About Us drafts vs published, Bible notice, and the read-only views the public site needs.
--
-- * about_page columns are the DRAFT the editor saves; Publish copies them into published_snapshot. The public view
--   reads only the snapshot, so saving a draft never changes the live page.
-- * settings.bible_notice: the licence line shown under the scripture card.
-- * public_site: one boolean anon can read, so the public layout can show "Coming soon".
-- * public_entry_photos / public_comments: what /journal/[slug] may show (comments only when the author opted in).
-- Every public_* view returns nothing while the public site is off.

alter table public.settings add column bible_notice text not null default 'King James Version — public domain.'
  check (char_length(bible_notice) <= 200);
alter table public.about_page add column published_snapshot jsonb;

drop view if exists public.public_about;
create view public.public_about with (security_barrier = true) as
select
  (a.published_snapshot ->> 'hero_photo_id')::uuid as hero_photo_id,
  coalesce(a.published_snapshot ->> 'couple_names', '') as couple_names,
  coalesce(a.published_snapshot -> 'story_json', '{}'::jsonb) as story_json,
  coalesce(a.published_snapshot -> 'milestones', '[]'::jsonb) as milestones,
  coalesce(a.published_snapshot -> 'photo_ids', '[]'::jsonb) as photo_ids,
  a.published_at
from public.about_page a
where a.published_at is not null
  and a.published_snapshot is not null
  and exists (select 1 from public.settings s where s.public_site_enabled);

create view public.public_site with (security_barrier = true) as
select coalesce((select s.public_site_enabled from public.settings s limit 1), false) as enabled;

create view public.public_entry_photos with (security_barrier = true) as
select ep.entry_id, ep.photo_id, ep.position
from public.entry_photos ep
join public.entries e on e.id = ep.entry_id
join public.photos ph on ph.id = ep.photo_id
where e.visibility = 'public' and e.status = 'published' and e.deleted_at is null
  and ph.deleted_at is null and ph.public_variants is not null
  and exists (select 1 from public.settings s where s.public_site_enabled);

create view public.public_comments with (security_barrier = true) as
select c.id, c.entry_id, c.body, p.display_name as author_name, p.partner as author_partner, c.created_at
from public.comments c
join public.entries e on e.id = c.entry_id
join public.profiles p on p.user_id = c.author_id
where c.deleted_at is null
  and e.visibility = 'public' and e.status = 'published' and e.deleted_at is null and e.public_show_comments
  and exists (select 1 from public.settings s where s.public_site_enabled);

revoke all on public.public_about, public.public_site, public.public_entry_photos, public.public_comments
  from anon, authenticated;
grant select on public.public_about, public.public_site, public.public_entry_photos, public.public_comments
  to anon, authenticated;
