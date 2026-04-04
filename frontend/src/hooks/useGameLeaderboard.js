import { useQuery } from '@tanstack/react-query'
import { getSupabase } from '../lib/supabaseClient'

export function useGameLeaderboard({ challengeId, limit = 10 } = {}) {
  const clicksQuery = useQuery({
    queryKey: ['gameLeaderboardClicks', challengeId, limit],
    enabled: Boolean(challengeId),
    queryFn: async () => {
      const supabase = getSupabase()
      const { data, error } = await supabase.rpc('game_leaderboard_clicks', {
        challenge_id_param: challengeId,
        limit_count: limit,
      })
      if (error) throw error
      return data ?? []
    },
    staleTime: 30 * 1000,
  })

  const timeQuery = useQuery({
    queryKey: ['gameLeaderboardTime', challengeId, limit],
    enabled: Boolean(challengeId),
    queryFn: async () => {
      const supabase = getSupabase()
      const { data, error } = await supabase.rpc('game_leaderboard_time', {
        challenge_id_param: challengeId,
        limit_count: limit,
      })
      if (error) throw error
      return data ?? []
    },
    staleTime: 30 * 1000,
  })

  return {
    clicksLeaderboard: clicksQuery.data ?? [],
    timeLeaderboard: timeQuery.data ?? [],
    isLoading: clicksQuery.isLoading || timeQuery.isLoading,
  }
}
