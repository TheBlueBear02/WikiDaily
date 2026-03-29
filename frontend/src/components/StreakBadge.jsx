import { useUserProgress } from '../hooks/useUserProgress'

export default function StreakBadge() {
  const { userId, profile, authUserQuery } = useUserProgress()

  if (authUserQuery.isLoading) {
    return (
      <div className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs text-slate-600">
        Loading…
      </div>
    )
  }

  if (!userId) {
    return (
      <div className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs text-slate-600">
        Sign in to track streak
      </div>
    )
  }

  const streak = profile?.current_streak ?? 0
  return (
    <div className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs text-slate-700">
      Streak: <span className="font-semibold text-slate-900">{streak}</span>
    </div>
  )
}

