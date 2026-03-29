import { useQuery } from '@tanstack/react-query'

import { getSupabase } from '../lib/supabaseClient'

export function useDailyArchive({ limit = 60, from = null, to = null } = {}) {
  return useQuery({
    queryKey: ['dailyArchive', { limit, from, to }],
    queryFn: async () => {
      const supabase = getSupabase()
      let query = supabase
        .from('daily_articles')
        .select('date,wiki_slug,display_title,image_url,description')

      if (from) query = query.gte('date', from)
      if (to) query = query.lte('date', to)

      // Default behavior: latest-first archive cards.
      query = query.order('date', { ascending: Boolean(from || to) })
      if (!from && !to) query = query.limit(limit)

      const { data, error } = await query

      if (error) throw error
      return data ?? []
    },
  })
}

