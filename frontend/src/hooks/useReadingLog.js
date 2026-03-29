import { useQuery } from '@tanstack/react-query'

import { getSupabase } from '../lib/supabaseClient'

export function useReadingLog({ userId } = {}) {
  return useQuery({
    queryKey: ['readingLog', userId],
    enabled: Boolean(userId),
    queryFn: async () => {
      const supabase = getSupabase()
      const { data, error } = await supabase
        .from('reading_log')
        .select('read_date')
        .eq('user_id', userId)

      if (error) throw error
      return data ?? []
    },
  })
}

