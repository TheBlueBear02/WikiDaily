import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'

function parseYmdAsUtcDate(ymd) {
  if (typeof ymd !== 'string') return null
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(ymd.trim())
  if (!match) return null
  const y = Number(match[1])
  const m = Number(match[2])
  const d = Number(match[3])
  if (!Number.isFinite(y) || !Number.isFinite(m) || !Number.isFinite(d)) return null
  return new Date(Date.UTC(y, m - 1, d))
}

function formatReadDate(ymd) {
  const d = parseYmdAsUtcDate(ymd)
  if (!d) return null
  return new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(d)
}

function sourceLabel(source) {
  if (source === 'daily') return 'Daily'
  if (source === 'link') return 'Link'
  if (source === 'search') return 'Search'
  return 'Random'
}

function sourceBadgeClass(source) {
  if (source === 'daily') return 'bg-amber-400 text-amber-950'
  if (source === 'link') return 'bg-sky-400 text-sky-950'
  if (source === 'search') return 'bg-violet-400 text-violet-950'
  return 'bg-emerald-400 text-emerald-950'
}

export default function ArticleHistoryCard({ entry, variant = 'dark' }) {
  const navigate = useNavigate()

  const wikiSlug =
    typeof entry?.wiki_slug === 'string' && entry.wiki_slug.trim() ? entry.wiki_slug.trim() : null

  const title =
    typeof entry?.articles?.display_title === 'string' && entry.articles.display_title.trim()
      ? entry.articles.display_title.trim()
      : wikiSlug
        ? wikiSlug.replaceAll('_', ' ')
        : 'Unknown article'

  const imageUrl =
    typeof entry?.articles?.image_url === 'string' && entry.articles.image_url.trim()
      ? entry.articles.image_url.trim()
      : null

  const readDateText = useMemo(() => formatReadDate(entry?.read_date ?? null), [entry?.read_date])
  const rawSource = typeof entry?.source === 'string' ? entry.source : ''
  const source =
    rawSource === 'daily' ||
    rawSource === 'link' ||
    rawSource === 'random' ||
    rawSource === 'search'
      ? rawSource
      : 'random'

  const clickable = Boolean(wikiSlug)

  const onOpen = () => {
    if (!wikiSlug) return
    navigate(`/wiki/${encodeURIComponent(wikiSlug)}`, {
      state: {
        displayTitle: title,
        ...(source ? { source } : {}),
      },
    })
  }

  return (
    <article
      className={[
        'flex gap-3',
        variant === 'light' ? 'border border-slate-200 p-3 bg-white group' : '',
        clickable
          ? 'cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30'
          : 'opacity-60',
      ].join(' ')}
      onClick={clickable ? onOpen : undefined}
      onKeyDown={
        clickable
          ? (e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault()
                onOpen()
              }
            }
          : undefined
      }
      role={clickable ? 'link' : undefined}
      tabIndex={clickable ? 0 : undefined}
      aria-label={clickable ? `Open ${title}` : `${title} (unavailable)`}
    >
      {/* Image */}
      <div className={['h-[100px] w-[100px] shrink-0', variant === 'light' ? 'bg-slate-100' : 'bg-white/10'].join(' ')}>
        {imageUrl ? (
          <img
            src={imageUrl}
            alt=""
            className="h-full w-full object-cover"
            loading="lazy"
            referrerPolicy="no-referrer"
          />
        ) : variant === 'light' ? (
          <div className="grid h-full w-full place-items-center">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect x="3" y="3" width="18" height="18" rx="2" stroke="#CBD5E1" strokeWidth="1.5"/>
              <circle cx="8.5" cy="8.5" r="1.5" fill="#CBD5E1"/>
              <path d="M3 15l5-5 4 4 3-3 6 6" stroke="#CBD5E1" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
        ) : (
          <div className="grid h-full w-full place-items-center text-xl font-semibold text-white/40">
            {String(title).trim().slice(0, 1).toUpperCase()}
          </div>
        )}
      </div>

      {/* Text */}
      <div className="flex min-w-0 flex-1 flex-col gap-1 py-0.5">
        <div
          className={[
            'self-start px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider',
            sourceBadgeClass(source),
          ].join(' ')}
        >
          {sourceLabel(source)}
        </div>
        <div className={['line-clamp-2 text-lg font-semibold leading-tight', variant === 'light' ? 'text-primary group-hover:underline underline-offset-2' : 'text-white'].join(' ')}>
          {title}
        </div>
        <div className={['text-xs', variant === 'light' ? 'text-primary' : 'text-white'].join(' ')}>
          {readDateText ?? entry?.read_date ?? '—'}
        </div>
      </div>
    </article>
  )
}
