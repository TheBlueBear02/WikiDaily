-- Add avatar_url to game leaderboard RPCs so the leaderboard UI can show user profile pictures.
-- avatar_url is read from auth.users.raw_user_meta_data (where Google/OAuth providers store it).
-- Run this in the Supabase SQL editor (replaces the existing functions).

CREATE OR REPLACE FUNCTION public.game_leaderboard_clicks(
  challenge_id_param BIGINT,
  limit_count        INT DEFAULT 10
)
RETURNS TABLE (
  rank         BIGINT,
  user_id      UUID,
  username     TEXT,
  avatar_url   TEXT,
  clicks       INT,
  time_seconds INT,
  completed_at TIMESTAMPTZ
)
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  WITH ranked AS (
    SELECT
      gs.user_id,
      p.username,
      COALESCE(
        NULLIF(BTRIM((au.raw_user_meta_data->>'avatar_url')::text), ''),
        NULLIF(BTRIM((au.raw_user_meta_data->>'picture')::text), '')
      ) AS avatar_url,
      gs.clicks,
      gs.time_seconds,
      gs.completed_at,
      ROW_NUMBER() OVER (
        ORDER BY gs.clicks ASC, gs.time_seconds ASC, gs.completed_at ASC
      ) AS rank
    FROM game_sessions gs
    LEFT JOIN profiles p ON p.user_id = gs.user_id
    LEFT JOIN auth.users au ON au.id = gs.user_id
    WHERE gs.challenge_id = challenge_id_param
      AND gs.completed = TRUE
  )
  SELECT
    rank,
    user_id,
    username,
    avatar_url,
    clicks,
    time_seconds,
    completed_at
  FROM ranked
  ORDER BY rank
  LIMIT GREATEST(1, LEAST(50, COALESCE(limit_count, 10)));
$$;

REVOKE ALL ON FUNCTION public.game_leaderboard_clicks(BIGINT, INT) FROM public;
GRANT EXECUTE ON FUNCTION public.game_leaderboard_clicks(BIGINT, INT) TO anon, authenticated;


CREATE OR REPLACE FUNCTION public.game_leaderboard_time(
  challenge_id_param BIGINT,
  limit_count        INT DEFAULT 10
)
RETURNS TABLE (
  rank         BIGINT,
  user_id      UUID,
  username     TEXT,
  avatar_url   TEXT,
  time_seconds INT,
  clicks       INT,
  completed_at TIMESTAMPTZ
)
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  WITH ranked AS (
    SELECT
      gs.user_id,
      p.username,
      COALESCE(
        NULLIF(BTRIM((au.raw_user_meta_data->>'avatar_url')::text), ''),
        NULLIF(BTRIM((au.raw_user_meta_data->>'picture')::text), '')
      ) AS avatar_url,
      gs.time_seconds,
      gs.clicks,
      gs.completed_at,
      ROW_NUMBER() OVER (
        ORDER BY gs.time_seconds ASC, gs.clicks ASC, gs.completed_at ASC
      ) AS rank
    FROM game_sessions gs
    LEFT JOIN profiles p ON p.user_id = gs.user_id
    LEFT JOIN auth.users au ON au.id = gs.user_id
    WHERE gs.challenge_id = challenge_id_param
      AND gs.completed = TRUE
  )
  SELECT
    rank,
    user_id,
    username,
    avatar_url,
    time_seconds,
    clicks,
    completed_at
  FROM ranked
  ORDER BY rank
  LIMIT GREATEST(1, LEAST(50, COALESCE(limit_count, 10)));
$$;

REVOKE ALL ON FUNCTION public.game_leaderboard_time(BIGINT, INT) FROM public;
GRANT EXECUTE ON FUNCTION public.game_leaderboard_time(BIGINT, INT) TO anon, authenticated;
