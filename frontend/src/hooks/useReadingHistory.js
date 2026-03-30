import { useQuery } from '@tanstack/react-query'

import { getSupabase } from '../lib/supabaseClient'

export function useReadingHistory({ userId } = {}) {
  return useQuery({
    queryKey: ['readingHistory', userId],
    enabled: Boolean(userId),
    queryFn: async () => {
      const supabase = getSupabase()
      const { data, error } = await supabase
        .from('reading_log')
        .select(
          `
          wiki_slug,
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
        .order('read_date', { ascending: false })

      if (error) throw error
      return data ?? []
    },
  })
}

