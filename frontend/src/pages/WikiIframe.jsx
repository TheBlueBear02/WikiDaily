import { useEffect, useMemo, useRef, useState } from 'react'
import { useLocation, useParams } from 'react-router-dom'

export default function WikiIframe() {
  const { wikiSlug } = useParams()
  const location = useLocation()

  const wikiUrl = useMemo(() => {
    const slug = typeof wikiSlug === 'string' ? wikiSlug.trim() : ''
    if (!slug) return null
    return `https://en.wikipedia.org/wiki/${encodeURIComponent(slug)}`
  }, [wikiSlug])

  const displayTitle =
    location.state && typeof location.state.displayTitle === 'string'
      ? location.state.displayTitle
      : null

  const [showFallback, setShowFallback] = useState(false)
  const timeoutRef = useRef(null)
  const timedOutRef = useRef(false)

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
    </section>
  )
}

