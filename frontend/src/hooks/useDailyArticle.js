import { useQuery } from '@tanstack/react-query'

import { getSupabase } from '../lib/supabaseClient'
import { todayUtcYmd } from '../lib/date'

export function useDailyArticle() {
  const todayStr = todayUtcYmd()

  const query = useQuery({
    queryKey: ['dailyArticle', todayStr],
    queryFn: async () => {
      const supabase = getSupabase()
      const { data, error } = await supabase
        .from('articles')
        .select('featured_date,wiki_slug,display_title,image_url,description')
        .eq('featured_date', todayStr)
        .eq('is_daily', true)
        .maybeSingle()

      if (error) throw error
      if (data) {
        return { row: { ...data, date: data.featured_date } }
      }

      const { data: latest, error: latestErr } = await supabase
        .from('articles')
        .select('featured_date,wiki_slug,display_title,image_url,description')
        .eq('is_daily', true)
        .order('featured_date', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (latestErr) throw latestErr
      if (!latest) return { row: null }
      return { row: { ...latest, date: latest.featured_date } }
    },
  })

  const dailyArticle = query.data?.row ?? null

  return {
    todayStr,
    dailyArticle,
    wikiSlug: dailyArticle?.wiki_slug ?? null,
    ...query,
  }
}

