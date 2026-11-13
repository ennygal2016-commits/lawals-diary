-- Notes (PRD FR-8): the recipient can reply once, which marks the note answered. RLS lets either partner update
-- their notes; this trigger narrows WHAT each may change, so a UI bug can't rewrite a note or a reply.
-- Runs only for signed-in users (auth.uid() set); the service role is unaffected.

create or replace function public.guard_note_update()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  uid uuid := (select auth.uid());
begin
  if uid is null then
    return new;
  end if;

  if new.from_id <> old.from_id or new.to_id <> old.to_id or new.body <> old.body
     or new.created_at <> old.created_at then
    raise exception 'Notes can''t be edited.' using errcode = '42501';
  end if;

  if new.reply_body is distinct from old.reply_body or new.replied_at is distinct from old.replied_at then
    if uid <> old.to_id or old.reply_body is not null or new.reply_body is null then
      raise exception 'Only the recipient can reply, and only once.' using errcode = '42501';
    end if;
    new.replied_at := now();
    new.read_at := coalesce(old.read_at, now());
  end if;

  if new.read_at is distinct from old.read_at and uid <> old.to_id then
    raise exception 'Only the recipient can mark a note read.' using errcode = '42501';
  end if;

  return new;
end;
$$;

create trigger guard_note_update
  before update on public.notes
  for each row execute function public.guard_note_update();

revoke execute on function public.guard_note_update() from public, anon, authenticated;
