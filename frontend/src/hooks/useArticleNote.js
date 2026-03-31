import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { getSupabase } from '../lib/supabaseClient'

function isNoRowsFound(err) {
  const code = err?.code ?? err?.cause?.code
  return code === 'PGRST116'
}

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

export function useArticleNote({ userId, wikiSlug } = {}) {
  return useQuery({
    queryKey: ['articleNote', userId, wikiSlug],
    enabled: Boolean(userId && wikiSlug),
    queryFn: async () => {
      const supabase = getSupabase()
      const { data, error } = await supabase
        .from('article_notes')
        .select('content, updated_at, created_at')
        .eq('user_id', userId)
        .eq('wiki_slug', wikiSlug)
        .maybeSingle()

      if (error) throw error
      return data ?? null
    },
  })
}

export function useUpsertArticleNote({ userId, user } = {}) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ wikiSlug, content } = {}) => {
      if (!userId) throw new Error('You must be signed in to save notes.')
      if (!wikiSlug) throw new Error('Missing wikiSlug.')
      const nextContent = String(content ?? '')
      if (nextContent.length > 10000) {
        throw new Error('Note is too long (max 10,000 characters).')
      }

      const supabase = getSupabase()

      // Self-heal: ensure profile exists so FK inserts succeed.
      await ensureProfileExists({ supabase, userId, user })

      const { error } = await supabase.from('article_notes').upsert(
        {
          user_id: userId,
          wiki_slug: wikiSlug,
          content: nextContent,
        },
        { onConflict: 'user_id,wiki_slug' },
      )

      if (!error) return { status: 'ok' }

      // Rare timing edge case: profile row may have just been created and not
      // immediately visible through PostgREST. Self-heal + retry once.
      if (isNoRowsFound(error)) {
        await ensureProfileExists({ supabase, userId, user })
        const { error: retryErr } = await supabase.from('article_notes').upsert(
          {
            user_id: userId,
            wiki_slug: wikiSlug,
            content: nextContent,
          },
          { onConflict: 'user_id,wiki_slug' },
        )
        if (!retryErr) return { status: 'ok' }
        throw retryErr
      }

      throw error
    },
    onSuccess: async (_data, variables) => {
      await queryClient.invalidateQueries({
        queryKey: ['articleNote', userId, variables?.wikiSlug],
      })
      await queryClient.invalidateQueries({ queryKey: ['recentNotes', userId] })
    },
  })
}

export function useDeleteArticleNote({ userId } = {}) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ wikiSlug } = {}) => {
      if (!userId) throw new Error('You must be signed in to delete notes.')
      if (!wikiSlug) throw new Error('Missing wikiSlug.')
      const supabase = getSupabase()

      const { error } = await supabase
        .from('article_notes')
        .delete()
        .eq('user_id', userId)
        .eq('wiki_slug', wikiSlug)

      if (error) throw error
      return { status: 'ok' }
    },
    onSuccess: async (_data, variables) => {
      await queryClient.invalidateQueries({
        queryKey: ['articleNote', userId, variables?.wikiSlug],
      })
      await queryClient.invalidateQueries({ queryKey: ['recentNotes', userId] })
    },
  })
}

