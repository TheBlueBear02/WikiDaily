import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'

import { CARD_SURFACE_STATIC, cardInteractiveSurfaceClasses } from '../../lib/cardSurface'

function formatSavedAt(isoString) {
  if (typeof isoString !== 'string') return null
  const d = new Date(isoString)
  if (!Number.isFinite(d.getTime())) return null
  return new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(d)
}

export default function FavoriteArticleCard({ entry }) {
  const navigate = useNavigate()

  const wikiSlug =
    typeof entry?.wiki_slug === 'string' && entry.wiki_slug.trim()
      ? entry.wiki_slug.trim()
      : null

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

  const savedAtText = useMemo(
    () => formatSavedAt(entry?.created_at ?? null),
    [entry?.created_at],
  )

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
      </div>

      <div className="space-y-2 p-3">
        <div className="line-clamp-2 text-base font-semibold leading-tight tracking-tight text-primary">
          {title}
        </div>
        <div className="text-xs text-slate-500">
          {savedAtText ? `Marked ${savedAtText}` : 'Marked —'}
        </div>
      </div>
    </article>
  )
}

