import { useUserProgress } from '../hooks/useUserProgress'

export default function StreakBadge() {
  const { userId, profile, authUserQuery } = useUserProgress()

  if (authUserQuery.isLoading) {
    return (
      <div className="rounded-full bg-slate-50 px-3 py-1 text-xs text-slate-600">
        Loading…
      </div>
    )
  }

  if (!userId) {
    return (
      <div className="rounded-full bg-white px-3 py-1 text-xs text-slate-600">
        Sign in to track streak
      </div>
    )
  }

  const streak = profile?.current_streak ?? 0
  const streakText = String(streak)
  const streakFontClass =
    streakText.length >= 3 ? 'text-[0.65rem]' : streakText.length === 2 ? 'text-xs' : 'text-sm'
  return (
    <div
      className="relative grid h-9 w-9 place-items-center overflow-hidden rounded-full"
      title="Streak days"
    >
      <img
        src="/images/streak-icon.png"
        alt=""
        className="h-full w-full scale-125 object-cover object-center -translate-y-1"
        draggable={false}
      />
      <span
        className={`absolute inset-0 flex items-center justify-center font-semibold text-white drop-shadow-sm leading-none ${streakFontClass}`}
        aria-label={`Current streak: ${streak}`}
      >
        {streak}
      </span>
    </div>
  )
}

