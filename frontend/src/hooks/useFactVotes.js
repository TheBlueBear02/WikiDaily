import { useQuery } from '@tanstack/react-query'

import { getSupabase } from '../lib/supabaseClient'

/**
 * Returns an object with:
 *   - ids: sorted array of fact ids the user voted on
 *   - voteMap: Map<factId, 'up'|'down'>
 */
export function useFactVotes({ userId } = {}) {
  return useQuery({
    queryKey: ['factVotes', userId],
    enabled: Boolean(userId),
    queryFn: async () => {
      const supabase = getSupabase()
      const { data, error } = await supabase
        .from('fact_votes')
        .select('fact_id, vote')
        .eq('user_id', userId)

      if (error) throw error
      const voteMap = new Map()
      const ids = []
      for (const row of data ?? []) {
        const id = Number(row.fact_id)
        if (!Number.isFinite(id)) continue
        ids.push(id)
        voteMap.set(id, row.vote)
      }
      ids.sort((a, b) => a - b)
      return { ids, voteMap }
    },
  })
}
