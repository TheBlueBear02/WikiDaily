import { useEffect, useMemo } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'

import { useUserProgress } from '../hooks/useUserProgress'
import { buildAuthUrl } from '../lib/returnTo'
import { useReadingHistory } from '../hooks/useReadingHistory'
import { useFavorites } from '../hooks/useFavorites'
import ProfileHeader from '../components/ProfileHeader'
import StatsRow from '../components/StatsRow'
import ActivityHeatmap from '../components/ActivityHeatmap'
import FavoritesGrid from '../components/FavoritesGrid'
import ReadingHistoryGrid from '../components/ReadingHistoryGrid'

function formatMemberSince(isoString) {
  if (!isoString) return null
  const d = new Date(isoString)
  if (!Number.isFinite(d.getTime())) return null
  return new Intl.DateTimeFormat(undefined, { month: 'long', year: 'numeric' }).format(d)
}

export default function Profile() {
  const location = useLocation()
  const navigate = useNavigate()

  const { userId, user, profile, authUserQuery, profileQuery } = useUserProgress()
  const readingHistoryQuery = useReadingHistory({ userId })
  const favoritesQuery = useFavorites({ userId, user })

  const memberSince = useMemo(() => formatMemberSince(user?.created_at ?? null), [user?.created_at])

  useEffect(() => {
    if (authUserQuery.isLoading) return
    if (userId) return

    const returnTo = `${location.pathname}${location.search ?? ''}${location.hash ?? ''}`
    navigate(buildAuthUrl({ returnTo }), { replace: true })
  }, [
    authUserQuery.isLoading,
    location.hash,
    location.pathname,
    location.search,
    navigate,
    userId,
  ])

  if (authUserQuery.isLoading) {
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

  if (!userId) {
    return (
      <section className="space-y-4">
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-5">
          <div className="text-sm font-medium text-primary">Redirecting to sign in…</div>
        </div>
      </section>
    )
  }

  if (profileQuery.isError) {
    return (
      <section className="space-y-4">
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-5">
          <div className="text-sm font-medium text-rose-900">
            Could not load profile. Please try again.
          </div>
          <div className="mt-1 text-sm text-rose-800">
            {profileQuery.error?.message ?? 'Unknown error'}
          </div>
          <div className="mt-4">
            <button
              type="button"
              onClick={() => profileQuery.refetch()}
              className="bg-rose-600 px-3 py-2 text-sm font-medium text-white hover:bg-rose-700"
            >
              Retry
            </button>
          </div>
        </div>
      </section>
    )
  }

  return (
    <section className="space-y-6">
      <ProfileHeader profile={profile} user={user} memberSince={memberSince} />

      <StatsRow profile={profile} isLoading={profileQuery.isLoading} />

      <div className="space-y-2">
        <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
          Reading activity
        </div>
        {readingHistoryQuery.isLoading ? (
          <div className="h-[130px] w-full rounded-none border border-slate-200 bg-slate-50" />
        ) : (
          <ActivityHeatmap entries={readingHistoryQuery.data ?? []} />
        )}
      </div>

      <FavoritesGrid
        entries={favoritesQuery.favorites ?? []}
        isLoading={favoritesQuery.favoritesQuery.isLoading}
        isError={favoritesQuery.favoritesQuery.isError}
        error={favoritesQuery.favoritesQuery.error}
        onRetry={() => favoritesQuery.favoritesQuery.refetch()}
      />

      <ReadingHistoryGrid
        entries={readingHistoryQuery.data ?? []}
        isLoading={readingHistoryQuery.isLoading}
        isError={readingHistoryQuery.isError}
        error={readingHistoryQuery.error}
        onRetry={() => readingHistoryQuery.refetch()}
      />
    </section>
  )
}

