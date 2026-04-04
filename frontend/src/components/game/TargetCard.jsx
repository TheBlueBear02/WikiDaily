import { CARD_SURFACE_STATIC } from '../../lib/cardSurface'

/**
 * Displays an article's image, title, and description.
 * size="large" — for GameHub (image + title + description)
 * size="small" — for GameHUD (tiny thumbnail + title only)
 */
export default function TargetCard({ article, size = 'large' }) {
  if (size === 'small') {
    if (!article) {
      return (
        <div className="flex items-center gap-2 animate-pulse">
          <div className="h-9 w-9 shrink-0 bg-slate-200" />
          <div className="h-3 w-24 rounded bg-slate-200" />
        </div>
      )
    }
    return (
      <div className="flex items-center gap-2 min-w-0">
        {article.image_url ? (
          <img
            src={article.image_url}
            alt=""
            className="h-9 w-9 shrink-0 object-cover"
          />
        ) : (
          <div className="h-9 w-9 shrink-0 bg-slate-100 flex items-center justify-center text-slate-400 text-xs">
            ?
          </div>
        )}
        <span className="text-sm font-semibold text-primary truncate">
          {article.display_title}
        </span>
      </div>
    )
  }

  // large variant
  if (!article) {
    return (
      <div className={`${CARD_SURFACE_STATIC} flex flex-1 flex-col animate-pulse`}>
        <div className="h-44 w-full bg-slate-200" />
        <div className="p-3 space-y-2">
          <div className="h-4 w-3/4 rounded bg-slate-200" />
          <div className="h-3 w-full rounded bg-slate-200" />
          <div className="h-3 w-5/6 rounded bg-slate-200" />
        </div>
      </div>
    )
  }

  return (
    <div className={`${CARD_SURFACE_STATIC} flex flex-1 flex-col overflow-hidden`}>
      {article.image_url ? (
        <img
          src={article.image_url}
          alt=""
          className="h-44 w-full object-cover shrink-0"
        />
      ) : (
        <div className="h-44 w-full bg-slate-100 flex items-center justify-center text-slate-400 text-sm shrink-0">
          No image
        </div>
      )}
      <div className="p-3 flex flex-col gap-1 min-h-0">
        <p className="text-sm font-semibold text-primary leading-snug line-clamp-2">
          {article.display_title}
        </p>
        {article.description && (
          <p className="text-xs text-slate-500 line-clamp-3 leading-relaxed">
            {article.description}
          </p>
        )}
      </div>
    </div>
  )
}
