-- Fix: "new row violates row-level security policy for table wiki_facts" on soft delete.
-- Run in Supabase → SQL Editor (or psql) against your project DB.
--
-- Causes addressed:
-- 1) auth.uid() in RLS should use (SELECT auth.uid()) so it is evaluated once per statement (Postgres docs).
-- 2) Owners need a SELECT policy for their own rows (any is_deleted); otherwise the updated tuple can fail checks.
-- 3) USING should only allow flipping is_deleted on rows that are still active.
--
-- If soft delete still fails, list UPDATE policies (duplicate policies = every WITH CHECK must pass):
--   SELECT policyname, roles, cmd, qual, with_check
--   FROM pg_policies WHERE tablename = 'wiki_facts' AND cmd = 'UPDATE';

-- Optional: remove duplicate dashboard-generated UPDATE policies on wiki_facts before re-running.

DROP POLICY IF EXISTS "wiki_facts_select_own" ON public.wiki_facts;
CREATE POLICY "wiki_facts_select_own"
  ON public.wiki_facts
  FOR SELECT
  TO authenticated
  USING ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "wiki_facts_soft_delete_own" ON public.wiki_facts;
CREATE POLICY "wiki_facts_soft_delete_own"
  ON public.wiki_facts
  FOR UPDATE
  TO authenticated
  USING (
    (SELECT auth.uid()) = user_id
    AND COALESCE(is_deleted, false) = false
  )
  WITH CHECK (
    (SELECT auth.uid()) = user_id
    AND is_deleted IS TRUE
  );
