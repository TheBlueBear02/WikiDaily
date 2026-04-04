import { Link } from 'react-router-dom'

import FavoriteArticleCard from '../shared/FavoriteArticleCard'

export default function InterestingArticlesSection({ entries, title = 'Interesting articles' }) {
  const items = Array.isArray(entries) ? entries.slice(0, 5) : []
  if (items.length === 0) return null

  return (
    <section className="w-full space-y-3">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <div className="text-lg font-semibold tracking-tight text-primary">{title}</div>
        <Link
          to="/profile"
          className="text-sm font-medium text-slate-700 underline decoration-slate-300 underline-offset-2 hover:text-slate-900"
        >
          View all
        </Link>
      </div>
      <div className="mt-2 h-px w-full shrink-0 bg-slate-200" aria-hidden />

      <div className="hidden w-full grid-cols-5 gap-3 lg:grid" aria-label="Your interesting articles">
        {items.map((entry) => (
          <FavoriteArticleCard
            key={`${entry?.created_at ?? 'date'}-${entry?.wiki_slug ?? 'null'}`}
            entry={entry}
          />
        ))}
      </div>

      <div
        className={[
          'flex w-full gap-3 overflow-x-auto pb-2 lg:hidden',
          'snap-x snap-mandatory',
          '[scrollbar-gutter:stable]',
        ].join(' ')}
        aria-label="Your interesting articles"
      >
        {items.map((entry) => (
          <div
            key={`${entry?.created_at ?? 'date'}-${entry?.wiki_slug ?? 'null'}`}
            className="w-[260px] shrink-0 snap-start sm:w-[300px]"
          >
            <FavoriteArticleCard entry={entry} />
          </div>
        ))}
      </div>
    </section>
  )
}
