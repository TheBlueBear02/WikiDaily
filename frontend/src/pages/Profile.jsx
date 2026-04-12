import { useEffect, useMemo, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'

import { useUserProgress } from '../hooks/useUserProgress'
import { useDeleteAccount } from '../hooks/useDeleteAccount'
import { buildAuthUrl } from '../lib/returnTo'
import { useReadingHistory } from '../hooks/useReadingHistory'
import { useFavorites } from '../hooks/useFavorites'
import { useAchievements } from '../hooks/useAchievements'
import { useRecentNotes } from '../hooks/useRecentNotes'
import { useMyWikiFacts } from '../hooks/useMyWikiFacts'
import ProfileHeader from '../components/profile/ProfileHeader'
import StatsRow from '../components/profile/StatsRow'
import ActivityHeatmap from '../components/profile/ActivityHeatmap'
import FavoritesGrid from '../components/profile/FavoritesGrid'
import ReadingHistoryGrid from '../components/profile/ReadingHistoryGrid'
import MyFactsGrid from '../components/profile/MyFactsGrid'
import AchievementsGrid from '../components/profile/AchievementsGrid'
import NotesGrid from '../components/profile/NotesGrid'

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
  const achievementsQuery = useAchievements({ userId })
  const notesQuery = useRecentNotes({ userId })
  const myFactsQuery = useMyWikiFacts({ userId })

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

      <NotesGrid
        entries={notesQuery.data ?? []}
        isLoading={notesQuery.isLoading}
        isError={notesQuery.isError}
        error={notesQuery.error}
        onRetry={() => notesQuery.refetch()}
      />

      <MyFactsGrid
        userId={userId}
        entries={myFactsQuery.data ?? []}
        isLoading={myFactsQuery.isLoading}
        isError={myFactsQuery.isError}
        error={myFactsQuery.error}
        onRetry={() => myFactsQuery.refetch()}
      />

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

      <AchievementsGrid
        achievements={achievementsQuery.achievements}
        unlocked={achievementsQuery.unlocked}
        userAchievements={achievementsQuery.userAchievementsQuery.data ?? []}
        isLoading={achievementsQuery.isLoading}
        profile={profile}
      />

      <DeleteAccountSection />
    </section>
  )
}

function DeleteAccountSection() {
  const [confirming, setConfirming] = useState(false)
  const [typedValue, setTypedValue] = useState('')
  const inputRef = useRef(null)
  const deleteAccount = useDeleteAccount()
  const navigate = useNavigate()

  const CONFIRM_PHRASE = 'delete my account'
  const confirmed = typedValue.trim().toLowerCase() === CONFIRM_PHRASE

  useEffect(() => {
    if (confirming) inputRef.current?.focus()
  }, [confirming])

  async function handleDelete() {
    if (!confirmed) return
    try {
      await deleteAccount.mutateAsync()
      navigate('/', { replace: true })
    } catch {
      // error shown inline
    }
  }

  return (
    <div className="border-t border-slate-200 pt-6">
      <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
        Danger zone
      </div>

      {!confirming ? (
        <div className="mt-3 flex items-center justify-between rounded-none border border-rose-200 bg-rose-50 px-4 py-3">
          <div>
            <div className="text-sm font-medium text-rose-900">Delete account</div>
            <div className="mt-0.5 text-sm text-rose-700">
              Permanently removes all your data. This cannot be undone.
            </div>
          </div>
          <button
            type="button"
            onClick={() => setConfirming(true)}
            className="ml-4 shrink-0 border border-rose-300 bg-white px-3 py-1.5 text-sm font-medium text-rose-700 hover:bg-rose-100"
          >
            Delete account
          </button>
        </div>
      ) : (
        <div className="mt-3 rounded-none border border-rose-300 bg-rose-50 px-4 py-4 space-y-3">
          <div className="text-sm font-medium text-rose-900">
            Are you sure? This will permanently delete your account and all data.
          </div>
          <div className="text-sm text-rose-700">
            Type <span className="font-mono font-semibold">{CONFIRM_PHRASE}</span> to confirm.
          </div>
          <input
            ref={inputRef}
            type="text"
            value={typedValue}
            onChange={(e) => setTypedValue(e.target.value)}
            placeholder={CONFIRM_PHRASE}
            className="w-full border border-rose-300 bg-white px-3 py-2 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-rose-400"
          />
          {deleteAccount.isError && (
            <div className="text-sm text-rose-900">
              {deleteAccount.error?.message ?? 'Something went wrong. Please try again.'}
            </div>
          )}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleDelete}
              disabled={!confirmed || deleteAccount.isPending}
              className="bg-rose-600 px-3 py-2 text-sm font-medium text-white hover:bg-rose-700 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {deleteAccount.isPending ? 'Deleting…' : 'Delete my account'}
            </button>
            <button
              type="button"
              onClick={() => { setConfirming(false); setTypedValue('') }}
              disabled={deleteAccount.isPending}
              className="border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-40"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

