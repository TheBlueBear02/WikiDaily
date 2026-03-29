import ArticleCard from '../components/ArticleCard'
import { useDailyArchive } from '../hooks/useDailyArchive'
import { useUserProgress } from '../hooks/useUserProgress'
import { useReadingLog } from '../hooks/useReadingLog'

export default function History() {
  const limit = 60
  const { data, isLoading, isError, error, refetch } = useDailyArchive({ limit })
  const { userId } = useUserProgress()
  const readingLogQuery = useReadingLog({ userId })

  if (isLoading) {
    return (
      <section className="space-y-4">
        <h1 className="text-2xl font-semibold tracking-tight">History</h1>
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
        <h1 className="text-2xl font-semibold tracking-tight">History</h1>
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-5">
          <div className="text-sm font-medium text-rose-900">
            Couldn’t load the archive
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

  const rows = data ?? []
  const collectedDates = new Set(
    (readingLogQuery.data ?? []).map((r) => r.read_date).filter(Boolean),
  )

  return (
    <section className="space-y-4">
      <h1 className="text-2xl font-semibold tracking-tight">History</h1>
      <p className="text-sm text-slate-600">
        A collection wall of past featured articles (latest first). Sign in to see which
        ones you’ve collected.
      </p>

      {rows.length === 0 ? (
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-5">
          <div className="text-sm font-medium text-slate-900">Nothing yet</div>
          <div className="mt-1 text-sm text-slate-600">
            Once the daily picker writes rows to Supabase, they’ll appear here.
          </div>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {rows.map((row) => {
            const wikiUrl = `https://en.wikipedia.org/wiki/${encodeURIComponent(row.wiki_slug)}`
            const isCollected = Boolean(userId) && collectedDates.has(row.date)
            return (
              <ArticleCard
                key={row.date}
                date={row.date}
                displayTitle={row.display_title}
                description={row.description}
                imageUrl={row.image_url}
                wikiUrl={wikiUrl}
                isCollected={isCollected}
              />
            )
          })}
        </div>
      )}
    </section>
  )
}

