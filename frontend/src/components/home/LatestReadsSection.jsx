import { Link } from 'react-router-dom'

import ArticleHistoryCard from '../shared/ArticleHistoryCard'

export default function LatestReadsSection({ entries, title = 'Your recent reads' }) {
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

      {/* Desktop: show all 5 without scrolling. */}
      <div className="hidden w-full grid-cols-5 gap-3 lg:grid" aria-label="Your recently read articles">
        {items.map((entry) => (
          <ArticleHistoryCard
            key={`${entry?.read_date ?? 'date'}-${entry?.wiki_slug ?? 'null'}-${entry?.source ?? 'source'}`}
            entry={entry}
          />
        ))}
      </div>

      {/* Mobile/tablet: horizontal scroll row. */}
      <div
        className={[
          'flex w-full gap-3 overflow-x-auto pb-2 lg:hidden',
          'snap-x snap-mandatory',
          '[scrollbar-gutter:stable]',
        ].join(' ')}
        aria-label="Your recently read articles"
      >
        {items.map((entry) => (
          <div
            key={`${entry?.read_date ?? 'date'}-${entry?.wiki_slug ?? 'null'}-${entry?.source ?? 'source'}`}
            className="w-[260px] shrink-0 snap-start sm:w-[300px]"
          >
            <ArticleHistoryCard entry={entry} />
          </div>
        ))}
      </div>
    </section>
  )
}

