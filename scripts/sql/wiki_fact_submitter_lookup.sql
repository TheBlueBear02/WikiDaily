-- Public submitter display for wiki facts (anon + authenticated).
-- When wiki_facts.submitter_username is empty (older rows or profile had no username at insert),
-- the Home feed can call this to read display-safe fields from profiles without exposing the
-- whole profiles table (RLS still restricts direct SELECT for other users).

drop function if exists public.wiki_fact_submitter_lookup(uuid[]);

create or replace function public.wiki_fact_submitter_lookup(p_user_ids uuid[])
returns table (
  user_id uuid,
  username text,
  total_read int
)
language sql
stable
security definer
set search_path = public
as $$
  select
    p.user_id,
    nullif(btrim(p.username), '') as username,
    coalesce(p.total_read, 0)::int as total_read
  from public.profiles p
  where p.user_id = any(p_user_ids);
$$;

revoke all on function public.wiki_fact_submitter_lookup(uuid[]) from public;
grant execute on function public.wiki_fact_submitter_lookup(uuid[]) to anon, authenticated;
