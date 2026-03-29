import { useDailyArticle } from '../hooks/useDailyArticle'
import { todayUtcYmd } from '../lib/date'
import ArticleCard from '../components/ArticleCard'
import HeroAside from '../components/HeroAside'
import WeeklyLeaderboard from '../components/WeeklyLeaderboard'
import MarkAsReadButton from '../components/MarkAsReadButton'

function HomeHeroRow({ children }) {
  return (
    <section className="space-y-4">
      <div className="flex flex-col gap-4 md:flex-row md:items-stretch md:gap-6">
        <HeroAside>
          <WeeklyLeaderboard />
        </HeroAside>
        <div className="w-full shrink-0 md:w-[70%]">{children}</div>
      </div>
    </section>
  )
}

export default function Home() {
  const { dailyArticle, isFallback, isLoading, isError, error, refetch } =
    useDailyArticle()

  if (isLoading) {
    return (
      <HomeHeroRow>
        <div className="h-full min-h-[280px] rounded-none border border-slate-200 bg-slate-50 p-5">
          <div className="h-4 w-48 animate-pulse rounded bg-slate-200" />
          <div className="mt-3 space-y-2">
            <div className="h-3 w-full animate-pulse rounded bg-slate-200" />
            <div className="h-3 w-5/6 animate-pulse rounded bg-slate-200" />
            <div className="h-3 w-4/6 animate-pulse rounded bg-slate-200" />
          </div>
        </div>
      </HomeHeroRow>
    )
  }

  if (isError) {
    return (
      <HomeHeroRow>
        <div className="rounded-none border border-rose-200 bg-rose-50 p-5">
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
              className="bg-rose-600 px-3 py-2 text-sm font-medium text-white hover:bg-rose-700"
            >
              Retry
            </button>
          </div>
        </div>
      </HomeHeroRow>
    )
  }

  if (!dailyArticle) {
    return (
      <HomeHeroRow>
        <div className="space-y-3 rounded-none border border-slate-200 bg-slate-50 p-5">
          <p className="text-sm text-slate-600">
            No articles are available yet — check back soon.
          </p>
          <div>
            <div className="text-sm font-medium text-primary">Nothing to show</div>
            <div className="mt-1 text-sm text-slate-600">
              Once the daily picker runs and inserts rows into Supabase, this page will
              show the latest available article.
            </div>
          </div>
        </div>
      </HomeHeroRow>
    )
  }

  const wikiUrl = `https://en.wikipedia.org/wiki/${encodeURIComponent(dailyArticle.wiki_slug)}`
  const readDateYmd = todayUtcYmd()

  return (
    <HomeHeroRow>
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
    </HomeHeroRow>
  )
}

