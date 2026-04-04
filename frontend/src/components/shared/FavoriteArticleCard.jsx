import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'

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
        'flex gap-3 border border-slate-200 p-3',
        clickable
          ? 'cursor-pointer opacity-90 hover:opacity-100 transition-opacity duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30'
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
      <div className="h-[100px] w-[100px] shrink-0 bg-slate-100">
        {imageUrl ? (
          <img
            src={imageUrl}
            alt=""
            className="h-full w-full object-cover"
            loading="lazy"
            referrerPolicy="no-referrer"
          />
        ) : (
          <div className="grid h-full w-full place-items-center text-xl font-semibold text-primary/30">
            {String(title).trim().slice(0, 1).toUpperCase()}
          </div>
        )}
      </div>

      {/* Text */}
      <div className="flex min-w-0 flex-1 flex-col gap-1 py-0.5">
        <div className="self-start bg-primary px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-white">
          Interesting
        </div>
        <div className="line-clamp-2 text-lg font-semibold leading-tight text-primary">
          {title}
        </div>
        <div className="text-xs text-primary">
          {savedAtText ? `Marked ${savedAtText}` : 'Marked —'}
        </div>
      </div>
    </article>
  )
}
