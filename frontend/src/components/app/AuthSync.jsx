import { useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'

import { getSupabase } from '../../lib/supabaseClient'

export default function AuthSync() {
  const queryClient = useQueryClient()

  useEffect(() => {
    const supabase = getSupabase()
    const { data } = supabase.auth.onAuthStateChange((event, session) => {
      const userId = session?.user?.id ?? null

      if (userId) {
        // Best-effort: recreate a missing profile row (e.g., manual deletion) so user actions work.
        supabase
          .from('profiles')
          .upsert(
            {
              user_id: userId,
              username: session?.user?.user_metadata?.username ?? null,
            },
            { onConflict: 'user_id' },
          )
          .then(({ error }) => {
            if (error) console.error('Profile upsert failed', error)
          })
      }

      // Make UI react instantly to auth changes (no refresh needed).
      if (event === 'SIGNED_OUT') {
        queryClient.setQueryData(['authUser'], null)
      } else {
        queryClient.setQueryData(['authUser'], session?.user ?? null)
      }

      queryClient.invalidateQueries({ queryKey: ['authUser'] })

      // Sign-out: drop user-scoped caches so the next session cannot read stale rows.
      if (event === 'SIGNED_OUT') {
        queryClient.removeQueries({ queryKey: ['profile'] })
        queryClient.removeQueries({ queryKey: ['readingLog'] })
        queryClient.removeQueries({ queryKey: ['myWikiFacts'] })
        return
      }

      // IMPORTANT: Do not remove/invalidate profile on TOKEN_REFRESHED. JWT refresh is
      // frequent; nuking `['profile']` forced slow refetches (profiles + reading_log
      // count) and made the Navbar lag far behind the rest of the page.
      if (userId && (event === 'INITIAL_SESSION' || event === 'SIGNED_IN')) {
        queryClient.invalidateQueries({ queryKey: ['profile', userId] })
        queryClient.invalidateQueries({ queryKey: ['readingLog', userId] })
        queryClient.invalidateQueries({ queryKey: ['myWikiFacts', userId] })
      }
    })

    return () => {
      data?.subscription?.unsubscribe?.()
    }
  }, [queryClient])

  return null
}

