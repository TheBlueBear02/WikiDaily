import { useMutation } from '@tanstack/react-query'
import { getSupabase } from '../lib/supabaseClient'

export function useGameSession() {
  const startSessionMutation = useMutation({
    mutationFn: async ({ challengeId, userId, startSlug }) => {
      const supabase = getSupabase()
      const { data, error } = await supabase
        .from('game_sessions')
        .insert({
          challenge_id: challengeId,
          user_id: userId,
          clicks: 0,
          path: [startSlug],
          completed: false,
          started_at: new Date().toISOString(),
        })
        .select('id')
        .single()
      if (error) throw error
      return data.id
    },
  })

  const recordClickMutation = useMutation({
    mutationFn: async ({ sessionId, clicks, path }) => {
      const supabase = getSupabase()
      const { error } = await supabase
        .from('game_sessions')
        .update({ clicks, path })
        .eq('id', sessionId)
      if (error) throw error
    },
  })

  const completeSessionMutation = useMutation({
    mutationFn: async ({ sessionId, clicks, timeSeconds, path }) => {
      const supabase = getSupabase()
      const { error } = await supabase
        .from('game_sessions')
        .update({
          clicks,
          time_seconds: timeSeconds,
          path,
          completed: true,
          completed_at: new Date().toISOString(),
        })
        .eq('id', sessionId)
      if (error) throw error
    },
  })

  return { startSessionMutation, recordClickMutation, completeSessionMutation }
}
