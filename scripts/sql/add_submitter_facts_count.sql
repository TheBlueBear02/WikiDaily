-- Add submitter_facts_count snapshot column to wiki_facts.
-- This stores the submitter's total approved fact count at the time of fact submission
-- (or can be NULL for older rows, enriched at query time via the RPC).

alter table public.wiki_facts
  add column if not exists submitter_facts_count int;

-- Update the submitter lookup RPC to also return facts_count, current_streak, and avatar_url.
-- avatar_url is read from auth.users.raw_user_meta_data (where Google/OAuth providers store it).

drop function if exists public.wiki_fact_submitter_lookup(uuid[]);

create or replace function public.wiki_fact_submitter_lookup(p_user_ids uuid[])
returns table (
  user_id uuid,
  username text,
  total_read int,
  current_streak int,
  facts_count int,
  avatar_url text
)
language sql
stable
security definer
set search_path = public
as $$
  select
    p.user_id,
    nullif(btrim(p.username), '') as username,
    coalesce(p.total_read, 0)::int as total_read,
    coalesce(p.current_streak, 0)::int as current_streak,
    (
      select count(*)::int
      from public.wiki_facts wf
      where wf.user_id = p.user_id
        and (wf.is_deleted is null or wf.is_deleted = false)
    ) as facts_count,
    coalesce(
      nullif(btrim((au.raw_user_meta_data->>'avatar_url')::text), ''),
      nullif(btrim((au.raw_user_meta_data->>'picture')::text), '')
    ) as avatar_url
  from public.profiles p
  join auth.users au on au.id = p.user_id
  where p.user_id = any(p_user_ids);
$$;

revoke all on function public.wiki_fact_submitter_lookup(uuid[]) from public;
grant execute on function public.wiki_fact_submitter_lookup(uuid[]) to anon, authenticated;
