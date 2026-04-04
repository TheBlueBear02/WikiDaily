import { Link } from 'react-router-dom'

import ArticleHistoryCard from '../shared/ArticleHistoryCard'

export default function LatestReadsSection({ entries, title = 'YOUR RECENT READS' }) {
  const items = Array.isArray(entries) ? entries.slice(0, 4) : []
  if (items.length === 0) return null

  return (
    <section className="w-full space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2 bg-secondary px-4 py-3">
        <div className="flex items-center gap-2.5">
          <span className="shrink-0 text-white" aria-hidden>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="block">
              <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M12 7v5l3 3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </span>
          <div className="text-lg font-semibold tracking-tight text-white">{title}</div>
        </div>
        <Link
          to="/profile"
          className="text-sm font-medium text-white/80 underline decoration-white/50 underline-offset-2 hover:text-white"
        >
          View all
        </Link>
      </div>
      <div className="bg-primary px-4 py-5">
        <div
          className="grid grid-cols-1 divide-y divide-white/30 lg:grid-cols-4 lg:divide-x lg:divide-y-0 [&>*]:border-white/30"
          aria-label="Your recently read articles"
        >
          {items.map((entry, i) => (
            <div
              key={`${entry?.read_date ?? 'date'}-${entry?.wiki_slug ?? 'null'}-${entry?.source ?? 'source'}`}
              className={[
                'lg:px-4',
                i === 0 ? 'pb-4 lg:pb-0 lg:pl-0' : 'py-4 lg:py-0',
                i === items.length - 1 ? 'pt-4 lg:pt-0 lg:pr-0' : '',
              ].join(' ')}
            >
              <ArticleHistoryCard entry={entry} />
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

