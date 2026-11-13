-- Lawal's diary — storage buckets and policies (DESIGN.md §8).
-- photos-private  : originals-free processed images + avatars. Admins only; shown through short-lived signed URLs.
-- photos-public   : copies of photos that are public. Public bucket (served by URL); only admins can write or list.
-- foundation-docs : applicants' documents and payment receipts. Admins only (applicant uploads go through the
--                   server with the service role).

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('photos-private', 'photos-private', false, 26214400, array['image/jpeg', 'image/png', 'image/webp']),
  ('photos-public', 'photos-public', true, 26214400, array['image/jpeg', 'image/webp']),
  ('foundation-docs', 'foundation-docs', false, 10485760,
    array['application/pdf', 'image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

create policy "admins read diary buckets" on storage.objects
  for select to authenticated
  using (bucket_id in ('photos-private', 'photos-public', 'foundation-docs') and (select public.is_admin()));

create policy "admins upload to diary buckets" on storage.objects
  for insert to authenticated
  with check (bucket_id in ('photos-private', 'photos-public', 'foundation-docs') and (select public.is_admin()));

create policy "admins update diary buckets" on storage.objects
  for update to authenticated
  using (bucket_id in ('photos-private', 'photos-public', 'foundation-docs') and (select public.is_admin()))
  with check (bucket_id in ('photos-private', 'photos-public', 'foundation-docs') and (select public.is_admin()));

create policy "admins delete from diary buckets" on storage.objects
  for delete to authenticated
  using (bucket_id in ('photos-private', 'photos-public', 'foundation-docs') and (select public.is_admin()));
