export default function ArticleCard({
  date,
  displayTitle,
  description,
  imageUrl,
  wikiUrl,
  isFallback = false,
  actions = null,
}) {
  return (
    <article className="overflow-hidden rounded-xl border border-slate-200 bg-white">
      {isFallback ? (
        <div className="border-b border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          Today’s article isn’t available yet. Showing the most recent article in the
          database.
        </div>
      ) : null}

      {imageUrl ? (
        <div className="aspect-[16/9] w-full bg-slate-100">
          <img
            src={imageUrl}
            alt=""
            className="h-full w-full object-cover"
            loading="lazy"
            referrerPolicy="no-referrer"
          />
        </div>
      ) : null}

      <div className="space-y-3 p-5">
        <div className="space-y-1">
          {date ? <div className="text-xs text-slate-500">{date}</div> : null}
          <h2 className="text-lg font-semibold leading-snug">{displayTitle}</h2>
          {description ? (
            <p className="text-sm leading-relaxed text-slate-600">{description}</p>
          ) : (
            <p className="text-sm text-slate-600">No description available.</p>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <a
            href={wikiUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center justify-center rounded-md bg-slate-900 px-3 py-2 text-sm font-medium text-white hover:bg-slate-800"
          >
            Read full article
          </a>
          {actions}
        </div>
      </div>
    </article>
  )
}

