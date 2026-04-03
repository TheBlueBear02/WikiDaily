import { useEffect, useMemo, useRef, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import {
  fetchWikipediaRandomPage,
  fetchWikipediaHtml,
  fetchWikipediaSummary,
  normalizeWikiSlugForDb,
  parseWikiSlugFromHref,
  sanitizeWikiHtmlForIframeSrc,
} from '../lib/wikipedia'
import { todayUtcYmd } from '../lib/date'
import { useUserProgress } from '../hooks/useUserProgress'
import { getSupabase } from '../lib/supabaseClient'
import { useFavorites } from '../hooks/useFavorites'
import { buildAuthUrl } from '../lib/returnTo'
import { useArticleNote, useDeleteArticleNote, useUpsertArticleNote } from '../hooks/useArticleNote'

function titleToWikiSlug(title) {
  return String(title ?? '')
    .trim()
    .replaceAll(' ', '_')
}

function normalizeWikiSlugKey(slug) {
  try {
    return decodeURIComponent(String(slug ?? '').replace(/ /g, '_')).toLowerCase()
  } catch {
    return String(slug ?? '').replace(/ /g, '_').toLowerCase()
  }
}

function buildRandomArticleRow({ wikiSlug, fallbackTitle, summary }) {
  return {
    // IMPORTANT: Always use the route slug as the primary key. Wikipedia "normalized"
    // titles can differ from the URL slug (e.g. casing / punctuation), and using them
    // here can break FK inserts into `reading_log` that reference the route slug.
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

export default function WikiIframe() {
  const { wikiSlug } = useParams()
  const location = useLocation()
  const navigate = useNavigate()
  const { userId, user, markAsRead } = useUserProgress()
  const {
    favorites,
    favoritesQuery,
    addFavorite,
    removeFavorite,
    addFavoriteMutation,
    removeFavoriteMutation,
    importLegacyFavorites,
  } = useFavorites({ userId, user })

  /** Align with `articles.wiki_slug` (underscores; route params may contain spaces). */
  const canonicalWikiSlug = useMemo(
    () => normalizeWikiSlugForDb(wikiSlug),
    [wikiSlug],
  )

  const wikiUrl = useMemo(() => {
    if (!canonicalWikiSlug) return null
    return `https://en.wikipedia.org/wiki/${encodeURIComponent(canonicalWikiSlug)}`
  }, [canonicalWikiSlug])

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
  const [noteError, setNoteError] = useState(null)

  const [iframeHtml, setIframeHtml] = useState(null)
  const [htmlLoading, setHtmlLoading] = useState(true)
  const [htmlFetchError, setHtmlFetchError] = useState(null)
  const wikiNavCleanupRef = useRef(null)
  const readingSourceRef = useRef(readingSource)
  const wikiSlugRef = useRef(canonicalWikiSlug)
  const lastAutoLogKeyRef = useRef(null)
  const noteSaveTimeoutRef = useRef(null)

  readingSourceRef.current = readingSource
  wikiSlugRef.current = canonicalWikiSlug

  const noteQuery = useArticleNote({ userId, wikiSlug: canonicalWikiSlug })
  const upsertNoteMutation = useUpsertArticleNote({ userId, user })
  const deleteNoteMutation = useDeleteArticleNote({ userId })

  // Default to a focused reading view: keep tools collapsed on each article open.
  useEffect(() => {
    setIsToolsOpen(false)
    setNoteError(null)
  }, [canonicalWikiSlug])

  const isFavorite = useMemo(() => {
    if (!canonicalWikiSlug) return false
    return favorites.some((fav) => fav?.wiki_slug === canonicalWikiSlug)
  }, [favorites, canonicalWikiSlug])

  const isFavoriteMutating =
    addFavoriteMutation.isPending || removeFavoriteMutation.isPending

  // Best-effort: ensure this article exists in Supabase so FK inserts (notes, reads) can succeed.
  // This is intentionally best-effort because client writes may be blocked by RLS.
  useEffect(() => {
    if (!canonicalWikiSlug) return

    let cancelled = false

    async function cacheArticleRow() {
      try {
        const summary = await fetchWikipediaSummary(canonicalWikiSlug)
        if (cancelled) return
        const row = buildRandomArticleRow({
          wikiSlug: canonicalWikiSlug,
          fallbackTitle: displayTitle ?? canonicalWikiSlug.replaceAll('_', ' '),
          summary,
        })
        const supabase = getSupabase()
        const { error } = await supabase.from('articles').upsert(row, {
          onConflict: 'wiki_slug',
          ignoreDuplicates: true,
        })
        if (error) throw error
      } catch (err) {
        console.warn('Article cache skipped:', err)
      }
    }

    void cacheArticleRow()
    return () => {
      cancelled = true
    }
  }, [displayTitle, canonicalWikiSlug])

  // Load per-article notes (DB when signed in; otherwise localStorage).
  useEffect(() => {
    if (!canonicalWikiSlug) return
    if (userId) return

    try {
      const rawNotes = window.localStorage.getItem(
        `wikidaily:notes:${String(canonicalWikiSlug)}`,
      )
      setNotes(rawNotes ?? '')
    } catch {
      setNotes('')
    }
  }, [userId, canonicalWikiSlug])

  // When signed in, sync local state from the DB.
  useEffect(() => {
    if (!userId) return
    if (!canonicalWikiSlug) return
    if (!noteQuery.isSuccess) return
    setNotes(noteQuery.data?.content ?? '')
  }, [noteQuery.data?.content, noteQuery.isSuccess, userId, canonicalWikiSlug])

  // One-time import: migrate legacy localStorage notes into the DB (per user per article).
  useEffect(() => {
    if (!userId) return
    if (!canonicalWikiSlug) return
    if (!noteQuery.isSuccess) return
    if (noteQuery.data?.content) return

    const migrationKey = `wikidaily:notes:migrated:${String(userId)}:${String(canonicalWikiSlug)}`
    try {
      if (window.localStorage.getItem(migrationKey) === '1') return
    } catch {
      return
    }

    let legacy = ''
    try {
      legacy =
        window.localStorage.getItem(`wikidaily:notes:${String(canonicalWikiSlug)}`) ?? ''
    } catch {
      legacy = ''
    }
    if (!legacy) {
      try {
        window.localStorage.setItem(migrationKey, '1')
      } catch {
        // ignore
      }
      return
    }

    setNoteError(null)
    void upsertNoteMutation
      .mutateAsync({ wikiSlug: canonicalWikiSlug, content: legacy })
      .then(() => {
        try {
          window.localStorage.setItem(migrationKey, '1')
          window.localStorage.removeItem(`wikidaily:notes:${String(canonicalWikiSlug)}`)
        } catch {
          // ignore
        }
      })
      .catch((err) => {
        setNoteError(err instanceof Error ? err.message : 'Could not import legacy note')
      })
  }, [
    noteQuery.data?.content,
    noteQuery.isSuccess,
    upsertNoteMutation,
    userId,
    canonicalWikiSlug,
  ])

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

  // Persist notes for the current article:
  // - Signed out: localStorage
  // - Signed in: DB (debounced)
  useEffect(() => {
    if (!canonicalWikiSlug) return
    if (userId) return

    try {
      window.localStorage.setItem(
        `wikidaily:notes:${String(canonicalWikiSlug)}`,
        notes ?? '',
      )
    } catch {
      // Ignore storage failures (e.g. private mode).
    }
  }, [userId, canonicalWikiSlug, notes])

  useEffect(() => {
    if (!canonicalWikiSlug) return
    if (!userId) return
    if (!noteQuery.isSuccess) return
    if (notes === (noteQuery.data?.content ?? '')) return

    if (noteSaveTimeoutRef.current) clearTimeout(noteSaveTimeoutRef.current)
    noteSaveTimeoutRef.current = setTimeout(() => {
      setNoteError(null)
      void upsertNoteMutation
        .mutateAsync({ wikiSlug: canonicalWikiSlug, content: notes ?? '' })
        .catch((err) => {
          setNoteError(err instanceof Error ? err.message : 'Could not save note')
        })
    }, 500)

    return () => {
      if (noteSaveTimeoutRef.current) clearTimeout(noteSaveTimeoutRef.current)
      noteSaveTimeoutRef.current = null
    }
  }, [
    noteQuery.data?.content,
    noteQuery.isSuccess,
    notes,
    upsertNoteMutation,
    userId,
    canonicalWikiSlug,
  ])

  function handleToggleFavorite() {
    if (!canonicalWikiSlug) return
    setFavoriteError(null)

    if (!userId) {
      const returnTo = `${location.pathname}${location.search ?? ''}${location.hash ?? ''}`
      navigate(buildAuthUrl({ returnTo }), { replace: false })
      return
    }

    if (favoritesQuery.isLoading) return
    if (isFavoriteMutating) return

    if (isFavorite) {
      void removeFavorite({ wikiSlug: canonicalWikiSlug }).catch((err) => {
        setFavoriteError(err instanceof Error ? err.message : 'Could not unmark')
      })
      return
    }

    void addFavorite({ wikiSlug: canonicalWikiSlug }).catch((err) => {
      setFavoriteError(err instanceof Error ? err.message : 'Could not mark as interesting')
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

  // Auto-log reads for signed-in users when navigating into the in-app reader.
  useEffect(() => {
    if (!canonicalWikiSlug) return
    if (!userId) return

    const key = `${userId}:${canonicalWikiSlug}:${readDateYmd}:${readingSource}`
    if (lastAutoLogKeyRef.current === key) return

    lastAutoLogKeyRef.current = key
    // `reading_log.source` only allows ('daily','random'); treat search as "random".
    void markAsRead({
      wikiSlug: canonicalWikiSlug,
      readDateYmd,
      source: readingSource,
    }).catch(() => {
      if (lastAutoLogKeyRef.current === key) lastAutoLogKeyRef.current = null
    })
  }, [
    canonicalWikiSlug,
    userId,
    readingSource,
    readDateYmd,
    markAsRead,
  ])

  useEffect(() => {
    if (!canonicalWikiSlug) return

    let cancelled = false
    setHtmlLoading(true)
    setHtmlFetchError(null)
    setIframeHtml(null)

    void (async () => {
      try {
        const raw = await fetchWikipediaHtml(canonicalWikiSlug)
        if (cancelled) return
        setIframeHtml(sanitizeWikiHtmlForIframeSrc(raw))
      } catch (err) {
        if (cancelled) return
        setHtmlFetchError(
          err instanceof Error ? err.message : 'Could not load article HTML',
        )
      } finally {
        if (!cancelled) setHtmlLoading(false)
      }
    })()

    return () => {
      cancelled = true
    }
  }, [canonicalWikiSlug])

  useEffect(() => {
    return () => {
      wikiNavCleanupRef.current?.()
      wikiNavCleanupRef.current = null
    }
  }, [])

  function handleIframeDocumentLoad(event) {
    wikiNavCleanupRef.current?.()
    wikiNavCleanupRef.current = null

    const iframe = event.currentTarget
    const doc = iframe.contentDocument
    if (!doc?.body) return

    const handler = (e) => {
      const anchor = e.target?.closest?.('a')
      if (!anchor) return

      const href = anchor.getAttribute('href')
      const nextSlug = parseWikiSlugFromHref(href, doc.baseURI)
      if (!nextSlug) return

      const nextCanonical = normalizeWikiSlugForDb(nextSlug)
      if (!nextCanonical) return

      if (
        normalizeWikiSlugKey(nextCanonical) === normalizeWikiSlugKey(wikiSlugRef.current)
      ) {
        return
      }

      e.preventDefault()
      e.stopPropagation()

      const titleAttr = anchor.getAttribute('title')
      const display =
        (titleAttr && titleAttr.trim()) ||
        nextCanonical.replaceAll('_', ' ')

      navigate(`/wiki/${encodeURIComponent(nextCanonical)}`, {
        state: {
          displayTitle: display,
          source: readingSourceRef.current,
        },
      })
    }

    doc.addEventListener('click', handler, true)
    wikiNavCleanupRef.current = () => {
      doc.removeEventListener('click', handler, true)
    }
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
            {displayTitle ?? canonicalWikiSlug.replaceAll('_', ' ')}
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
              {isFavorite ? '★ Interesting' : '☆ Mark interesting'}
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
        {noteError ? <div className="text-xs text-rose-700">{noteError}</div> : null}
      </div>

      <div className="flex flex-col gap-4 lg:flex-row">
        <div className="grow lg:basis-3/4 xl:basis-4/5">
          <div className="relative overflow-hidden rounded-none border border-slate-200 bg-white">
            {htmlLoading ? (
              <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/90 p-6">
                <div className="text-sm text-slate-600">Loading article…</div>
              </div>
            ) : null}
            {htmlFetchError ? (
              <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 bg-white/95 p-6 text-center">
                <div className="text-sm text-slate-700">
                  Could not load the article in the reader.
                </div>
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

            {iframeHtml ? (
              <iframe
                key={canonicalWikiSlug}
                title={displayTitle ?? 'Wikipedia article'}
                srcDoc={iframeHtml}
                onLoad={handleIframeDocumentLoad}
                className="h-[85vh] w-full border-0 bg-white"
              />
            ) : null}
          </div>
        </div>

        {isToolsOpen ? (
          <aside className="w-full shrink-0 rounded-none border border-slate-200 bg-slate-50 p-4 lg:w-60 xl:w-72">
            <div className="mb-3 flex items-center justify-between gap-2">
              <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Article tools
              </div>
              {userId ? (
                <button
                  type="button"
                  disabled={deleteNoteMutation.isPending || upsertNoteMutation.isPending}
                  onClick={() => {
                    if (!canonicalWikiSlug) return
                    setNoteError(null)
                    setNotes('')
                    void deleteNoteMutation
                      .mutateAsync({ wikiSlug: canonicalWikiSlug })
                      .catch((err) => {
                      setNoteError(err instanceof Error ? err.message : 'Could not delete note')
                    })
                  }}
                  className="text-[11px] font-medium text-slate-600 hover:text-slate-900 disabled:opacity-60"
                >
                  Clear
                </button>
              ) : null}
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
                  {userId
                    ? upsertNoteMutation.isPending
                      ? 'Saving…'
                      : 'Saved to your account, per article.'
                    : 'Saved locally in this browser, per article.'}
                </div>
              </div>
            </div>
          </aside>
        ) : null}
      </div>
    </section>
  )
}

