import { useQuery } from '@tanstack/react-query'

import { getSupabase } from '../lib/supabaseClient'

export function useDailyArchive({ limit = 60, from = null, to = null } = {}) {
  return useQuery({
    queryKey: ['dailyArchive', { limit, from, to }],
    queryFn: async () => {
      const supabase = getSupabase()
      let query = supabase
        .from('articles')
        .select('featured_date,wiki_slug,display_title,image_url,description')
        .eq('is_daily', true)

      if (from) query = query.gte('featured_date', from)
      if (to) query = query.lte('featured_date', to)

      // Default behavior: latest-first archive cards.
      query = query.order('featured_date', { ascending: Boolean(from || to) })
      if (!from && !to) query = query.limit(limit)

      const { data, error } = await query

      if (error) throw error
      return (data ?? []).map((r) => ({ ...r, date: r.featured_date }))
    },
  })
}

