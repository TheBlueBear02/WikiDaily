import { useQuery } from '@tanstack/react-query'

import { getSupabase } from '../lib/supabaseClient'

/**
 * Total articles logged by all users (`COUNT(*)` on `reading_log`).
 *
 * Requires public Supabase RPC:
 *   public.collective_reads_count()
 * returning a single bigint (see agents/WikiDaily_Database.md).
 */
export function useCollectiveReadingTotal() {
  return useQuery({
    queryKey: ['collectiveReadingTotal'],
    queryFn: async () => {
      const supabase = getSupabase()
      const { data, error } = await supabase.rpc('collective_reads_count')

      if (error) throw error

      const n =
        typeof data === 'number'
          ? data
          : typeof data === 'string'
            ? Number(data)
            : Number(data)

      return Math.max(0, Number.isFinite(n) ? Math.floor(n) : 0)
    },
    staleTime: 30_000,
  })
}
