import { Link, useNavigate } from 'react-router-dom'

import { cardInteractiveSurfaceClasses } from '../lib/cardSurface'

/** First two sentences; appends "..." when the text was truncated. */
function descriptionPreview(text) {
  if (!text?.trim()) return ''
  const trimmed = text.trim()
  const sentences = trimmed.split(/(?<=[.!?])\s+/).filter(Boolean)
  if (sentences.length <= 2) return trimmed
  return `${sentences.slice(0, 2).join(' ')}...`
}

export default function ArticleCard({
  date,
  displayTitle,
  description,
  imageUrl,
  wikiUrl,
  cardHref = null,
  navigationState = null,
  actions = null,
  isCollected = false,
  className = '',
  /** When true (e.g. hero fixed-height slot), body scrolls so the card can honor a fixed outer height. */
  bodyScrollable = false,
}) {
  const isCardClickable = Boolean(cardHref)
  const navigate = useNavigate()

  const isInternalHref =
    typeof cardHref === 'string' && cardHref.length > 0 && cardHref.startsWith('/')
  const readNowHref = cardHref ?? wikiUrl
  const isReadNowInternal =
    typeof readNowHref === 'string' && readNowHref.length > 0 && readNowHref.startsWith('/')

  const openCard = () => {
    if (!cardHref) return
    if (isInternalHref) {
      navigate(cardHref, navigationState ? { state: navigationState } : undefined)
      return
    }

    const a = document.createElement('a')
    a.href = cardHref
    a.target = '_blank'
    a.rel = 'noopener noreferrer'
    a.click()
  }

  const handleCardClick = (event) => {
    if (!isCardClickable) return
    if (event.defaultPrevented) return

    const target = event.target
    // Do not include [role="link"]: this article has role="link" for a11y; matching it would
    // swallow every click and block full-card navigation.
    if (target?.closest?.('a,button,[role="button"],input,textarea,select')) {
      return
    }

    openCard()
  }

  const handleCardKeyDown = (event) => {
    if (!isCardClickable) return
    if (event.defaultPrevented) return

    if (event.key === 'Enter') {
      openCard()
    }

    if (event.key === ' ') {
      event.preventDefault()
      openCard()
    }
  }

  return (
    <article
      className={[
        'relative h-full w-full overflow-hidden',
        bodyScrollable ? 'flex min-h-0 flex-col' : null,
        isCardClickable
          ? cardInteractiveSurfaceClasses({ collected: isCollected })
          : isCollected
            ? 'rounded-none border border-emerald-200 bg-emerald-50/80'
            : 'rounded-none border border-slate-200 bg-white',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      onClickCapture={handleCardClick}
      onKeyDown={handleCardKeyDown}
      role={isCardClickable ? 'link' : undefined}
      tabIndex={isCardClickable ? 0 : undefined}
      aria-label={
        isCardClickable
          ? isInternalHref
            ? `Open ${displayTitle} in the in-app viewer`
            : `Open ${displayTitle} on Wikipedia in a new tab`
          : undefined
      }
    >
      {isCollected ? (
        <div className="absolute right-3 top-3 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-900">
          Collected
        </div>
      ) : null}

      <div className="relative aspect-[16/9] w-full shrink-0 bg-slate-100">
        {imageUrl ? (
          <img
            src={imageUrl}
            alt=""
            className="h-full w-full object-contain object-center"
            loading="lazy"
            referrerPolicy="no-referrer"
          />
        ) : (
          <div
            className="flex h-full w-full items-center justify-center bg-gradient-to-br from-slate-100 via-slate-50 to-slate-200"
            aria-hidden
          >
            <div className="flex items-center gap-3 rounded-none border border-slate-200 bg-white/70 px-4 py-3 text-slate-700 backdrop-blur">
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                className="text-slate-600"
              >
                <path
                  d="M8 9.5C8 10.3284 7.32843 11 6.5 11C5.67157 11 5 10.3284 5 9.5C5 8.67157 5.67157 8 6.5 8C7.32843 8 8 8.67157 8 9.5Z"
                  fill="currentColor"
                />
                <path
                  d="M3 6.5C3 5.11929 4.11929 4 5.5 4H18.5C19.8807 4 21 5.11929 21 6.5V17.5C21 18.8807 19.8807 20 18.5 20H5.5C4.11929 20 3 18.8807 3 17.5V6.5ZM5.5 6C5.22386 6 5 6.22386 5 6.5V15.9L8.3 12.6C8.69052 12.2095 9.32369 12.2095 9.71421 12.6L12.2 15.0858L15.3 11.9858C15.6905 11.5953 16.3237 11.5953 16.7142 11.9858L19 14.2716V6.5C19 6.22386 18.7761 6 18.5 6H5.5Z"
                  fill="currentColor"
                />
              </svg>
              <div className="text-sm font-medium">No image available</div>
            </div>
          </div>
        )}

        <div
          className="pointer-events-none absolute bottom-4 start-0 bg-primary px-4 py-2.5 text-sm font-bold text-white"
          aria-hidden
        >
          {"Today's article"}
        </div>
      </div>

      <div
        className={[
          'space-y-3 p-5',
          bodyScrollable ? 'min-h-0 flex-1 overflow-y-auto' : null,
        ]
          .filter(Boolean)
          .join(' ')}
      >
        <div className="space-y-2">
          <h2 className="text-2xl font-semibold leading-tight tracking-tight text-primary">
            {displayTitle}
          </h2>
          {date ? <div className="text-xs text-slate-500">{date}</div> : null}
          {description ? (
            <p className="text-sm leading-relaxed text-slate-600">
              {descriptionPreview(description)}
            </p>
          ) : (
            <p className="text-sm text-slate-600">No description available.</p>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {isReadNowInternal ? (
            <Link
              to={readNowHref}
              state={navigationState ?? undefined}
              className="inline-flex items-center justify-center rounded-none bg-primary px-3 py-2 text-sm font-medium text-white hover:bg-primary-hover"
            >
              Read now
            </Link>
          ) : (
            <a
              href={readNowHref}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center justify-center rounded-none bg-primary px-3 py-2 text-sm font-medium text-white hover:bg-primary-hover"
            >
              Read now
            </a>
          )}
          {actions}
        </div>
      </div>
    </article>
  )
}

