-- Phase 9: notifications (PRD FR-40, FR-41).
--
-- * notifications.emailed_at — set when the notification went out by email (instantly or in the daily digest), so
--   nothing is emailed twice.
-- * A foundation application notifies BOTH admins, from the database itself: applications are inserted by the
--   server with the service role (Phase 10), and a trigger means no code path can forget it.
-- * Realtime: the bell subscribes to INSERT/UPDATE on notifications. Realtime applies RLS, so each partner only ever
--   receives their own rows.

alter table public.notifications add column emailed_at timestamptz;

create index notifications_email_queue_idx on public.notifications (created_at)
  where emailed_at is null;

create or replace function public.notify_admins_of_application()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.notifications (user_id, type, payload)
  select p.user_id,
         'application',
         jsonb_build_object('application_id', new.id, 'reference', new.reference, 'level', new.level)
  from public.profiles p
  where p.role = 'admin';
  return new;
end;
$$;

create trigger notify_admins_of_application
  after insert on public.foundation_applications
  for each row execute function public.notify_admins_of_application();

revoke execute on function public.notify_admins_of_application() from public, anon, authenticated;

-- Supabase creates this publication; plain Postgres (tests) may not have it.
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    alter publication supabase_realtime add table public.notifications;
  end if;
end;
$$;
