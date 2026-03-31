import { useEffect, useId, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { fetchWikipediaOpenSearch } from '../lib/wikipedia'

function titleToWikiSlug(title) {
  return String(title ?? '')
    .trim()
    .replaceAll(' ', '_')
}

export default function WikiSearchBar({ className = '' }) {
  const navigate = useNavigate()
  const inputId = useId()
  const listId = useId()
  const rootRef = useRef(null)
  const [query, setQuery] = useState('')
  const [titles, setTitles] = useState([])
  const [descriptions, setDescriptions] = useState([])
  const [activeIndex, setActiveIndex] = useState(-1)
  const [isOpen, setIsOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [fetchError, setFetchError] = useState(null)

  function goToTitle(title) {
    const t = String(title ?? '').trim()
    if (!t) return
    const slug = titleToWikiSlug(t)
    if (!slug) return
    setIsOpen(false)
    setQuery('')
    setTitles([])
    setDescriptions([])
    setActiveIndex(-1)
    navigate(`/wiki/${encodeURIComponent(slug)}`, {
      state: { displayTitle: t, source: 'search' },
    })
  }

  useEffect(() => {
    const q = query.trim()
    if (q.length < 2) {
      setTitles([])
      setDescriptions([])
      setFetchError(null)
      setIsLoading(false)
      setActiveIndex(-1)
      setIsOpen(false)
      return
    }

    const ac = new AbortController()
    const t = window.setTimeout(async () => {
      setIsLoading(true)
      setFetchError(null)
      try {
        const { titles: nextTitles, descriptions: nextDesc } =
          await fetchWikipediaOpenSearch(q, { limit: 8 })
        if (ac.signal.aborted) return
        setTitles(nextTitles)
        setDescriptions(nextDesc)
        setActiveIndex(-1)
        setIsOpen(nextTitles.length > 0)
      } catch (err) {
        if (ac.signal.aborted) return
        setTitles([])
        setDescriptions([])
        setFetchError(err instanceof Error ? err.message : 'Search failed')
        setIsOpen(false)
      } finally {
        if (!ac.signal.aborted) setIsLoading(false)
      }
    }, 280)

    return () => {
      ac.abort()
      window.clearTimeout(t)
    }
  }, [query])

  useEffect(() => {
    if (!isOpen) return

    function onPointerDown(e) {
      const root = rootRef.current
      if (!root || root.contains(e.target)) return
      setIsOpen(false)
    }

    document.addEventListener('pointerdown', onPointerDown)
    return () => document.removeEventListener('pointerdown', onPointerDown)
  }, [isOpen])

  function onSubmit(e) {
    e.preventDefault()
    if (activeIndex >= 0 && titles[activeIndex]) {
      goToTitle(titles[activeIndex])
      return
    }
    if (titles[0]) {
      goToTitle(titles[0])
      return
    }
    const raw = query.trim()
    if (raw.length >= 1) goToTitle(raw)
  }

  function onKeyDown(e) {
    if (!isOpen || titles.length === 0) return
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActiveIndex((i) => (i + 1) % titles.length)
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActiveIndex((i) => (i <= 0 ? titles.length - 1 : i - 1))
    } else if (e.key === 'Escape') {
      e.preventDefault()
      setIsOpen(false)
    }
  }

  return (
    <div ref={rootRef} className={['relative min-w-0', className].filter(Boolean).join(' ')}>
      <form onSubmit={onSubmit} role="search">
        <label htmlFor={inputId} className="sr-only">
          Search Wikipedia articles
        </label>
        <div className="relative flex items-center">
          <span
            className="pointer-events-none absolute left-2.5 text-slate-400"
            aria-hidden
          >
            <svg viewBox="0 0 24 24" width="18" height="18" className="block">
              <path
                fill="currentColor"
                d="M15.5 14h-.79l-.28-.27A6.471 6.471 0 0 0 16 9.5 6.5 6.5 0 1 0 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5Zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14Z"
              />
            </svg>
          </span>
          <input
            id={inputId}
            type="search"
            name="wiki-search"
            autoComplete="off"
            autoCorrect="off"
            spellCheck={false}
            placeholder="Search articles…"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value)
              if (e.target.value.trim().length >= 2) setIsOpen(true)
            }}
            onFocus={() => {
              if (titles.length > 0) setIsOpen(true)
            }}
            onKeyDown={onKeyDown}
            aria-autocomplete="list"
            aria-controls={isOpen && titles.length > 0 ? listId : undefined}
            aria-expanded={isOpen && titles.length > 0}
            className="w-full border border-slate-200 bg-white py-2 pl-9 pr-3 text-sm text-slate-800 placeholder:text-slate-400 focus:border-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-400"
          />
          {isLoading ? (
            <span className="pointer-events-none absolute right-2.5 text-xs text-slate-400">
              …
            </span>
          ) : null}
        </div>
      </form>

      {fetchError && query.trim().length >= 2 ? (
        <p className="mt-1 text-xs text-rose-600" role="status">
          {fetchError}
        </p>
      ) : null}

      {isOpen && titles.length > 0 ? (
        <ul
          id={listId}
          role="listbox"
          className="absolute left-0 right-0 top-full z-50 mt-1 max-h-72 overflow-auto border border-slate-200 bg-white py-1 shadow-lg"
        >
          {titles.map((title, i) => (
            <li key={`${title}-${i}`} role="presentation">
              <button
                type="button"
                role="option"
                aria-selected={i === activeIndex}
                className={[
                  'w-full px-3 py-2 text-left text-sm',
                  i === activeIndex ? 'bg-slate-100 text-primary' : 'text-slate-800',
                ].join(' ')}
                onMouseEnter={() => setActiveIndex(i)}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => goToTitle(title)}
              >
                <span className="font-medium">{title}</span>
                {descriptions[i] ? (
                  <span className="mt-0.5 block line-clamp-2 text-xs font-normal text-slate-500">
                    {descriptions[i]}
                  </span>
                ) : null}
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  )
}
