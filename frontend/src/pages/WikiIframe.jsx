import { useEffect, useMemo, useRef, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { fetchWikipediaRandomPage } from '../lib/wikipedia'
import { todayUtcYmd } from '../lib/date'
import { useUserProgress } from '../hooks/useUserProgress'
import { getSupabase } from '../lib/supabaseClient'
import { fetchWikipediaSummary } from '../lib/wikipedia'
import { useFavorites } from '../hooks/useFavorites'
import { buildAuthUrl } from '../lib/returnTo'

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
    wiki_slug: titleToWikiSlug(normalizedTitle) || wikiSlug,
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

export default function WikiIframe() {
  const { wikiSlug } = useParams()
  const location = useLocation()
  const navigate = useNavigate()
  const { userId, user, markAsRead, markAsReadMutation } = useUserProgress()
  const {
    favorites,
    favoritesQuery,
    addFavorite,
    removeFavorite,
    addFavoriteMutation,
    removeFavoriteMutation,
    importLegacyFavorites,
  } = useFavorites({ userId, user })

  const wikiUrl = useMemo(() => {
    const slug = typeof wikiSlug === 'string' ? wikiSlug.trim() : ''
    if (!slug) return null
    return `https://en.wikipedia.org/wiki/${encodeURIComponent(slug)}`
  }, [wikiSlug])

  const displayTitle =
    location.state && typeof location.state.displayTitle === 'string'
      ? location.state.displayTitle
      : null
  const readingSource =
    location.state && typeof location.state.source === 'string'
      ? location.state.source
      : 'daily'
  const readDateYmd = todayUtcYmd()

  const [notes, setNotes] = useState('')
  const [isRandomLoading, setIsRandomLoading] = useState(false)
  const [randomError, setRandomError] = useState(null)
  const [favoriteError, setFavoriteError] = useState(null)
  const [isToolsOpen, setIsToolsOpen] = useState(false)

  const [showFallback, setShowFallback] = useState(false)
  const timeoutRef = useRef(null)
  const timedOutRef = useRef(false)
  const lastAutoLogKeyRef = useRef(null)

  // Default to a focused reading view: keep tools collapsed on each article open.
  useEffect(() => {
    setIsToolsOpen(false)
  }, [wikiSlug])

  const isFavorite = useMemo(() => {
    if (!wikiSlug) return false
    return favorites.some((fav) => fav?.wiki_slug === wikiSlug)
  }, [favorites, wikiSlug])

  const isFavoriteMutating =
    addFavoriteMutation.isPending || removeFavoriteMutation.isPending

  // Load per-article notes from localStorage.
  useEffect(() => {
    if (!wikiSlug) return
    try {
      const rawNotes = window.localStorage.getItem(
        `wikidaily:notes:${String(wikiSlug)}`,
      )
      setNotes(rawNotes ?? '')
    } catch {
      setNotes('')
    }
  }, [wikiSlug])

  // Optional one-time import: migrate legacy localStorage favorites into the DB.
  useEffect(() => {
    if (!userId) return
    const migrationKey = `wikidaily:favorites:migrated:${String(userId)}`

    try {
      if (window.localStorage.getItem(migrationKey) === '1') return
    } catch {
      // If storage is unavailable, skip migration silently.
      return
    }

    let legacy = []
    try {
      const raw = window.localStorage.getItem('wikidaily:favorites') ?? '[]'
      const parsed = JSON.parse(raw)
      legacy = Array.isArray(parsed) ? parsed : []
    } catch {
      legacy = []
    }

    if (legacy.length === 0) {
      try {
        window.localStorage.setItem(migrationKey, '1')
      } catch {
        // ignore
      }
      return
    }

    void importLegacyFavorites({ wikiSlugs: legacy })
      .then(() => {
        try {
          window.localStorage.setItem(migrationKey, '1')
          window.localStorage.removeItem('wikidaily:favorites')
        } catch {
          // ignore
        }
      })
      .catch(() => {
        // Best-effort: do not block the page if migration fails.
      })
  }, [importLegacyFavorites, userId])

  // Persist notes for the current article.
  useEffect(() => {
    if (!wikiSlug) return
    try {
      window.localStorage.setItem(
        `wikidaily:notes:${String(wikiSlug)}`,
        notes ?? '',
      )
    } catch {
      // Ignore storage failures (e.g. private mode).
    }
  }, [wikiSlug, notes])

  function handleToggleFavorite() {
    if (!wikiSlug) return
    setFavoriteError(null)

    if (!userId) {
      const returnTo = `${location.pathname}${location.search ?? ''}${location.hash ?? ''}`
      navigate(buildAuthUrl({ returnTo }), { replace: false })
      return
    }

    if (favoritesQuery.isLoading) return
    if (isFavoriteMutating) return

    if (isFavorite) {
      void removeFavorite({ wikiSlug }).catch((err) => {
        setFavoriteError(err instanceof Error ? err.message : 'Could not remove favorite')
      })
      return
    }

    void addFavorite({ wikiSlug }).catch((err) => {
      setFavoriteError(err instanceof Error ? err.message : 'Could not add favorite')
    })
  }

  async function handleRandomArticleClick() {
    if (isRandomLoading) return
    setIsRandomLoading(true)
    setRandomError(null)

    try {
      const { wikiSlug: randomSlug, title } = await fetchWikipediaRandomPage()
      // Best-effort: cache the random article in Supabase so `reading_log` FK inserts can succeed.
      async function cacheRandomArticle() {
        try {
          const summary = await fetchWikipediaSummary(randomSlug)
          const row = buildRandomArticleRow({
            wikiSlug: randomSlug,
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
      navigate(`/wiki/${encodeURIComponent(randomSlug)}`, {
        state: { displayTitle: title, source: 'random' },
      })
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Failed to load random page'
      setRandomError(message)
    } finally {
      setIsRandomLoading(false)
    }
  }

  // Auto-log random reads for signed-in users.
  // Daily reads remain an explicit action on the Home page (Phase flow).
  useEffect(() => {
    if (!wikiSlug) return
    if (!userId) return
    if (readingSource !== 'random') return

    const key = `${userId}:${String(wikiSlug)}:${readDateYmd}:${readingSource}`
    if (lastAutoLogKeyRef.current === key) return
    if (markAsReadMutation.isPending) return

    lastAutoLogKeyRef.current = key
    void markAsRead({ wikiSlug, readDateYmd, source: 'random' }).catch(() => {
      // Auto-log is best-effort.
    })
  }, [wikiSlug, userId, readingSource, readDateYmd, markAsRead, markAsReadMutation.isPending])

  // Timed fallback: `iframe` framing blocks can be silent, and `onError` is not reliable.
  useEffect(() => {
    if (!wikiUrl) return
    timedOutRef.current = false

    if (timeoutRef.current) clearTimeout(timeoutRef.current)

    // Hide fallback immediately after `wikiUrl` changes, but do it asynchronously
    // to satisfy the `react-hooks/set-state-in-effect` lint rule.
    setTimeout(() => setShowFallback(false), 0)
    timeoutRef.current = setTimeout(() => {
      timedOutRef.current = true
      setShowFallback(true)
      timeoutRef.current = null
    }, 3000)

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current)
      timeoutRef.current = null
    }
  }, [wikiUrl])

  // If the iframe loads within the window, assume embedding is at least partially allowed.
  function handleIframeLoad() {
    if (!wikiUrl) return
    if (timedOutRef.current) return
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
      timeoutRef.current = null
    }
    setShowFallback(false)
  }

  if (!wikiUrl) {
    return (
      <section className="space-y-4">
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-5">
          <div className="text-sm font-medium text-rose-900">
            Missing article slug
          </div>
          <div className="mt-1 text-sm text-rose-800">
            This page needs a valid wiki article identifier.
          </div>
        </div>
      </section>
    )
  }

  return (
    <section className="space-y-4">
      <div className="flex flex-col gap-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="text-xs font-medium text-slate-500">
            {displayTitle ?? wikiSlug?.replaceAll('_', ' ')}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setIsToolsOpen((open) => !open)}
              className="rounded-none border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100"
            >
              {isToolsOpen ? 'Hide notes' : 'Notes'}
            </button>
            <button
              type="button"
              onClick={handleToggleFavorite}
              disabled={favoritesQuery.isLoading || isFavoriteMutating}
              className="rounded-none border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-800 hover:bg-slate-100"
            >
              {isFavorite ? '★ Favorited' : '☆ Add to favorites'}
            </button>
            <button
              type="button"
              onClick={handleRandomArticleClick}
              disabled={isRandomLoading}
              className="rounded-none bg-primary px-3 py-1.5 text-xs font-medium text-white hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-70"
            >
              {isRandomLoading ? 'Loading random article…' : 'New random article'}
            </button>
          </div>
        </div>
        {randomError ? (
          <div className="text-xs text-rose-700">{randomError}</div>
        ) : null}
        {favoriteError ? (
          <div className="text-xs text-rose-700">{favoriteError}</div>
        ) : null}
      </div>

      <div className="flex flex-col gap-4 lg:flex-row">
        <div className="grow lg:basis-3/4 xl:basis-4/5">
          <div className="relative overflow-hidden rounded-none border border-slate-200 bg-white">
            {showFallback ? (
              <div className="absolute inset-0 flex items-center justify-center bg-white/90 p-6">
                <a
                  href={wikiUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-none bg-primary px-4 py-3 text-sm font-medium text-white hover:bg-primary-hover"
                >
                  Open in Wikipedia (new tab)
                </a>
              </div>
            ) : null}

            <iframe
              key={wikiUrl}
              title={displayTitle ?? 'Wikipedia article'}
              src={wikiUrl}
              onLoad={handleIframeLoad}
              className="h-[85vh] w-full border-0 bg-white"
            />
          </div>
        </div>

        {isToolsOpen ? (
          <aside className="w-full shrink-0 rounded-none border border-slate-200 bg-slate-50 p-4 lg:w-60 xl:w-72">
            <div className="mb-3 flex items-center justify-between gap-2">
              <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Article tools
              </div>
            </div>
            <div className="space-y-3">
              <div className="pt-2">
                <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Notes for this article
                </div>
                <textarea
                  value={notes}
                  onChange={(event) => setNotes(event.target.value)}
                  rows={8}
                  className="block w-full resize-none rounded-none border border-slate-300 bg-white p-2 text-sm text-slate-900 shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
                  placeholder="Write your thoughts, key takeaways, or questions…"
                />
                <div className="mt-1 text-[11px] text-slate-500">
                  Saved locally in this browser, per article.
                </div>
              </div>
            </div>
          </aside>
        ) : null}
      </div>
    </section>
  )
}

