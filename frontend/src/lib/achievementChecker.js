/**
 * Returns achievements that should be newly unlocked based on current profile values.
 *
 * Pure function:
 * - no Supabase calls
 * - no React
 * - no side effects
 *
 * @param {Object|null} profile - current `profiles` row (shape: { total_read, total_random_read, current_streak })
 * @param {Array} achievements - all rows from `achievements` table
 * @param {Set<Number>} alreadyUnlocked - Set of achievement ids already in `user_achievements`
 * @returns {Array} achievements to unlock
 */
export function getNewlyUnlocked(profile, achievements, alreadyUnlocked) {
  const safeAchievements = Array.isArray(achievements) ? achievements : []
  const safeUnlocked = alreadyUnlocked instanceof Set ? alreadyUnlocked : new Set()

  const totalRead = profile?.total_read ?? 0
  const totalRandomRead = profile?.total_random_read ?? 0
  const currentStreak = profile?.current_streak ?? 0

  return safeAchievements.filter((a) => {
    const id = a?.id
    if (typeof id !== 'number') return false
    if (safeUnlocked.has(id)) return false

    const type = a?.type
    const threshold = a?.threshold ?? 0

    if (type === 'total_read') return totalRead >= threshold
    if (type === 'random_read') return totalRandomRead >= threshold
    if (type === 'streak') return currentStreak >= threshold

    return false
  })
}

