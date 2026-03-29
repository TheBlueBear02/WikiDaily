import { useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'

import { getSupabase } from '../lib/supabaseClient'

export default function AuthSync() {
  const queryClient = useQueryClient()

  useEffect(() => {
    const supabase = getSupabase()
    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      const userId = session?.user?.id ?? null

      queryClient.invalidateQueries({ queryKey: ['authUser'] })

      // Ensure user-scoped caches are cleared on sign-out and refreshed on sign-in.
      queryClient.removeQueries({ queryKey: ['profile'] })
      queryClient.removeQueries({ queryKey: ['readingLog'] })

      if (userId) {
        queryClient.invalidateQueries({ queryKey: ['profile', userId] })
        queryClient.invalidateQueries({ queryKey: ['readingLog', userId] })
      }
    })

    return () => {
      data?.subscription?.unsubscribe?.()
    }
  }, [queryClient])

  return null
}

