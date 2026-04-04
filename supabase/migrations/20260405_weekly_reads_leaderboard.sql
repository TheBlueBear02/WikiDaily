-- Function: public_weekly_reads_leaderboard
-- Returns the top N users ranked by articles read in the current week window.
-- The week runs Monday 00:00:00 UTC → Sunday 23:59:59 UTC, matching the
-- frontend countdown which resets at end-of-Sunday UTC.

drop function if exists public.public_weekly_reads_leaderboard(int);

create or replace function public.public_weekly_reads_leaderboard(limit_count int default 8)
returns table (
  user_id     uuid,
  username    text,
  weekly_reads int,
  total_read  int,
  facts_count int,
  avatar_url  text
)
language sql
stable
security definer
set search_path = public
as $$
  -- Start of current week = last Monday 00:00:00 UTC
  with week_start as (
    select date_trunc('week', now() at time zone 'utc') as wstart
  ),
  counts as (
    select
      rl.user_id,
      count(*)::int as weekly_reads
    from public.reading_log rl, week_start
    where rl.read_at >= week_start.wstart
    group by rl.user_id
  )
  select
    p.user_id,
    coalesce(nullif(btrim(p.username), ''), 'Anonymous') as username,
    coalesce(c.weekly_reads, 0)::int                     as weekly_reads,
    coalesce(p.total_read, 0)::int                       as total_read,
    (
      select count(*)::int
      from public.wiki_facts wf
      where wf.submitted_by = p.user_id
        and (wf.is_deleted is null or wf.is_deleted = false)
    )::int                                               as facts_count,
    nullif(btrim(coalesce(
      au.raw_user_meta_data->>'avatar_url',
      au.raw_user_meta_data->>'picture',
      ''
    )), '')                                              as avatar_url
  from counts c
  join public.profiles p on p.user_id = c.user_id
  join auth.users au on au.id = c.user_id
  order by
    c.weekly_reads desc,
    p.total_read   desc,
    p.username     asc,
    p.user_id      asc
  limit greatest(1, least(coalesce(limit_count, 8), 50));
$$;

revoke all on function public.public_weekly_reads_leaderboard(int) from public;
grant execute on function public.public_weekly_reads_leaderboard(int) to anon, authenticated;
