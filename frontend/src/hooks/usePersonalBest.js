import { useQuery } from '@tanstack/react-query'
import { getSupabase } from '../lib/supabaseClient'

async function fetchPersonalBest(userId) {
  const supabase = getSupabase()

  // Step 1: get all free play challenge IDs
  const { data: challenges, error: challengesError } = await supabase
    .from('game_challenges')
    .select('id')
    .eq('type', 'free')
  if (challengesError) throw challengesError

  const freeIds = (challenges ?? []).map((c) => c.id)
  if (freeIds.length === 0) {
    return { bestClicks: null, bestTime: null }
  }

  // Step 2: fetch best by clicks and best by time in parallel
  const [clicksResult, timeResult] = await Promise.all([
    supabase
      .from('game_sessions')
      .select('clicks, time_seconds, completed_at, challenge_id')
      .eq('user_id', userId)
      .eq('completed', true)
      .in('challenge_id', freeIds)
      .order('clicks', { ascending: true })
      .limit(1)
      .maybeSingle(),
    supabase
      .from('game_sessions')
      .select('clicks, time_seconds, completed_at, challenge_id')
      .eq('user_id', userId)
      .eq('completed', true)
      .in('challenge_id', freeIds)
      .order('time_seconds', { ascending: true })
      .limit(1)
      .maybeSingle(),
  ])

  if (clicksResult.error) throw clicksResult.error
  if (timeResult.error) throw timeResult.error

  return {
    bestClicks: clicksResult.data ?? null,
    bestTime: timeResult.data ?? null,
  }
}

export function usePersonalBest({ userId } = {}) {
  return useQuery({
    queryKey: ['personalBest', userId],
    queryFn: () => fetchPersonalBest(userId),
    enabled: !!userId,
    staleTime: 0,
  })
}
