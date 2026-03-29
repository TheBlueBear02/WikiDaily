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
        .from('daily_articles')
        .select('date,wiki_slug,display_title,image_url,description')
        .eq('date', todayStr)
        .maybeSingle()

      if (error) throw error
      if (data) {
        return { row: data, isFallback: false }
      }

      const { data: latest, error: latestErr } = await supabase
        .from('daily_articles')
        .select('date,wiki_slug,display_title,image_url,description')
        .order('date', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (latestErr) throw latestErr
      if (!latest) return { row: null, isFallback: false }
      return { row: latest, isFallback: true }
    },
  })

  const dailyArticle = query.data?.row ?? null
  const isFallback = query.data?.isFallback ?? false

  return {
    todayStr,
    dailyArticle,
    isFallback,
    wikiSlug: dailyArticle?.wiki_slug ?? null,
    ...query,
  }
}

