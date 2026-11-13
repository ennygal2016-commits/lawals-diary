-- Phase 6: photo library and public copies (PRD FR-25, FR-28; DESIGN.md §8).
--
-- * photos.variants        private paths in photos-private: {"400": {"webp": …, "jpeg": …}, "1200": …, "2400": …}
-- * photos.public_variants same shape, in photos-public, ONLY while the photo is public (gallery, About page or a
--                          public entry). Unguessable paths. null = no public copy exists.
-- * photo_library          what the admin Photos page queries: one row per live photo with its public flags.
--                          security_invoker, so the caller's RLS applies (admins only).
-- * public_photos          now exposes the public copies only — never a private storage path.

alter table public.photos add column public_variants jsonb;

create view public.photo_library with (security_invoker = true) as
select
  p.id,
  p.uploader_id,
  p.storage_path,
  p.variants,
  p.public_variants,
  p.width,
  p.height,
  p.caption,
  p.taken_on,
  p.in_gallery,
  p.on_about,
  p.created_at,
  p.updated_at,
  e.in_public_entry,
  (p.in_gallery or p.on_about or e.in_public_entry) as is_public
from public.photos p
cross join lateral (
  select exists (
    select 1
    from public.entry_photos ep
    join public.entries en on en.id = ep.entry_id
    where ep.photo_id = p.id
      and en.visibility = 'public' and en.status = 'published' and en.deleted_at is null
  ) as in_public_entry
) e
where p.deleted_at is null;

revoke all on public.photo_library from anon, authenticated;
grant select on public.photo_library to authenticated;

-- Same columns, same order and types as before; `variants` now carries the PUBLIC copies.
create or replace view public.public_photos with (security_barrier = true) as
select
  ph.id,
  ph.public_variants as variants,
  ph.width,
  ph.height,
  ph.caption,
  ph.taken_on,
  ph.in_gallery,
  ph.on_about,
  ph.created_at
from public.photos ph
where ph.deleted_at is null
  and ph.public_variants is not null
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
