import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'

import { CARD_SURFACE_STATIC, cardInteractiveSurfaceClasses } from '../lib/cardSurface'

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
  return source === 'daily' ? 'Daily' : 'Random'
}

function sourceBadgeClass(source) {
  return source === 'daily'
    ? 'bg-amber-100 text-amber-950 border-amber-200'
    : 'bg-emerald-100 text-emerald-950 border-emerald-200'
}

export default function ArticleHistoryCard({ entry }) {
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
  const source = entry?.source === 'daily' ? 'daily' : 'random'

  const clickable = Boolean(wikiSlug)

  const onOpen = () => {
    if (!wikiSlug) return
    navigate(`/wiki/${encodeURIComponent(wikiSlug)}`)
  }

  return (
    <article
      className={[
        'relative overflow-hidden',
        clickable ? cardInteractiveSurfaceClasses() : [CARD_SURFACE_STATIC, 'opacity-90'].join(' '),
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
      <div className="relative">
        <div className="h-[100px] w-full bg-slate-100">
          {imageUrl ? (
            <img
              src={imageUrl}
              alt=""
              className="h-full w-full object-cover"
              loading="lazy"
              referrerPolicy="no-referrer"
            />
          ) : (
            <div className="grid h-full w-full place-items-center bg-amber-50 text-2xl font-semibold text-amber-900">
              {String(title).trim().slice(0, 1).toUpperCase()}
            </div>
          )}
        </div>

        <div
          className={[
            'absolute right-2 top-2 rounded-none border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide',
            sourceBadgeClass(source),
          ].join(' ')}
        >
          {sourceLabel(source)}
        </div>
      </div>

      <div className="space-y-2 p-3">
        <div className="line-clamp-2 font-serif text-sm font-semibold leading-snug text-primary">
          {title}
        </div>
        <div className="text-[11px] font-medium text-slate-500">
          {readDateText ?? entry?.read_date ?? '—'}
        </div>
      </div>
    </article>
  )
}

