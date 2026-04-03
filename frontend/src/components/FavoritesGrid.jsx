import { Link } from 'react-router-dom'

import FavoriteArticleCard from './FavoriteArticleCard'

function SkeletonCard() {
  return (
    <div className="overflow-hidden rounded-none border border-slate-200 bg-white">
      <div className="h-[100px] w-full animate-pulse bg-slate-200" />
      <div className="space-y-2 p-3">
        <div className="h-4 w-5/6 animate-pulse rounded bg-slate-200" />
        <div className="h-3 w-28 animate-pulse rounded bg-slate-200" />
      </div>
    </div>
  )
}

export default function FavoritesGrid({ entries, isLoading, isError, error, onRetry }) {
  const count = Array.isArray(entries) ? entries.length : 0

  return (
    <section className="space-y-3">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <div className="text-lg font-semibold tracking-tight text-primary">Interesting articles</div>
        <div className="text-sm text-slate-500">{count} marked</div>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, idx) => (
            <SkeletonCard key={`s-${idx}`} />
          ))}
        </div>
      ) : isError ? (
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-5">
          <div className="text-sm font-medium text-rose-900">
            Could not load your interesting articles.
          </div>
          <div className="mt-1 text-sm text-rose-800">{error?.message ?? 'Unknown error'}</div>
          <div className="mt-4">
            <button
              type="button"
              onClick={onRetry}
              className="bg-rose-600 px-3 py-2 text-sm font-medium text-white hover:bg-rose-700"
            >
              Retry
            </button>
          </div>
        </div>
      ) : count === 0 ? (
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-5 text-center">
          <div className="text-sm font-medium text-primary">No interesting articles yet.</div>
          <div className="mt-1 text-sm text-slate-600">
            Open an article and tap “Mark interesting” to save it here.
          </div>
          <div className="mt-4">
            <Link
              to="/"
              className="inline-flex items-center justify-center rounded-none bg-primary px-3 py-2 text-sm font-medium text-white hover:bg-primary-hover"
            >
              Browse articles
            </Link>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {entries.map((entry) => (
            <FavoriteArticleCard
              key={`${entry?.created_at ?? 'date'}-${entry?.wiki_slug ?? 'null'}`}
              entry={entry}
            />
          ))}
        </div>
      )}
    </section>
  )
}

