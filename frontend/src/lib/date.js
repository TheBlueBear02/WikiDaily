export function todayUtcYmd() {
  const d = new Date()
  const y = d.getUTCFullYear()
  const m = String(d.getUTCMonth() + 1).padStart(2, '0')
  const day = String(d.getUTCDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

/**
 * WikiDaily "daily day" boundary.
 *
 * The daily picker job runs at 05:00 UTC (see `.github/workflows/daily-picker.yml`).
 * To keep the UI countdown and DB queries consistent, we treat "today" as the
 * current UTC date *after* shifting by this boundary hour.
 */
export const DAILY_RESET_UTC_HOUR = 5

/** "Today" in WikiDaily terms (YYYY-MM-DD), where the day rolls over at 05:00 UTC. */
export function todayDailyYmd(now = new Date()) {
  const shifted = new Date(now.getTime() - DAILY_RESET_UTC_HOUR * 3_600_000)
  const y = shifted.getUTCFullYear()
  const m = String(shifted.getUTCMonth() + 1).padStart(2, '0')
  const d = String(shifted.getUTCDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

export function yesterdayUtcYmd() {
  const d = new Date()
  d.setUTCDate(d.getUTCDate() - 1)
  const y = d.getUTCFullYear()
  const m = String(d.getUTCMonth() + 1).padStart(2, '0')
  const day = String(d.getUTCDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

/**
 * End of the current leaderboard window: next UTC Sunday at 23:59:59.999.
 * If that moment has already passed today (e.g. late Sunday UTC), returns the following Sunday.
 */
export function getNextLeaderboardResetDate(now = new Date()) {
  const y = now.getUTCFullYear()
  const m = now.getUTCMonth()
  const d = now.getUTCDate()
  const dow = now.getUTCDay()

  let daysToSunday = (7 - dow) % 7
  if (daysToSunday === 0) {
    const endOfThisSunday = Date.UTC(y, m, d, 23, 59, 59, 999)
    if (now.getTime() > endOfThisSunday) {
      daysToSunday = 7
    }
  }

  return new Date(Date.UTC(y, m, d + daysToSunday, 23, 59, 59, 999))
}

/** Remaining time until `getNextLeaderboardResetDate`, broken into day/hour/minute parts. */
export function getLeaderboardCountdownParts(now = new Date()) {
  const target = getNextLeaderboardResetDate(now)
  let ms = target.getTime() - now.getTime()
  if (ms < 0) ms = 0

  const days = Math.floor(ms / 86_400_000)
  ms -= days * 86_400_000
  const hours = Math.floor(ms / 3_600_000)
  ms -= hours * 3_600_000
  const minutes = Math.floor(ms / 60_000)

  return { days, hours, minutes, target }
}

/** Next UTC midnight (start of next UTC day). */
export function getNextDailyResetDate(now = new Date()) {
  // Next boundary at DAILY_RESET_UTC_HOUR:00:00.000 UTC.
  const y = now.getUTCFullYear()
  const m = now.getUTCMonth()
  const d = now.getUTCDate()

  const todayBoundary = Date.UTC(y, m, d, DAILY_RESET_UTC_HOUR, 0, 0, 0)
  if (now.getTime() < todayBoundary) return new Date(todayBoundary)
  return new Date(Date.UTC(y, m, d + 1, DAILY_RESET_UTC_HOUR, 0, 0, 0))
}

/** Remaining time until `getNextDailyResetDate`, broken into hour/minute/second parts. */
export function getDailyCountdownParts(now = new Date()) {
  const target = getNextDailyResetDate(now)
  let ms = target.getTime() - now.getTime()
  if (ms < 0) ms = 0

  const hours = Math.floor(ms / 3_600_000)
  ms -= hours * 3_600_000
  const minutes = Math.floor(ms / 60_000)
  ms -= minutes * 60_000
  const seconds = Math.floor(ms / 1000)

  return { hours, minutes, seconds, target }
}

