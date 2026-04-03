import { useQuery } from '@tanstack/react-query'

import { getSupabase } from '../lib/supabaseClient'

/** Sorted fact ids the current user has voted on (up or down). */
export function useFactVotes({ userId } = {}) {
  return useQuery({
    queryKey: ['factVotes', userId],
    enabled: Boolean(userId),
    queryFn: async () => {
      const supabase = getSupabase()
      const { data, error } = await supabase
        .from('fact_votes')
        .select('fact_id')
        .eq('user_id', userId)

      if (error) throw error
      const ids = (data ?? [])
        .map((row) => Number(row.fact_id))
        .filter((n) => Number.isFinite(n))
      ids.sort((a, b) => a - b)
      return ids
    },
  })
}
