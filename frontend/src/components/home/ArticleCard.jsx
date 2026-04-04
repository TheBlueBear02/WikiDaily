import { Link, useNavigate } from 'react-router-dom'
import { useDailyResetCountdown } from '../../hooks/useDailyResetCountdown'

import { cardInteractiveSurfaceClasses } from '../../lib/cardSurface'

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
  /** Rendered to the left of the primary "Read now" action (bottom row). */
  actionsLeft = null,
  actions = null,
  isCollected = false,
  showDailyResetCountdown = false,
  className = '',
  /** When true (e.g. hero fixed-height slot), body scrolls so the card can honor a fixed outer height. */
  bodyScrollable = false,
}) {
  const isCardClickable = Boolean(cardHref)
  const navigate = useNavigate()
  const dailyCountdown = useDailyResetCountdown()

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

  const countdownLabel = (() => {
    if (!showDailyResetCountdown) return null
    const { hours, minutes, seconds } = dailyCountdown
    const hh = String(hours).padStart(2, '0')
    const mm = String(minutes).padStart(2, '0')
    const ss = String(seconds).padStart(2, '0')
    return `${hh}:${mm}:${ss}`
  })()

  return (
    <article
      className={[
        'relative h-full w-full overflow-hidden',
        bodyScrollable ? 'flex min-h-0 flex-col' : null,
        isCardClickable
          ? 'rounded-none bg-primary shadow-sm cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20 focus-visible:ring-offset-2'
          : 'rounded-none bg-primary',
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

      <div className="relative h-[40vh] w-full shrink-0">
        {imageUrl ? (
          <img
            src={imageUrl}
            alt=""
            className="h-full w-full object-cover object-top"
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
          className="pointer-events-none absolute bottom-4 start-0 flex items-center gap-2 bg-primary px-4 py-2.5 text-sm font-bold text-white"
          aria-hidden
        >
          <span className="relative flex h-2.5 w-2.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-white opacity-60 [animation-duration:1.5s]" />
            <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-white" />
          </span>
          {"Today's article"}
        </div>
      </div>

      <div
        className={[
          'flex flex-col gap-6 p-5 py-7',
          bodyScrollable ? 'min-h-0 flex-1 overflow-y-auto' : null,
        ]
          .filter(Boolean)
          .join(' ')}
      >
        <div className="flex-1 space-y-4">
          <div className="flex items-start justify-between gap-3">
            <h2 className="text-4xl font-extrabold leading-tight tracking-tight text-white">
            {isReadNowInternal ? (
              <Link
                to={readNowHref}
                state={navigationState ?? undefined}
                onClick={(e) => e.stopPropagation()}
                className="hover:underline"
              >
                {displayTitle}
              </Link>
            ) : (
              <a
                href={readNowHref}
                target="_blank"
                rel="noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="hover:underline"
              >
                {displayTitle}
              </a>
            )}
            </h2>
            {date ? (
              <div className="shrink-0 text-sm font-bold text-white">
                {date}
              </div>
            ) : null}
          </div>
          <div className="h-1 w-1/4 bg-white" />
          {description ? (
            <p className="text-base leading-relaxed text-white/85">
              {descriptionPreview(description)}
            </p>
          ) : (
            <p className="text-base text-white/85">No description available.</p>
          )}
        </div>

        <div className="mt-auto flex flex-wrap items-end justify-between gap-x-4 gap-y-2">
          <div className="flex min-w-0 flex-wrap items-center gap-3">
            {actionsLeft}
{actions}
          </div>
          {countdownLabel ? (
            <div
              className="shrink-0 self-end text-sm font-medium leading-none text-white/70 sm:text-right"
              title={`Next daily article at ${dailyCountdown.target.toISOString()}`}
              aria-live="polite"
              aria-atomic="true"
            >
              <span className="sr-only">Time until next daily article: </span>
              <span>New daily article in: </span>{' '}
              <span className="tabular-nums">{countdownLabel}</span>
            </div>
          ) : null}
        </div>
      </div>
    </article>
  )
}

