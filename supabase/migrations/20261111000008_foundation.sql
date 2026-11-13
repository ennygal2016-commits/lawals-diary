-- Phase 10: the foundation (PRD FR-32–FR-36).
--
-- * next_foundation_reference(): "FDN-2026-0042" — year in the shared time zone, one sequence for all years.
--   Service role only (the public form runs on the server with the service role; applicants never touch the DB).
-- * set_application_status(): changes the status AND logs it to application_events in one transaction, as the
--   signed-in admin (SECURITY INVOKER — RLS applies, so nobody else can call it usefully).
-- * record_application_payment(): the payment record for a Funded application, logged the same way.
-- * Realtime on foundation_applications so the admin list's counts stay live.

create or replace function public.next_foundation_reference()
returns text
language sql
volatile
security definer
set search_path = ''
as $$
  select 'FDN-' || to_char(now() at time zone 'America/Toronto', 'YYYY') || '-'
         || lpad(nextval('public.foundation_reference_seq')::text, 4, '0');
$$;

revoke execute on function public.next_foundation_reference() from public, anon, authenticated;
do $$
begin
  if exists (select 1 from pg_roles where rolname = 'service_role') then
    grant execute on function public.next_foundation_reference() to service_role;
    grant usage on sequence public.foundation_reference_seq to service_role;
  end if;
end;
$$;

create or replace function public.set_application_status(
  p_id uuid,
  p_status public.application_status,
  p_note text default null
)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_from public.application_status;
begin
  select status into v_from from public.foundation_applications where id = p_id for update;
  if not found then
    raise exception 'Application not found' using errcode = 'P0002';
  end if;
  if v_from = p_status then
    return;
  end if;
  update public.foundation_applications set status = p_status where id = p_id;
  insert into public.application_events (application_id, actor_id, from_status, to_status, note)
  values (p_id, (select auth.uid()), v_from, p_status, nullif(btrim(left(coalesce(p_note, ''), 2000)), ''));
end;
$$;

create or replace function public.record_application_payment(
  p_id uuid,
  p_amount numeric,
  p_paid_on date,
  p_receipt_path text default null
)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_status public.application_status;
begin
  select status into v_status from public.foundation_applications where id = p_id for update;
  if not found then
    raise exception 'Application not found' using errcode = 'P0002';
  end if;
  if v_status <> 'funded' then
    raise exception 'Mark the application Funded before recording a payment.' using errcode = '22023';
  end if;
  if p_amount is null or p_amount < 0 then
    raise exception 'Enter the amount paid.' using errcode = '22023';
  end if;
  update public.foundation_applications
     set amount_paid = p_amount,
         paid_on = p_paid_on,
         receipt_path = coalesce(p_receipt_path, receipt_path)
   where id = p_id;
  insert into public.application_events (application_id, actor_id, note)
  values (p_id, (select auth.uid()),
          'Payment recorded: CA$' || to_char(p_amount, 'FM999G999G990D00') || ' on ' || to_char(p_paid_on, 'YYYY-MM-DD')
          || case when p_receipt_path is not null then ' (receipt attached)' else '' end);
end;
$$;

revoke execute on function public.set_application_status(uuid, public.application_status, text) from public, anon;
grant execute on function public.set_application_status(uuid, public.application_status, text) to authenticated;
revoke execute on function public.record_application_payment(uuid, numeric, date, text) from public, anon;
grant execute on function public.record_application_payment(uuid, numeric, date, text) to authenticated;

do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    alter publication supabase_realtime add table public.foundation_applications;
  end if;
end;
$$;
