import { useQuery } from '@tanstack/react-query'

import { getSupabase } from '../lib/supabaseClient'

export function useDailyArchive({ limit = 60 } = {}) {
  return useQuery({
    queryKey: ['dailyArchive', limit],
    queryFn: async () => {
      const supabase = getSupabase()
      const { data, error } = await supabase
        .from('daily_articles')
        .select('date,wiki_slug,display_title,image_url,description')
        .order('date', { ascending: false })
        .limit(limit)

      if (error) throw error
      return data ?? []
    },
  })
}

