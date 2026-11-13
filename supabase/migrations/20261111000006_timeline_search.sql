-- Phase 7: /admin/timeline (PRD FR-19–FR-22).
-- One call returns a page of published entries for the current filters, newest first, with comment and photo
-- counts, the cover photo's variants, the number of matching entries in each row's month, and the total.
-- Window counts are taken over the whole filtered set before LIMIT, so month headers are right on every page.
--
-- Search: Postgres full-text over the generated `entries.search` column (title A, body B, location C). Each word
-- becomes a prefix term ("lak" finds "lake"); words are reduced to letters and digits first, so user input can never
-- inject tsquery operators. Stop-word-only input ("the") is treated as no search.
--
-- SECURITY INVOKER (the default): the caller's RLS applies — only the two admins see anything.

create or replace function public.timeline_search(
  p_query text default null,
  p_visibility public.visibility default null,
  p_author uuid default null,
  p_moods public.mood[] default null,
  p_categories public.entry_category[] default null,
  p_from date default null,
  p_to date default null,
  p_has_photos boolean default null,
  p_limit integer default 30,
  p_offset integer default 0
)
returns table (
  id uuid,
  title text,
  entry_date date,
  category public.entry_category,
  visibility public.visibility,
  mood public.mood,
  author_id uuid,
  comment_count integer,
  photo_count integer,
  cover_variants jsonb,
  month_count integer,
  total_count integer
)
language sql
stable
set search_path = ''
as $$
  with words as (
    select left(w, 50) as w
    from regexp_split_to_table(lower(left(coalesce(p_query, ''), 200)), '[^[:alnum:]]+') as w
    where w <> ''
    limit 10
  ),
  q as (
    select case
      when count(*) = 0 then null
      else to_tsquery('pg_catalog.english', string_agg(w || ':*', ' & '))
    end as tsq
    from words
  ),
  filtered as (
    select
      e.id, e.title, e.entry_date, e.category, e.visibility, e.mood, e.author_id, e.created_at, e.cover_photo_id,
      (select count(*) from public.comments c where c.entry_id = e.id and c.deleted_at is null)::integer
        as comment_count,
      (select count(*) from public.entry_photos ep where ep.entry_id = e.id)::integer as photo_count
    from public.entries e
    cross join q
    where e.status = 'published'
      and e.deleted_at is null
      and (q.tsq is null or numnode(q.tsq) = 0 or e.search @@ q.tsq)
      and (p_visibility is null or e.visibility = p_visibility)
      and (p_author is null or e.author_id = p_author)
      and (p_moods is null or cardinality(p_moods) = 0 or e.mood = any (p_moods))
      and (p_categories is null or cardinality(p_categories) = 0 or e.category = any (p_categories))
      and (p_from is null or e.entry_date >= p_from)
      and (p_to is null or e.entry_date <= p_to)
      and (
        p_has_photos is null
        or p_has_photos = exists (select 1 from public.entry_photos ep where ep.entry_id = e.id)
      )
  )
  select
    f.id, f.title, f.entry_date, f.category, f.visibility, f.mood, f.author_id, f.comment_count, f.photo_count,
    ph.variants as cover_variants,
    (count(*) over (partition by date_trunc('month', f.entry_date)))::integer as month_count,
    (count(*) over ())::integer as total_count
  from filtered f
  left join public.photos ph on ph.id = f.cover_photo_id and ph.deleted_at is null
  order by f.entry_date desc, f.created_at desc, f.id desc
  limit least(greatest(coalesce(p_limit, 30), 1), 100)
  offset greatest(coalesce(p_offset, 0), 0);
$$;

revoke execute on function public.timeline_search(
  text, public.visibility, uuid, public.mood[], public.entry_category[], date, date, boolean, integer, integer
) from public, anon;
grant execute on function public.timeline_search(
  text, public.visibility, uuid, public.mood[], public.entry_category[], date, date, boolean, integer, integer
) to authenticated;
