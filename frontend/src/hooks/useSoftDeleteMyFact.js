import { useMutation } from '@tanstack/react-query'

import { getSupabase } from '../lib/supabaseClient'

export function useSoftDeleteMyFact({ userId } = {}) {
  return useMutation({
    mutationFn: async ({ factId } = {}) => {
      if (!userId) throw new Error('You must be signed in.')
      if (factId == null) throw new Error('Missing fact.')

      const supabase = getSupabase()
      const { error } = await supabase
        .from('wiki_facts')
        .update({ is_deleted: true })
        .eq('id', factId)
        .eq('user_id', userId)

      if (error) throw error
      return { status: 'ok' }
    },
  })
}
