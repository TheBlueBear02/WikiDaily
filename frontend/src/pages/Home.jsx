import { NavLink } from 'react-router-dom'

import { useScrollReveal } from '../hooks/useScrollReveal'
import { useDailyArticle } from '../hooks/useDailyArticle'
import { useUserProgress } from '../hooks/useUserProgress'
import { useReadingHistory } from '../hooks/useReadingHistory'
import { useFavorites } from '../hooks/useFavorites'
import ArticleCard from '../components/home/ArticleCard'
import HeroAside from '../components/home/HeroAside'
import StreakLeaderboard from '../components/home/StreakLeaderboard'
import HeroAchievementsSection from '../components/home/HeroAchievementsSection'
import RandomWikiSection from '../components/home/RandomWikiSection'
import WizardImageCard from '../components/home/WizardImageCard'
import CraziestFactsSection from '../components/home/CraziestFactsSection'
import CollectiveReadingProgressBar from '../components/home/CollectiveReadingProgressBar'
import ReadingProgressBar from '../components/home/ReadingProgressBar'
import LatestReadsSection from '../components/home/LatestReadsSection'
import InterestingArticlesSection from '../components/home/InterestingArticlesSection'
import { useCollectiveReadingTotal } from '../hooks/useCollectiveReadingTotal'
import DailyGameSection from '../components/home/DailyGameSection'
import AdPlaceholder from '../components/home/AdPlaceholder'

function HomeHeroRow({ userId, profile, dailySlot, collectiveReading }) {
  const { totalRead, isLoading, isError, onRetry } = collectiveReading

  return (
    <section className="space-y-4">
      <div className="flex flex-col gap-4 md:flex-row md:items-stretch md:gap-6">
        <HeroAside>
          <div className="flex min-h-0 flex-1 flex-col gap-3 bg-slate-50/70">
            <div className="shrink-0 border border-slate-200 bg-white">
              <HeroAchievementsSection userId={userId} profile={profile} />
            </div>
            <div className="min-h-0 flex-1 overflow-hidden border border-slate-200 bg-white">
              <StreakLeaderboard rows={8} />
            </div>
          </div>
        </HeroAside>
        <div className="flex min-h-0 w-full shrink-0 flex-col gap-3 md:w-[70%]">
          {/* flex-1: takes all space above the community strip (same visual weight as ReadingProgressBar below). */}
          <div className="flex min-h-0 flex-1 flex-col overflow-hidden">{dailySlot}</div>
          <div className="shrink-0">
            <CollectiveReadingProgressBar
              totalRead={totalRead}
              isLoading={isLoading}
              isError={isError}
              onRetry={onRetry}
            />
          </div>
        </div>
      </div>
    </section>
  )
}

