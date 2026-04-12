import { useEffect, useMemo, useState } from 'react'

import { useUserProgress } from '../../hooks/useUserProgress'
import { getNextDailyResetDate, todayDailyYmd, yesterdayDailyYmd } from '../../lib/date'

export default function StreakBadge({ className = '' } = {}) {
  const { userId, profile, authUserQuery, profileQuery } = useUserProgress()
  const [tick, forceTick] = useState(0)

  useEffect(() => {
    // Ensure the streak display flips at the daily rollover even if the app stays open.
    const target = getNextDailyResetDate()
    const ms = Math.max(250, target.getTime() - Date.now() + 50)
    const id = window.setTimeout(() => forceTick((v) => v + 1), ms)
    return () => window.clearTimeout(id)
  }, [tick])

  const streak = useMemo(() => {
    const raw = profile?.current_streak ?? 0
    const lastRead = profile?.last_read ?? null
    if (!lastRead) return 0

    const today = todayDailyYmd()
    const yesterday = yesterdayDailyYmd()

    // If the user missed at least one daily rollover without reading, the streak is effectively broken.
    if (lastRead !== today && lastRead !== yesterday) return 0
    return raw
  }, [profile?.current_streak, profile?.last_read, tick])

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

  // Do not use `isPending` alone: disabled queries stay `pending` with no fetch.
  // Wait until profile data exists (same source as level in Navbar).
  if (!profile && !profileQuery.isError) {
    return (
      <div
        className={`h-9 w-9 shrink-0 animate-pulse rounded-full bg-slate-200 motion-reduce:animate-none ${className}`}
        role="status"
        aria-label="Loading streak"
      />
    )
  }

  const streakText = String(streak)
  const streakFontClass =
    streakText.length >= 3 ? 'text-[0.65rem]' : streakText.length === 2 ? 'text-xs' : 'text-sm'
  return (
    <div
      className={`relative grid h-9 w-9 place-items-center overflow-hidden rounded-full ${className}`}
      title="Streak days"
    >
      <img
        src="/images/streak-icon-noBG.png"
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

