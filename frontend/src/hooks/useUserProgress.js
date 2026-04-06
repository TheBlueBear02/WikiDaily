import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { getSupabase } from '../lib/supabaseClient'
import { yesterdayUtcYmd } from '../lib/date'
import { normalizeWikiSlugForDb } from '../lib/wikipedia'
import { trackEvent } from '../lib/analytics'

const AUTH_USER_STALE_TIME_MS = 5 * 60 * 1000
/** Keeps Navbar/header profile from refetching on every remount; still invalidated after reads. */
const PROFILE_STALE_TIME_MS = 60 * 1000

function isUniqueUserDateViolation(err) {
  const code = err?.code ?? err?.cause?.code
  const msg = String(err?.message ?? '')
  return code === '23505' || msg.toLowerCase().includes('duplicate key value')
}

function isNoRowsFound(err) {
  const code = err?.code ?? err?.cause?.code
  return code === 'PGRST116'
}

function normalizeReadingSource(source) {
  // DB constraint: reading_log.source CHECK (source IN ('daily','random','link','search')).
  if (source === 'random') return 'random'
  if (source === 'search') return 'search'
  if (source === 'link') return 'link'
  return 'daily'
}

function isForeignKeyViolation(err) {
  const code = err?.code ?? err?.cause?.code
  return code === '23503'
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
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

  async function ensureProfileExists({ supabase, userId: ensuredUserId, user } = {}) {
    if (!supabase) throw new Error('Missing supabase client.')
    if (!ensuredUserId) throw new Error('Missing userId.')

    const { error } = await supabase.from('profiles').upsert(
      {
        user_id: ensuredUserId,
        username: user?.user_metadata?.username ?? null,
      },
      { onConflict: 'user_id' },
    )

    if (error) throw error
  }

  const profileQuery = useQuery({
    queryKey: ['profile', userId],
    enabled: Boolean(userId),
    staleTime: PROFILE_STALE_TIME_MS,
    retry: (failureCount, err) => {
      const code = err?.code ?? err?.cause?.code
      if (code === 'PGRST116') return failureCount < 3
      return failureCount < 2
    },
    retryDelay: (attemptIndex) => Math.min(1500 * (attemptIndex + 1), 4000),
    queryFn: async () => {
      const supabase = getSupabase()
      const { data, error } = await supabase
        .from('profiles')
        .select(
          'user_id,username,current_streak,max_streak,last_read,total_read,total_random_read',
        )
        .eq('user_id', userId)
        .single()

      if (error) {
        // Self-heal: if user deleted their `profiles` row, recreate it so the app can function.
        if (isNoRowsFound(error)) {
          await ensureProfileExists({ supabase, userId, user })
          const { data: data2, error: error2 } = await supabase
            .from('profiles')
            .select(
              'user_id,username,current_streak,max_streak,last_read,total_read,total_random_read',
            )
            .eq('user_id', userId)
            .single()
          if (error2) throw error2
          return data2
        }
        throw error
      }

      // Return immediately so streak/level can render; reconcile `total_read` vs
      // `reading_log` in the background (count query + possible UPDATE was blocking UI).
      const snapshot = data
      const uid = userId
      void (async () => {
        try {
          const authed = queryClient.getQueryData(['authUser'])
          const authedId = authed?.id
          if (authedId !== uid) return

          const currentTotalRead = snapshot?.total_read ?? 0
          const { count, error: countErr } = await supabase
            .from('reading_log')
            .select('id', { count: 'exact', head: true })
            .eq('user_id', uid)

          if (countErr || typeof count !== 'number' || count === currentTotalRead) return
          const { error: fixErr } = await supabase
            .from('profiles')
            .update({ total_read: count })
            .eq('user_id', uid)
          if (fixErr) return

          const stillAuthed = queryClient.getQueryData(['authUser'])
          if (stillAuthed?.id !== uid) return
          queryClient.setQueryData(['profile', uid], (old) =>
            old && typeof old === 'object' ? { ...old, total_read: count } : old,
          )
        } catch {
          // best-effort self-heal
        }
      })()

      return snapshot
    },
  })

  const markAsReadMutation = useMutation({
    mutationFn: async ({ wikiSlug: rawWikiSlug, readDateYmd, source } = {}) => {
      if (!userId) {
        throw new Error('You must be signed in to mark an article as read.')
      }
      const wikiSlug = normalizeWikiSlugForDb(rawWikiSlug)
      if (!wikiSlug || !readDateYmd) {
        throw new Error('Missing required fields to mark as read.')
      }

      const normalizedSource = normalizeReadingSource(source)
      const supabase = getSupabase()

      // Ensure the profile exists before we write user-specific data.
      await ensureProfileExists({ supabase, userId, user })

      async function fetchCurrentProfile() {
        return await supabase
          .from('profiles')
          .select(
            'user_id,username,current_streak,max_streak,last_read,total_read,total_random_read',
          )
          .eq('user_id', userId)
          .single()
      }

      async function insertReadingLogOnce() {
        return await supabase.from('reading_log').insert({
          user_id: userId,
          wiki_slug: wikiSlug,
          read_date: readDateYmd,
          source: normalizedSource,
        })
      }

      let insertErr = null
      {
        const res = await insertReadingLogOnce()
        insertErr = res.error ?? null
      }

      // Reads may land before the client finishes upserting `articles` (random pick,
      // search, in-article wiki links, etc.). If the `reading_log.wiki_slug -> articles.wiki_slug`
      // FK rejects the insert, wait briefly and retry a couple times — regardless of `source`,
      // because daily navigation can still open slugs that are not yet in `articles`.
      if (insertErr && isForeignKeyViolation(insertErr)) {
        const delaysMs = [250, 750, 1500]
        for (const delayMs of delaysMs) {
          await sleep(delayMs)
          const retryRes = await insertReadingLogOnce()
          insertErr = retryRes.error ?? null
          if (!insertErr) break
          if (!isForeignKeyViolation(insertErr)) break
        }
      }

      if (insertErr) {
        if (isUniqueUserDateViolation(insertErr)) {
          return { status: 'already_read' }
        }
        throw insertErr
      }

      // IMPORTANT: fetch a fresh profile snapshot here.
      // Relying on `profileQuery.data` can lose increments if multiple reads happen
      // before React Query refreshes the cached profile.
      let currentProfile = null
      {
        const { data, error } = await fetchCurrentProfile()
        if (error) {
          // Rare timing edge case: profile row may have just been created and not
          // immediately visible through PostgREST. Self-heal + retry briefly.
          if (isNoRowsFound(error)) {
            await ensureProfileExists({ supabase, userId, user })
            await sleep(200)
            const { data: data2, error: error2 } = await fetchCurrentProfile()
            if (error2) throw error2
            currentProfile = data2 ?? null
          } else {
            throw error
          }
        } else {
          currentProfile = data ?? null
        }
      }

      const lastRead = currentProfile?.last_read ?? null
      const yesterday = yesterdayUtcYmd()

      // Streak is per-day, but `total_read` is per successful log insert.
      // If the user already read something today, we should not change streak,
      // but we should still increment `total_read` for additional articles.
      let nextCurrentStreak = 1
      if (lastRead === readDateYmd) {
        nextCurrentStreak = currentProfile?.current_streak ?? 0
      } else if (lastRead === yesterday) {
        nextCurrentStreak = (currentProfile?.current_streak ?? 0) + 1
      }

      const nextMaxStreak = Math.max(
        currentProfile?.max_streak ?? 0,
        nextCurrentStreak,
      )
      const nextTotalRead = (currentProfile?.total_read ?? 0) + 1
      const nextTotalRandomRead =
        normalizedSource === 'random'
          ? (currentProfile?.total_random_read ?? 0) + 1
          : currentProfile?.total_random_read ?? 0

      const { error: profileErr } = await supabase
        .from('profiles')
        .update({
          current_streak: nextCurrentStreak,
          max_streak: nextMaxStreak,
          last_read: readDateYmd,
          total_read: nextTotalRead,
          total_random_read: nextTotalRandomRead,
        })
        .eq('user_id', userId)

      if (profileErr) throw profileErr
      return { status: 'ok', nextCurrentStreak, normalizedSource, wikiSlug }
    },
    onSuccess: async (data) => {
      await queryClient.invalidateQueries({ queryKey: ['profile', userId] })
      await queryClient.invalidateQueries({ queryKey: ['readingHistory', userId] })
      if (data?.status === 'ok') {
        await queryClient.invalidateQueries({ queryKey: ['collectiveReadingTotal'] })
        trackEvent('reading', 'mark_as_read', data.wikiSlug)
        if (data.normalizedSource === 'random') {
          trackEvent('reading', 'random_article_read', data.wikiSlug)
        }
        const streak = data.nextCurrentStreak
        if (streak > 0 && streak % 7 === 0) {
          trackEvent('engagement', 'streak_milestone', `${streak}_days`)
        }
      }
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

