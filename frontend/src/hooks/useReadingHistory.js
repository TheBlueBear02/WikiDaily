import { useQuery } from '@tanstack/react-query'

import { getSupabase } from '../lib/supabaseClient'

export function useReadingHistory({ userId, limit } = {}) {
  const normalizedLimit =
    typeof limit === 'number' && Number.isFinite(limit) && limit > 0 ? Math.floor(limit) : null

  return useQuery({
    queryKey: ['readingHistory', userId, normalizedLimit],
    enabled: Boolean(userId),
    queryFn: async () => {
      const supabase = getSupabase()
      let query = supabase
        .from('reading_log')
        .select(
          `
          wiki_slug,
          read_at,
          read_date,
          source,
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
        .order('read_at', { ascending: false })
        .order('read_date', { ascending: false })

      if (normalizedLimit) {
        query = query.limit(normalizedLimit)
      }

      const { data, error } = await query

      if (error) throw error
      return data ?? []
    },
  })
}

