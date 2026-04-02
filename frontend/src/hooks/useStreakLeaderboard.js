import { useQuery } from '@tanstack/react-query'

import { getSupabase } from '../lib/supabaseClient'

const DEFAULT_LIMIT = 8

function normalizeLimit(limit) {
  const n = Number(limit)
  if (!Number.isFinite(n)) return DEFAULT_LIMIT
  return Math.max(1, Math.min(50, Math.floor(n)))
}

/**
 * Public leaderboard sorted by highest current streak.
 *
 * Requires a public Supabase RPC:
 *   public.public_streak_leaderboard(limit_count int)
 * that returns rows with: user_id, username, current_streak, total_read.
 */
export function useStreakLeaderboard({ limit = DEFAULT_LIMIT } = {}) {
  const safeLimit = normalizeLimit(limit)

  return useQuery({
    queryKey: ['streakLeaderboard', safeLimit],
    queryFn: async () => {
      const supabase = getSupabase()
      const { data, error } = await supabase.rpc('public_streak_leaderboard', {
        limit_count: safeLimit,
      })

      // If the RPC isn’t deployed yet, degrade gracefully to an empty list so
      // the Home page stays usable during setup.
      if (error) return []

      return (data ?? []).map((row) => ({
        userId: row.user_id ?? null,
        username: row.username ?? 'Anonymous',
        currentStreak: row.current_streak ?? 0,
        totalRead: row.total_read ?? 0,
      }))
    },
  })
}

