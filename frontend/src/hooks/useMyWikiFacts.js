import { useQuery } from '@tanstack/react-query'

import { getSupabase } from '../lib/supabaseClient'

function filterNotDeleted(rows) {
  return (rows ?? []).filter((r) => r.is_deleted !== true)
}

const FACTS_WITH_ARTICLES_SELECT = `
          id,
          wiki_slug,
          fact_text,
          net_score,
          created_at,
          is_deleted,
          articles (
            display_title,
            image_url
          )
        `

/**
 * Signed-in user's submitted wiki_facts (non-deleted), newest first, with article metadata when available.
 */
export function useMyWikiFacts({ userId } = {}) {
  return useQuery({
    queryKey: ['myWikiFacts', userId],
    enabled: Boolean(userId),
    queryFn: async () => {
      const supabase = getSupabase()

      const a = await supabase
        .from('wiki_facts')
        .select(FACTS_WITH_ARTICLES_SELECT)
        .eq('user_id', userId)
        .eq('is_deleted', false)
        .order('created_at', { ascending: false })
      if (!a.error) return a.data ?? []

      const b = await supabase
        .from('wiki_facts')
        .select(FACTS_WITH_ARTICLES_SELECT)
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
      if (!b.error) return filterNotDeleted(b.data ?? [])

      const c = await supabase
        .from('wiki_facts')
        .select('*')
        .eq('user_id', userId)
        .eq('is_deleted', false)
        .order('created_at', { ascending: false })
      if (!c.error) return c.data ?? []

      const d = await supabase
        .from('wiki_facts')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
      if (!d.error) return filterNotDeleted(d.data ?? [])

      throw d.error ?? a.error ?? new Error('Failed to load facts')
    },
  })
}
