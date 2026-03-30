import StatCard from './StatCard'

function SkeletonStatCard() {
  return (
    <div className="rounded-none bg-slate-50 p-4">
      <div className="h-3 w-24 animate-pulse rounded bg-slate-200" />
      <div className="mt-3 h-8 w-28 animate-pulse rounded bg-slate-200" />
    </div>
  )
}

export default function StatsRow({ profile, isLoading }) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <SkeletonStatCard />
        <SkeletonStatCard />
        <SkeletonStatCard />
      </div>
    )
  }

  const currentStreak = profile?.current_streak ?? 0
  const maxStreak = profile?.max_streak ?? 0
  const totalRead = profile?.total_read ?? 0

  const streakValue = currentStreak === 0 ? 'Start today' : String(currentStreak)
  const streakSuffix = currentStreak === 0 ? null : 'days'

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
      <StatCard
        label="Current Streak"
        value={streakValue}
        valueSuffix={streakSuffix}
        helper={
          currentStreak >= 7 ? (
            <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-950">
              On fire
            </span>
          ) : null
        }
      />
      <StatCard label="Longest Streak" value={maxStreak} valueSuffix="days" />
      <StatCard label="Total Articles Read" value={totalRead} />
    </div>
  )
}

