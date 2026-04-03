import { getSupabase } from './supabaseClient'
import { fetchWikipediaRandomPage, fetchWikipediaSummary } from './wikipedia'

function titleToWikiSlug(title) {
  return String(title ?? '')
    .trim()
    .replaceAll(' ', '_')
}

function buildRandomArticleRow({ wikiSlug, fallbackTitle, summary }) {
  const normalizedTitle =
    summary?.titles?.normalized ??
    summary?.title ??
    fallbackTitle ??
    wikiSlug.replaceAll('_', ' ')

  return {
    wiki_slug: titleToWikiSlug(wikiSlug) || wikiSlug,
    display_title:
      String(summary?.title ?? '').trim() ||
      String(summary?.displaytitle ?? '').replace(/<[^>]*>/g, '').trim() ||
      fallbackTitle ||
      wikiSlug.replaceAll('_', ' '),
    image_url: summary?.originalimage?.source ?? null,
    description: summary?.extract ?? null,
    is_daily: false,
    featured_date: null,
  }
}

async function cacheRandomArticle({ wikiSlug, title }) {
  try {
    const summary = await fetchWikipediaSummary(wikiSlug)
    const row = buildRandomArticleRow({
      wikiSlug,
      fallbackTitle: title,
      summary,
    })
    const supabase = getSupabase()
    const { error: upsertErr } = await supabase.from('articles').upsert(row, {
      onConflict: 'wiki_slug',
      ignoreDuplicates: false,
    })
    if (upsertErr) throw upsertErr
  } catch (cacheErr) {
    console.warn('Random article cache skipped:', cacheErr)
  }
}

/**
 * Fetches a random Wikipedia page, navigates to `/wiki/:slug` with random-reader state,
 * and best-effort upserts the article row for `reading_log` FK compatibility.
 */
export async function navigateToRandomWikiArticle(navigate) {
  const { wikiSlug, title } = await fetchWikipediaRandomPage()
  navigate(`/wiki/${encodeURIComponent(wikiSlug)}`, {
    state: { displayTitle: title, source: 'random' },
  })
  void cacheRandomArticle({ wikiSlug, title })
}
