export const LEVELS = [
  { level: 0, threshold: 0, name: 'New Reader' },
  { level: 1, threshold: 10, name: 'Curious Mind' },
  { level: 2, threshold: 25, name: 'Seeker' },
  { level: 3, threshold: 50, name: 'Scholar' },
  { level: 4, threshold: 100, name: 'Thinker' },
  { level: 5, threshold: 200, name: 'Sage' },
  { level: 6, threshold: 365, name: 'Devoted' },
  { level: 7, threshold: 500, name: 'Luminary' },
  { level: 8, threshold: 750, name: 'Visionary' },
  { level: 9, threshold: 1000, name: 'Philosopher' },
  { level: 10, threshold: 2000, name: 'Oracle' },
]

/**
 * Returns the current level object for a given totalRead count.
 * Always returns something — Level 0 (New Reader) is the floor.
 */
export function getCurrentLevel(totalRead) {
  return (
    [...LEVELS].reverse().find((l) => (totalRead ?? 0) >= l.threshold) ?? LEVELS[0]
  )
}

/**
 * Returns the next level object, or null if the user is at max level.
 */
export function getNextLevel(totalRead) {
  return LEVELS.find((l) => l.threshold > (totalRead ?? 0)) ?? null
}
