import { useQuery } from '@tanstack/react-query'

import { getSupabase } from '../lib/supabaseClient'

export function useRecentNotes({ userId, limit } = {}) {
  const normalizedLimit =
    typeof limit === 'number' && Number.isFinite(limit) && limit > 0 ? Math.floor(limit) : null

  return useQuery({
    queryKey: ['recentNotes', userId, normalizedLimit ?? 'all'],
    enabled: Boolean(userId),
    queryFn: async () => {
      const supabase = getSupabase()
      let query = supabase
        .from('article_notes')
        .select(
          `
          wiki_slug,
          content,
          created_at,
          updated_at,
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
        .order('updated_at', { ascending: false })
        .order('created_at', { ascending: false })

      if (normalizedLimit) {
        query = query.limit(normalizedLimit)
      }

      const { data, error } = await query
      if (error) throw error
      return data ?? []
    },
  })
}

