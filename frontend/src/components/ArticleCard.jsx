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
  isFallback = false,
  actions = null,
  isCollected = false,
  className = '',
}) {
  const isCardClickable = Boolean(cardHref)

  const openCard = () => {
    if (!cardHref) return
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
        'relative h-full w-full overflow-hidden rounded-none border bg-white',
        isCollected ? 'border-emerald-300 ring-1 ring-emerald-200' : 'border-slate-200',
        isCardClickable
          ? 'cursor-pointer hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 focus-visible:ring-offset-2'
          : null,
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
          ? `Open ${displayTitle} on Wikipedia in a new tab`
          : undefined
      }
    >
      {isFallback ? (
        <div className="border-b border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          Today’s article isn’t available yet. Showing the most recent article in the
          database.
        </div>
      ) : null}

      {isCollected ? (
        <div className="absolute right-3 top-3 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-900">
          Collected
        </div>
      ) : null}

      {imageUrl ? (
        <div className="relative aspect-[16/9] w-full bg-slate-100">
          <img
            src={imageUrl}
            alt=""
            className="h-full w-full object-contain object-center"
            loading="lazy"
            referrerPolicy="no-referrer"
          />
          <div
            className="pointer-events-none absolute bottom-4 start-0 bg-primary px-4 py-2.5 text-sm font-bold text-white"
            aria-hidden
          >
            {"Today's article"}
          </div>
        </div>
      ) : null}

      <div className="space-y-3 p-5">
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
          <a
            href={wikiUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center justify-center rounded-none bg-primary px-3 py-2 text-sm font-medium text-white hover:bg-primary-hover"
          >
            Read now
          </a>
          {actions}
        </div>
      </div>
    </article>
  )
}

