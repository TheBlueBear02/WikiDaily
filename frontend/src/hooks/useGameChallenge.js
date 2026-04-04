import { useQuery } from '@tanstack/react-query'
import { getSupabase } from '../lib/supabaseClient'
import { todayUtcYmd } from '../lib/date'

export function useGameChallenge() {
  const todayUtc = todayUtcYmd()

  return useQuery({
    queryKey: ['gameChallenge', todayUtc],
    queryFn: async () => {
      const supabase = getSupabase()

      const { data: challenge, error: challengeErr } = await supabase
        .from('game_challenges')
        .select('id, start_slug, target_slug')
        .eq('type', 'daily')
        .eq('date', todayUtc)
        .maybeSingle()

      if (challengeErr) throw challengeErr
      if (!challenge) return { challenge: null, startArticle: null, targetArticle: null }

      const { data: articles, error: articlesErr } = await supabase
        .from('articles')
        .select('wiki_slug, display_title, image_url, description')
        .in('wiki_slug', [challenge.start_slug, challenge.target_slug])

      if (articlesErr) throw articlesErr

      const bySlug = Object.fromEntries((articles ?? []).map((a) => [a.wiki_slug, a]))
      return {
        challenge,
        startArticle: bySlug[challenge.start_slug] ?? null,
        targetArticle: bySlug[challenge.target_slug] ?? null,
      }
    },
    staleTime: 5 * 60 * 1000,
  })
}
