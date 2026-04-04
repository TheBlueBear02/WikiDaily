import { useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useNavigate, useLocation } from 'react-router-dom'

import { getSupabase } from '../../lib/supabaseClient'

export default function AuthSync() {
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const location = useLocation()

  useEffect(() => {
    const supabase = getSupabase()
    const { data } = supabase.auth.onAuthStateChange((event, session) => {
      const userId = session?.user?.id ?? null

      if (userId) {
        const meta = session.user.user_metadata ?? {}
        const isOAuth = session.user.app_metadata?.provider !== 'email'
        const hasUsername = Boolean(meta.username)

        // Derive a fallback username from full_name (Google provides this).
        // Used both for the profile upsert and as a safety net if the user
        // closes the tab before completing the username setup page.
        const fallbackUsername = meta.full_name
          ? meta.full_name.trim().replace(/\s+/g, ' ').slice(0, 20)
          : null

        const usernameToStore = hasUsername ? meta.username : fallbackUsername

        // Best-effort: recreate a missing profile row (e.g., manual deletion) so user actions work.
        supabase
          .from('profiles')
          .upsert(
            { user_id: userId, username: usernameToStore },
            { onConflict: 'user_id' },
          )
          .then(({ error }) => {
            if (error) console.error('Profile upsert failed', error)
          })

        // For OAuth sign-ins without a chosen username, send to setup page.
        // Skip if already on the setup page to avoid redirect loops.
        if (
          isOAuth &&
          !hasUsername &&
          (event === 'SIGNED_IN' || event === 'INITIAL_SESSION') &&
          location.pathname !== '/setup-username'
        ) {
          const returnTo = location.pathname !== '/auth' ? location.pathname : '/'
          navigate(`/setup-username?returnTo=${encodeURIComponent(returnTo)}`, { replace: true })
        }
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

