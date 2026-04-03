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

export function useFavorites({ userId, user, limit } = {}) {
  const queryClient = useQueryClient()

  const normalizedLimit =
    typeof limit === 'number' && Number.isFinite(limit) && limit > 0 ? Math.floor(limit) : null

  const favoritesQuery = useQuery({
    queryKey: ['favorites', userId, normalizedLimit ?? 'all'],
    enabled: Boolean(userId),
    queryFn: async () => {
      const supabase = getSupabase()
      let query = supabase
        .from('favorites')
        .select(
          `
          wiki_slug,
          created_at,
          articles (
            display_title,
            image_url,
            description,
            is_daily,
            featured_date
          )
        `,
        )
        .eq('user_id', userId)
        .order('created_at', { ascending: false })

      if (normalizedLimit) {
        query = query.limit(normalizedLimit)
      }

      const { data, error } = await query

      if (error) throw error
      return data ?? []
    },
  })

  const addFavoriteMutation = useMutation({
    mutationFn: async ({ wikiSlug } = {}) => {
      if (!userId) throw new Error('You must be signed in to mark an article as interesting.')
      if (!wikiSlug) throw new Error('Missing wikiSlug.')
      const supabase = getSupabase()

      // Self-heal: ensure profile exists so FK inserts succeed.
      await ensureProfileExists({ supabase, userId, user })

      const { error } = await supabase.from('favorites').insert({
        user_id: userId,
        wiki_slug: wikiSlug,
      })

      if (!error) return { status: 'ok' }

      // If duplicate, treat as success for idempotent toggles.
      const code = error?.code ?? error?.cause?.code
      const msg = String(error?.message ?? '').toLowerCase()
      if (code === '23505' || msg.includes('duplicate key value')) {
        return { status: 'already_favorited' }
      }

      // If profile row is not visible yet (rare), retry once after a self-heal.
      if (isNoRowsFound(error)) {
        await ensureProfileExists({ supabase, userId, user })
        const { error: retryErr } = await supabase.from('favorites').insert({
          user_id: userId,
          wiki_slug: wikiSlug,
        })
        if (!retryErr) return { status: 'ok' }
        throw retryErr
      }

      throw error
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['favorites', userId] })
    },
  })

  const removeFavoriteMutation = useMutation({
    mutationFn: async ({ wikiSlug } = {}) => {
      if (!userId) throw new Error('You must be signed in to unmark an article.')
      if (!wikiSlug) throw new Error('Missing wikiSlug.')
      const supabase = getSupabase()

      const { error } = await supabase
        .from('favorites')
        .delete()
        .eq('user_id', userId)
        .eq('wiki_slug', wikiSlug)

      if (error) throw error
      return { status: 'ok' }
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['favorites', userId] })
    },
  })

  const importLegacyFavoritesMutation = useMutation({
    mutationFn: async ({ wikiSlugs } = {}) => {
      if (!userId) return { status: 'skipped' }
      const slugs = Array.isArray(wikiSlugs)
        ? wikiSlugs
            .map((s) => (typeof s === 'string' ? s.trim() : ''))
            .filter(Boolean)
        : []
      if (slugs.length === 0) return { status: 'skipped' }

      const supabase = getSupabase()
      await ensureProfileExists({ supabase, userId, user })

      const rows = slugs.map((slug) => ({ user_id: userId, wiki_slug: slug }))
      const { error } = await supabase.from('favorites').upsert(rows, {
        onConflict: 'user_id,wiki_slug',
        ignoreDuplicates: true,
      })
      if (error) throw error
      return { status: 'ok', imported: rows.length }
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['favorites', userId] })
    },
  })

  return {
    favorites: favoritesQuery.data ?? [],
    favoritesQuery,
    addFavorite: addFavoriteMutation.mutateAsync,
    removeFavorite: removeFavoriteMutation.mutateAsync,
    addFavoriteMutation,
    removeFavoriteMutation,
    importLegacyFavorites: importLegacyFavoritesMutation.mutateAsync,
    importLegacyFavoritesMutation,
  }
}

