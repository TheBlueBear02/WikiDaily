import { useMutation, useQueryClient } from '@tanstack/react-query'

import { getSupabase } from '../lib/supabaseClient'

export function useDeleteAccount() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async () => {
      const supabase = getSupabase()

      const { error } = await supabase.rpc('delete_account')
      if (error) throw error

      await supabase.auth.signOut()
    },
    onSuccess: () => {
      queryClient.clear()
    },
  })
}