export default function Home() {
  const { dailyArticle, isLoading, isError, error, refetch } = useDailyArticle()
  const { userId, user, profile, profileQuery } = useUserProgress()
  const collectiveReadingQuery = useCollectiveReadingTotal()
  const latestReadsQuery = useReadingHistory({ userId, limit: 4 })
  const interestingQuery = useFavorites({ userId, user, limit: 5 })

  let heroRightColumn = null

  if (isLoading) {
    heroRightColumn = (
      <div className="flex h-full min-h-0 flex-col rounded-none border border-slate-200 bg-slate-50 p-5">
        <div className="h-4 w-48 animate-pulse rounded bg-slate-200" />
        <div className="mt-3 space-y-2">
          <div className="h-3 w-full animate-pulse rounded bg-slate-200" />
          <div className="h-3 w-5/6 animate-pulse rounded bg-slate-200" />
          <div className="h-3 w-4/6 animate-pulse rounded bg-slate-200" />
        </div>
      </div>
    )
  } else if (isError) {
    heroRightColumn = (
      <div className="flex h-full min-h-0 flex-col overflow-y-auto rounded-none border border-rose-200 bg-rose-50 p-5">
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
    )
  } else if (!dailyArticle) {
    heroRightColumn = (
      <div className="flex h-full min-h-0 flex-col overflow-y-auto space-y-3 rounded-none border border-slate-200 bg-slate-50 p-5">
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
    )
  } else {
    const wikiSlug = dailyArticle.wiki_slug
    const wikiUrl = `https://en.wikipedia.org/wiki/${encodeURIComponent(wikiSlug)}`
    const cardHref = `/wiki/${encodeURIComponent(wikiSlug)}`

    heroRightColumn = (
      <ArticleCard
        date={dailyArticle.date}
        displayTitle={dailyArticle.display_title}
        description={dailyArticle.description}
        imageUrl={dailyArticle.image_url}
        wikiUrl={wikiUrl}
        cardHref={cardHref}
        navigationState={{ source: 'daily', displayTitle: dailyArticle.display_title }}
        showDailyResetCountdown
        bodyScrollable
        className="h-full"
        actionsLeft={
          <NavLink
            to="/history"
            className={({ isActive }) =>
              [
                'text-sm font-medium underline-offset-2 hover:underline',
                isActive ? 'text-white' : 'text-white/75',
              ].join(' ')
            }
          >
            Previous daily articles &gt;
          </NavLink>
        }
      />
    )
  }

  const [factsRef, factsVisible] = useScrollReveal()
  const [gameRef, gameVisible] = useScrollReveal()
  const [interestingRef, interestingVisible] = useScrollReveal()
  const [progressRef, progressVisible] = useScrollReveal()
  const [latestRef, latestVisible] = useScrollReveal()
  const [bottomRef, bottomVisible] = useScrollReveal()

  const reveal = (isVisible, delay = 0) => ({
    style: {
      transition: `opacity 0.55s ease ${delay}ms, transform 0.55s ease ${delay}ms`,
      opacity: isVisible ? 1 : 0,
      transform: isVisible ? 'translateY(0)' : 'translateY(28px)',
    },
  })

  return (
    <div className="space-y-6">
      <HomeHeroRow
        userId={userId}
        profile={profile}
        dailySlot={heroRightColumn}
        collectiveReading={{
          totalRead: collectiveReadingQuery.data ?? 0,
          isLoading: collectiveReadingQuery.isLoading,
          isError: collectiveReadingQuery.isError,
          onRetry: () => collectiveReadingQuery.refetch(),
        }}
      />
      <div ref={factsRef} {...reveal(factsVisible)} className="flex items-stretch gap-2">
        <CraziestFactsSection />
        <div className="shrink-0 w-[30%] flex flex-col">
          <RandomWikiSection />
        </div>
      </div>
      <div ref={gameRef} {...reveal(gameVisible)} className="flex items-stretch gap-4">
        <AdPlaceholder size="rectangle" className="h-auto self-stretch" />
        <DailyGameSection />
      </div>
      <div ref={interestingRef} {...reveal(interestingVisible)}>
        {!interestingQuery.favoritesQuery.isLoading && !interestingQuery.favoritesQuery.isError ? (
          <InterestingArticlesSection entries={interestingQuery.favorites ?? []} userId={userId} />
        ) : null}
      </div>
      <div ref={progressRef} {...reveal(progressVisible)}>
        {userId ? (
          profileQuery.isError ? (
            <div className="rounded-none border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-900">
              <span className="font-medium">Could not load reading progress.</span>{' '}
              <button
                type="button"
                onClick={() => profileQuery.refetch()}
                className="text-rose-950 underline decoration-rose-400 underline-offset-2 hover:text-rose-900"
              >
                Retry
              </button>
            </div>
          ) : (
            <ReadingProgressBar
              userId={userId}
              totalRead={profile?.total_read ?? 0}
              isLoading={profileQuery.isLoading}
            />
          )
        ) : (
          <ReadingProgressBar totalRead={0} isLoading={false} />
        )}
      </div>
      <div ref={latestRef} {...reveal(latestVisible)}>
        {!latestReadsQuery.isLoading && !latestReadsQuery.isError ? (
          <LatestReadsSection entries={latestReadsQuery.data ?? []} userId={userId} />
        ) : null}
      </div>
      <div ref={bottomRef} {...reveal(bottomVisible)} className="flex items-stretch gap-4">
        <WizardImageCard />
        <AdPlaceholder size="rectangle" />
      </div>
    </div>
  )
}

