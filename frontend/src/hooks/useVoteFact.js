import { useMutation, useQueryClient } from '@tanstack/react-query'

import { getSupabase } from '../lib/supabaseClient'
import { trackEvent } from '../lib/analytics'

async function ensureProfileExists({ supabase, userId, user } = {}) {
  if (!supabase) throw new Error('Missing supabase client.')
  if (!userId) throw new Error('Missing userId.')

  const { error } = await supabase.from('profiles').upsert(
    {
      user_id: userId,
      username: user?.user_metadata?.username ?? null,
    },
    { onConflict: 'user_id' },
  )

  if (error) throw error
}

export function useVoteFact({ userId, user } = {}) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ factId, vote } = {}) => {
      if (!userId) throw new Error('You must be signed in to vote.')
      if (factId == null) throw new Error('Missing fact.')
      if (vote !== 'up' && vote !== 'down') {
        throw new Error('Invalid vote.')
      }

      const supabase = getSupabase()
      await ensureProfileExists({ supabase, userId, user })

      const { error } = await supabase.from('fact_votes').upsert(
        {
          fact_id: factId,
          user_id: userId,
          vote,
        },
        { onConflict: 'fact_id,user_id' },
      )

      if (error) throw error
      return { status: 'ok' }
    },
    onSuccess: (data, variables) => {
      void queryClient.invalidateQueries({ queryKey: ['factVotes', userId] })
      trackEvent('facts', 'vote', variables.vote)
    },
  })
}
