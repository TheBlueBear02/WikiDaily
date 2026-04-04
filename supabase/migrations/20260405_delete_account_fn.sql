-- Function: delete_account
-- Allows an authenticated user to permanently delete their own account.
-- Deletes the auth.users row (which cascades to any tables with ON DELETE CASCADE FK),
-- then explicitly removes rows from tables that may not have cascade set up.
-- Runs as SECURITY DEFINER so it has permission to touch auth.users.

CREATE OR REPLACE FUNCTION public.delete_account()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid uuid;
BEGIN
  _uid := auth.uid();
  IF _uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Delete user data rows explicitly (covers tables without CASCADE)
  DELETE FROM public.fact_votes      WHERE user_id = _uid;
  DELETE FROM public.article_notes   WHERE user_id = _uid;
  DELETE FROM public.user_achievements WHERE user_id = _uid;
  DELETE FROM public.wiki_facts      WHERE submitted_by = _uid;
  DELETE FROM public.game_sessions   WHERE user_id = _uid;
  DELETE FROM public.favorites       WHERE user_id = _uid;
  DELETE FROM public.reading_log     WHERE user_id = _uid;
  DELETE FROM public.profiles        WHERE user_id = _uid;

  -- Delete the auth user last (may cascade some of the above if FK constraints exist)
  DELETE FROM auth.users WHERE id = _uid;
END;
$$;

-- Only the authenticated user themselves can call this function
REVOKE ALL ON FUNCTION public.delete_account() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.delete_account() TO authenticated;
