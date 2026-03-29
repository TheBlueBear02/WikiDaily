import { useDailyArticle } from '../hooks/useDailyArticle'
import { todayUtcYmd } from '../lib/date'
import ArticleCard from '../components/ArticleCard'
import MarkAsReadButton from '../components/MarkAsReadButton'

export default function Home() {
  const { dailyArticle, isFallback, isLoading, isError, error, refetch } =
    useDailyArticle()

  if (isLoading) {
    return (
      <section className="space-y-4">
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-5">
          <div className="h-4 w-48 animate-pulse rounded bg-slate-200" />
          <div className="mt-3 space-y-2">
            <div className="h-3 w-full animate-pulse rounded bg-slate-200" />
            <div className="h-3 w-5/6 animate-pulse rounded bg-slate-200" />
            <div className="h-3 w-4/6 animate-pulse rounded bg-slate-200" />
          </div>
        </div>
      </section>
    )
  }

  if (isError) {
    return (
      <section className="space-y-4">
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-5">
          <div className="text-sm font-medium text-rose-900">
            Couldn’t load today’s article
          </div>
          <div className="mt-1 text-sm text-rose-800">
            {error?.message ?? 'Unknown error'}
          </div>
          <div className="mt-4">
            <button
              type="button"
              onClick={() => refetch()}
              className="rounded-md bg-rose-600 px-3 py-2 text-sm font-medium text-white hover:bg-rose-700"
            >
              Retry
            </button>
          </div>
        </div>
      </section>
    )
  }

  if (!dailyArticle) {
    return (
      <section className="space-y-4">
        <p className="text-sm text-slate-600">
          No articles are available yet — check back soon.
        </p>
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-5">
          <div className="text-sm font-medium text-slate-900">Nothing to show</div>
          <div className="mt-1 text-sm text-slate-600">
            Once the daily picker runs and inserts rows into Supabase, this page will
            show the latest available article.
          </div>
        </div>
      </section>
    )
  }

  const wikiUrl = `https://en.wikipedia.org/wiki/${encodeURIComponent(dailyArticle.wiki_slug)}`
  const readDateYmd = todayUtcYmd()

  return (
    <section className="space-y-4">
      <ArticleCard
        date={dailyArticle.date}
        displayTitle={dailyArticle.display_title}
        description={dailyArticle.description}
        imageUrl={dailyArticle.image_url}
        wikiUrl={wikiUrl}
        cardHref={wikiUrl}
        isFallback={isFallback}
        actions={
          <MarkAsReadButton
            wikiSlug={dailyArticle.wiki_slug}
            readDateYmd={readDateYmd}
          />
        }
      />
    </section>
  )
}

