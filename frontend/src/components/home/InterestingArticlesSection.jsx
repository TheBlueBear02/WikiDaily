import { Link } from 'react-router-dom'

import FavoriteArticleCard from '../shared/FavoriteArticleCard'

export default function InterestingArticlesSection({ entries, userId, title = 'INTERESTING ARTICLES' }) {
  const items = Array.isArray(entries) ? entries.slice(0, 4) : []

  return (
    <section className="w-full space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2 bg-secondary px-4 py-3">
        <div className="flex items-center gap-2.5">
          <span className="shrink-0 text-white" aria-hidden>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="block">
              <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </span>
          <div className="text-lg font-semibold tracking-tight text-white">{title}</div>
        </div>
        {userId && (
          <Link
            to="/profile"
            className="text-sm font-medium text-white/80 underline decoration-white/50 underline-offset-2 hover:text-white"
          >
            View all
          </Link>
        )}
      </div>

      {items.length === 0 ? (
        <div className="border border-slate-200 bg-slate-50 px-4 py-6 text-center">
          {userId ? (
            <>
              <p className="text-sm font-medium text-slate-700">No favorites yet</p>
              <p className="mt-1 text-sm text-slate-500">Star articles while reading to save them here.</p>
            </>
          ) : (
            <>
              <p className="text-sm font-medium text-slate-700">Save articles you love</p>
              <p className="mt-1 text-sm text-slate-500">
                <Link to="/auth" className="text-primary underline underline-offset-2 hover:text-primary/80">Sign in</Link>
                {' '}to favorite articles and find them again easily.
              </p>
            </>
          )}
        </div>
      ) : (
        <div className="bg-primary px-4 py-5">
          <div
            className="grid grid-cols-1 divide-y divide-white/30 lg:grid-cols-4 lg:divide-x lg:divide-y-0 [&>*]:border-white/30"
            aria-label="Your interesting articles"
          >
            {items.map((entry, i) => (
              <div
                key={`${entry?.created_at ?? 'date'}-${entry?.wiki_slug ?? 'null'}`}
                className={[
                  'lg:px-4',
                  i === 0 ? 'pb-4 lg:pb-0 lg:pl-0' : 'py-4 lg:py-0',
                  i === items.length - 1 ? 'pt-4 lg:pt-0 lg:pr-0' : '',
                ].join(' ')}
              >
                <FavoriteArticleCard entry={entry} variant="dark" />
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  )
}
