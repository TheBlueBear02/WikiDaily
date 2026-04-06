import { useQuery } from '@tanstack/react-query'

import { getSupabase } from '../lib/supabaseClient'
import { enrichFactsWithPublicSubmitters } from './useWikiFacts'

const DEFAULT_LIMIT = 10

// Use '*' to avoid 400s when optional submitter_* columns haven't been migrated yet.
const COLUMNS = '*'

/**
 * Fetches the top facts ordered by net_score descending.
 * Returns facts with submitter snapshot data for display in the leaderboard.
 * Falls back to omitting the is_deleted filter if the column is missing or RLS blocks it.
 */
export function useTopFacts({ limit = DEFAULT_LIMIT } = {}) {
  return useQuery({
    queryKey: ['topFacts', limit],
    queryFn: async () => {
      const supabase = getSupabase()

      // Try with is_deleted filter first; fall back without it for partial DB setups.
      let data, error
      ;({ data, error } = await supabase
        .from('wiki_facts')
        .select(COLUMNS)
        .eq('is_deleted', false)
        .order('net_score', { ascending: false })
        .limit(limit))

      if (error) {
        ;({ data, error } = await supabase
          .from('wiki_facts')
          .select(COLUMNS)
          .order('net_score', { ascending: false })
          .limit(limit))
      }

      if (error || !data) return []

      const rows = data.filter((r) => r.is_deleted !== true)
      const enriched = await enrichFactsWithPublicSubmitters(supabase, rows.map((row) => ({
        id: Number(row.id),
        fact_text: row.fact_text,
        net_score: Number(row.net_score ?? 0),
        up_count: Number(row.up_count ?? 0),
        down_count: Number(row.down_count ?? 0),
        wiki_slug: row.wiki_slug ?? '',
        display_title: String(row.wiki_slug ?? '').replaceAll('_', ' ').trim() || row.wiki_slug,
        user_id: row.user_id ?? null,
        submitter_username: row.submitter_username ?? null,
        submitter_total_read: row.submitter_total_read != null ? Number(row.submitter_total_read) : null,
        submitter_facts_count: row.submitter_facts_count != null ? Number(row.submitter_facts_count) : null,
        submitter_avatar_url: row.submitter_avatar_url ?? null,
      })))

      return enriched
    },
    staleTime: 2 * 60 * 1000,
  })
}
