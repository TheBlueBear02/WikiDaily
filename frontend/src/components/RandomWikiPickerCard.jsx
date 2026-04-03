import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getSupabase } from '../lib/supabaseClient'
import { fetchWikipediaRandomPage, fetchWikipediaSummary } from '../lib/wikipedia'
import { cardInteractiveSurfaceClasses } from '../lib/cardSurface'

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
    // Keep the PK aligned with the route slug to satisfy `reading_log` FK inserts.
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

export default function RandomWikiPickerCard() {
  const navigate = useNavigate()
  const [isLoading, setIsLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState(null)

  async function handleClick() {
    if (isLoading) return
    setIsLoading(true)
    setErrorMessage(null)

    try {
      const { wikiSlug, title } = await fetchWikipediaRandomPage()
      // Navigate immediately. Caching to Supabase is best-effort (may be blocked by RLS).
      setIsLoading(false)
      navigate(`/wiki/${encodeURIComponent(wikiSlug)}`, {
        state: { displayTitle: title, source: 'random' },
      })

      async function cacheRandomArticle() {
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

      void cacheRandomArticle()
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Failed to load random page'
      setErrorMessage(message)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={isLoading}
      className={[
        'flex w-full flex-col items-center justify-center px-6 py-4 text-center sm:w-[30%]',
        cardInteractiveSurfaceClasses(),
        'disabled:cursor-not-allowed disabled:opacity-70 disabled:hover:translate-y-0 disabled:hover:shadow-sm',
        'disabled:hover:bg-slate-50',
      ].join(' ')}
    >
      <img
        src="/images/random-cube-noBG.png"
        alt="Random article dice"
          className="mb-3 h-20 w-20 flex-shrink-0"
      />
      <div className="text-base font-semibold text-primary">Random Article</div>
      <div className="mt-2 text-sm text-slate-600">
        {isLoading ? 'Picking a random article...' : null}
        {!isLoading && !errorMessage
          ? 'Read a random wikipedia article'
          : null}
        {errorMessage ? <span className="text-rose-700">Error: {errorMessage}</span> : null}
      </div>
      {errorMessage ? (
        <div className="mt-2 text-xs font-medium text-rose-800">Try again</div>
      ) : null}
    </button>
  )
}

