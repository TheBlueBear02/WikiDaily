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
        'relative h-full w-full overflow-hidden min-h-[420px] md:min-h-[640px]',
        bodyScrollable ? 'flex min-h-0 flex-col' : null,
        isCardClickable
          ? 'rounded-none shadow-sm cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20 focus-visible:ring-offset-2'
          : 'rounded-none',
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
        <div className="absolute right-3 top-3 z-20 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-900">
          Collected
        </div>
      ) : null}

      {/* Full-cover image */}
      <div className="absolute inset-0">
        {imageUrl ? (
          <img
            src={imageUrl}
            alt=""
            className="h-full w-full object-cover object-top"
            loading="lazy"
            referrerPolicy="no-referrer"
          />
        ) : (
          <div className="h-full w-full bg-gradient-to-br from-slate-700 via-slate-800 to-slate-900" />
        )}
        {/* Dark gradient overlay — stronger at the bottom where text lives */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/10 to-black/70" />
      </div>

      {/* Top bar: badge left, date right */}
      <div className="pointer-events-none absolute inset-x-0 top-3 z-10 flex items-center justify-between px-3 sm:top-4 sm:px-4">
        <div className="flex items-center gap-2 text-sm font-bold text-white sm:text-base" aria-hidden>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect x="3" y="4" width="18" height="18" rx="2" stroke="currentColor" strokeWidth="2" />
            <path d="M3 9h18" stroke="currentColor" strokeWidth="2" />
            <path d="M8 2v4M16 2v4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
          {"Today's article"}
          <span className="relative flex h-2.5 w-2.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-secondary opacity-60 [animation-duration:1.5s]" />
            <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-secondary" />
          </span>
        </div>
        {date ? (
          <div className="text-xs font-bold text-white sm:text-sm">{date}</div>
        ) : null}
      </div>

      {/* Text content — pinned to the bottom over the gradient */}
      <div
        className={[
          'absolute inset-x-0 bottom-0 z-10 flex flex-col gap-5 p-4 py-5 sm:gap-6 sm:p-5 sm:py-7',
          bodyScrollable ? 'overflow-y-auto' : null,
        ]
          .filter(Boolean)
          .join(' ')}
      >
        <div className="flex-1 space-y-4">
          <h2 className="break-words text-2xl font-extrabold leading-tight tracking-tight text-white sm:text-3xl md:text-4xl">
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
          <div className="h-1 w-1/4 bg-secondary" />
          {description ? (
            <p className="text-sm leading-relaxed text-white/85 sm:text-base">
              {descriptionPreview(description)}
            </p>
          ) : (
            <p className="text-sm text-white/85 sm:text-base">No description available.</p>
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

