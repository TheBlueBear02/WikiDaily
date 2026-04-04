import { useMutation, useQueryClient } from '@tanstack/react-query'

import { getSupabase } from '../lib/supabaseClient'

/** PostgREST errors are plain objects; React Query / UI expect `Error` for `instanceof` and `.message`. */
function postgrestErrorToError(err) {
  if (!err) return new Error('Unknown error')
  if (err instanceof Error) return err
  const parts = [err.message, err.details, err.hint].filter(Boolean)
  return new Error(parts.join(' — ') || 'Request failed')
}

export function useSoftDeleteMyFact({ userId } = {}) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ factId } = {}) => {
      if (!userId) throw new Error('You must be signed in.')
      if (factId == null) throw new Error('Missing fact.')

      const supabase = getSupabase()
      // Do not `.select()` after update: `wiki_facts_select_public` only allows `is_deleted = false`,
      // so a soft-deleted row would not be visible and PostgREST would return an empty payload even on success.
      const { error } = await supabase
        .from('wiki_facts')
        .update({ is_deleted: true })
        .eq('id', factId)
        .eq('user_id', userId)

      if (error) throw postgrestErrorToError(error)
      return { status: 'ok' }
    },
    onSuccess: async () => {
      if (userId) {
        await queryClient.invalidateQueries({ queryKey: ['myWikiFacts', userId] })
      }
    },
  })
}
