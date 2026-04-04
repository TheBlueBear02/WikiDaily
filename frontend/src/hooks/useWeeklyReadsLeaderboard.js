import { useQuery } from '@tanstack/react-query'

import { getSupabase } from '../lib/supabaseClient'

const DEFAULT_LIMIT = 8

function normalizeLimit(limit) {
  const n = Number(limit)
  if (!Number.isFinite(n)) return DEFAULT_LIMIT
  return Math.max(1, Math.min(50, Math.floor(n)))
}

/**
 * Public leaderboard sorted by most articles read in the current week
 * (Monday 00:00 UTC → Sunday 23:59:59 UTC).
 *
 * Requires Supabase RPC: public.public_weekly_reads_leaderboard(limit_count int)
 * returning: user_id, username, weekly_reads, total_read, facts_count
 */
export function useWeeklyReadsLeaderboard({ limit = DEFAULT_LIMIT } = {}) {
  const safeLimit = normalizeLimit(limit)

  return useQuery({
    queryKey: ['weeklyReadsLeaderboard', safeLimit],
    queryFn: async () => {
      const supabase = getSupabase()
      const { data, error } = await supabase.rpc('public_weekly_reads_leaderboard', {
        limit_count: safeLimit,
      })

      if (error) return []

      return (data ?? []).map((row) => ({
        userId: row.user_id ?? null,
        username: row.username ?? 'Anonymous',
        weeklyReads: row.weekly_reads ?? 0,
        totalRead: row.total_read ?? 0,
        factsCount: row.facts_count != null ? Number(row.facts_count) : null,
        avatarUrl: row.avatar_url ?? null,
      }))
    },
  })
}
