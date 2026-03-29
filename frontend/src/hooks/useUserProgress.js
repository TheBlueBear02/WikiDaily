import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { getSupabase } from '../lib/supabaseClient'
import { yesterdayUtcYmd } from '../lib/date'

const AUTH_USER_STALE_TIME_MS = 5 * 60 * 1000

function isUniqueUserDateViolation(err) {
  const code = err?.code ?? err?.cause?.code
  const msg = String(err?.message ?? '')
  return code === '23505' || msg.toLowerCase().includes('duplicate key value')
}

export function useUserProgress() {
  const queryClient = useQueryClient()

  const authUserQuery = useQuery({
    queryKey: ['authUser'],
    staleTime: AUTH_USER_STALE_TIME_MS,
    queryFn: async () => {
      const supabase = getSupabase()
      const { data, error } = await supabase.auth.getUser()
      if (error) throw error
      return data?.user ?? null
    },
  })

  const user = authUserQuery.data ?? null
  const userId = user?.id ?? null

  const profileQuery = useQuery({
    queryKey: ['profile', userId],
    enabled: Boolean(userId),
    queryFn: async () => {
      const supabase = getSupabase()
      const { data, error } = await supabase
        .from('profiles')
        .select('user_id,current_streak,max_streak,last_read,total_read')
        .eq('user_id', userId)
        .maybeSingle()

      if (error) throw error
      return data ?? null
    },
  })

  const markAsReadMutation = useMutation({
    mutationFn: async ({ wikiSlug, readDateYmd }) => {
      if (!userId) {
        throw new Error('You must be signed in to mark an article as read.')
      }
      if (!wikiSlug || !readDateYmd) {
        throw new Error('Missing required fields to mark as read.')
      }

      const supabase = getSupabase()

      const { error: insertErr } = await supabase.from('reading_log').insert({
        user_id: userId,
        wiki_slug: wikiSlug,
        read_date: readDateYmd,
      })

      if (insertErr) {
        if (isUniqueUserDateViolation(insertErr)) {
          return { status: 'already_read' }
        }
        throw insertErr
      }

      const currentProfile = profileQuery.data ?? null
      const lastRead = currentProfile?.last_read ?? null
      const yesterday = yesterdayUtcYmd()

      let nextCurrentStreak = 1
      if (lastRead === readDateYmd) {
        return { status: 'already_read' }
      } else if (lastRead === yesterday) {
        nextCurrentStreak = (currentProfile?.current_streak ?? 0) + 1
      }

      const nextMaxStreak = Math.max(
        currentProfile?.max_streak ?? 0,
        nextCurrentStreak,
      )
      const nextTotalRead = (currentProfile?.total_read ?? 0) + 1

      const { error: profileErr } = await supabase
        .from('profiles')
        .update({
          current_streak: nextCurrentStreak,
          max_streak: nextMaxStreak,
          last_read: readDateYmd,
          total_read: nextTotalRead,
        })
        .eq('user_id', userId)

      if (profileErr) throw profileErr
      return { status: 'ok' }
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['profile', userId] })
    },
  })

  return {
    user,
    userId,
    profile: profileQuery.data ?? null,
    canMutate: Boolean(userId),
    markAsRead: markAsReadMutation.mutateAsync,
    authUserQuery,
    profileQuery,
    markAsReadMutation,
  }
}

