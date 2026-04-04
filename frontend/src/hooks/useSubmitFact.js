import { useMutation, useQueryClient } from '@tanstack/react-query'

import { getSupabase } from '../lib/supabaseClient'

async function ensureProfileExists({ supabase, userId, user, profile } = {}) {
  if (!supabase) throw new Error('Missing supabase client.')
  if (!userId) throw new Error('Missing userId.')

  // Never send `username: null` on upsert — that can wipe an existing `profiles.username`
  // and leave `wiki_facts` submitter snapshots empty for other readers.
  const fromProfile = String(profile?.username ?? '').trim()
  const fromMeta = String(user?.user_metadata?.username ?? '').trim()
  const fromEmail =
    user?.email != null
      ? String(user.email).split('@')[0]?.trim() || ''
      : ''
  const username = fromProfile || fromMeta || fromEmail || null

  const row = { user_id: userId }
  if (username) row.username = username

  const { error } = await supabase.from('profiles').upsert(row, {
    onConflict: 'user_id',
  })

  if (error) throw error
}

export function useSubmitFact({ userId, user, profile } = {}) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ wikiSlug, factText } = {}) => {
      if (!userId) throw new Error('You must be signed in to submit a fact.')
      if (!wikiSlug) throw new Error('Missing wiki slug.')
      const text = String(factText ?? '').trim()
      if (text.length < 10 || text.length > 500) {
        throw new Error('Fact text must be between 10 and 500 characters.')
      }

      const supabase = getSupabase()
      await ensureProfileExists({ supabase, userId, user, profile })

      const { error } = await supabase.from('wiki_facts').insert({
        user_id: userId,
        wiki_slug: wikiSlug,
        fact_text: text,
      })

      if (error) throw error
      return { status: 'ok' }
    },
    onSuccess: async () => {
      if (userId) {
        await queryClient.invalidateQueries({ queryKey: ['myWikiFacts', userId] })
      }
    },
  })
}
