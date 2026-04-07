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

      let resolvedChallenge = challenge
      if (!resolvedChallenge) {
        // No challenge for today — fall back to the most recent previous one
        const { data: previousChallenge, error: prevErr } = await supabase
          .from('game_challenges')
          .select('id, start_slug, target_slug')
          .eq('type', 'daily')
          .lt('date', todayUtc)
          .order('date', { ascending: false })
          .limit(1)
          .maybeSingle()

        if (prevErr) throw prevErr
        if (!previousChallenge) return { challenge: null, startArticle: null, targetArticle: null }
        resolvedChallenge = previousChallenge
      }

      const { data: articles, error: articlesErr } = await supabase
        .from('articles')
        .select('wiki_slug, display_title, image_url, description')
        .in('wiki_slug', [resolvedChallenge.start_slug, resolvedChallenge.target_slug])

      if (articlesErr) throw articlesErr

      const bySlug = Object.fromEntries((articles ?? []).map((a) => [a.wiki_slug, a]))
      return {
        challenge: resolvedChallenge,
        startArticle: bySlug[resolvedChallenge.start_slug] ?? null,
        targetArticle: bySlug[resolvedChallenge.target_slug] ?? null,
      }
    },
    staleTime: 5 * 60 * 1000,
  })
}
