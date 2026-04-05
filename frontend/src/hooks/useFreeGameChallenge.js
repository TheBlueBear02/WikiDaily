import { useMutation } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import {
  fetchWikipediaRandomPage,
  fetchWikipediaSummary,
  normalizeWikiSlugForDb,
} from '../lib/wikipedia'
import { pickRandomTarget } from '../lib/freeGameTargets'
import { getSupabase } from '../lib/supabaseClient'

async function generateFreeChallenge() {
  // Step 1: fetch random start article with image (retry up to 5 times)
  let startSummary = null
  let startSlug = null
  for (let attempt = 0; attempt < 5; attempt++) {
    const { wikiSlug } = await fetchWikipediaRandomPage()
    const summary = await fetchWikipediaSummary(wikiSlug)
    if (summary.originalimage?.source || summary.thumbnail?.source) {
      startSummary = summary
      startSlug = normalizeWikiSlugForDb(wikiSlug)
      break
    }
  }
  if (!startSummary || !startSlug) {
    throw new Error('Could not find a random article with an image. Please try again.')
  }

  // Step 2: pick target (exclude start slug)
  const targetSlug = pickRandomTarget(startSlug)

  // Step 3: fetch target metadata
  const targetSummary = await fetchWikipediaSummary(targetSlug)

  const startArticle = {
    wiki_slug: startSlug,
    display_title: startSummary.title ?? startSlug.replaceAll('_', ' '),
    image_url: startSummary.originalimage?.source ?? startSummary.thumbnail?.source ?? null,
    description: startSummary.extract ?? null,
  }

  const targetArticle = {
    wiki_slug: targetSlug,
    display_title: targetSummary.title ?? targetSlug.replaceAll('_', ' '),
    image_url: targetSummary.originalimage?.source ?? targetSummary.thumbnail?.source ?? null,
    description: targetSummary.extract ?? null,
  }

  const supabase = getSupabase()

  // Step 4: upsert both articles
  const { error: articlesError } = await supabase
    .from('articles')
    .upsert(
      [
        { wiki_slug: startArticle.wiki_slug, display_title: startArticle.display_title, image_url: startArticle.image_url, is_daily: false },
        { wiki_slug: targetArticle.wiki_slug, display_title: targetArticle.display_title, image_url: targetArticle.image_url, is_daily: false },
      ],
      { onConflict: 'wiki_slug', ignoreDuplicates: true }
    )
  if (articlesError) throw articlesError

  // Step 5: create game_challenges row via RPC (table is service-role only; RPC uses SECURITY DEFINER)
  const { data: challengeId, error: challengeError } = await supabase
    .rpc('create_free_game_challenge', { p_start_slug: startSlug, p_target_slug: targetSlug })
  if (challengeError) throw challengeError

  return { challengeId, startArticle, targetArticle }
}

export function useFreeGameChallenge() {
  const navigate = useNavigate()

  return useMutation({
    mutationFn: generateFreeChallenge,
    onSuccess: ({ challengeId, startArticle, targetArticle }) => {
      navigate('/game/free/play', {
        state: { challengeId, startArticle, targetArticle },
      })
    },
  })
}
