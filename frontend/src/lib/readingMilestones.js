/**
 * Personal lifetime article-read milestones (Home: signed-in progress bar).
 */
export const READING_MILESTONES = [
  { key: 'reads_10', value: 10, displayName: 'Apprentice' },
  { key: 'reads_50', value: 50, displayName: 'Scholar' },
  { key: 'reads_100', value: 100, displayName: 'Master' },
  { key: 'reads_200', value: 200, displayName: 'Expert' },
  { key: 'reads_365', value: 365, displayName: 'Sage' },
  { key: 'reads_500', value: 500, displayName: 'Legend' },
]

/**
 * Community-wide totals (`COUNT(reading_log)`); larger scale than personal goals.
 * Keep `value` strictly ascending.
 */
export const COLLECTIVE_READING_MILESTONES = [
  { key: 'collab_250', value: 250, displayName: 'Spark' },
  { key: 'collab_750', value: 750, displayName: 'Ember' },
  { key: 'collab_1k', value: 1000, displayName: 'Gathering' },
  { key: 'collab_2500', value: 2500, displayName: 'Ripple' },
  { key: 'collab_5k', value: 5000, displayName: 'Momentum' },
  { key: 'collab_7500', value: 7500, displayName: 'Drift' },
  { key: 'collab_10k', value: 10000, displayName: 'Movement' },
  { key: 'collab_17500', value: 17500, displayName: 'Swell' },
  { key: 'collab_25k', value: 25000, displayName: 'Wave' },
  { key: 'collab_35000', value: 35000, displayName: 'Flood' },
  { key: 'collab_50k', value: 50000, displayName: 'Tide' },
  { key: 'collab_100k', value: 100000, displayName: 'Ocean' },
]

export function computeVisibleWindow(totalRead, milestones = READING_MILESTONES) {
  const ms = milestones
  const last = ms[ms.length - 1]

  if (totalRead >= last.value) {
    return {
      complete: true,
      visible: ms,
      windowEnd: last.value,
    }
  }

  const nextIdx = ms.findIndex((m) => totalRead < m.value)
  if (nextIdx < 0) {
    return { complete: true, visible: ms, windowEnd: last.value }
  }

  const visible = ms.slice(0, nextIdx + 1)
  const windowEnd = ms[nextIdx].value

  return { complete: false, visible, windowEnd }
}

export function fillPercentFromZero(totalRead, windowEnd) {
  if (windowEnd <= 0) return 100
  return Math.min(100, Math.max(0, (totalRead / windowEnd) * 100))
}

export function starLeftPctOnTrack(milestoneValue, windowEnd) {
  if (windowEnd <= 0) return 100
  return (milestoneValue / windowEnd) * 100
}

export function computeSegmentProgress(
  totalRead,
  milestones = READING_MILESTONES,
) {
  const t = Math.max(0, Number(totalRead) || 0)
  const last = milestones[milestones.length - 1]

  if (t >= last.value) {
    return {
      prev: last.value,
      next: null,
      pct: 1,
      nextMilestone: null,
    }
  }

  let prev = 0
  let next = milestones[0]
  for (let i = 0; i < milestones.length; i += 1) {
    const m = milestones[i]
    if (t < m.value) {
      next = m
      break
    }
    prev = m.value
    if (i === milestones.length - 1) {
      next = null
    }
  }

  if (!next) {
    return { prev: last.value, next: null, pct: 1, nextMilestone: null }
  }

  const denom = next.value - prev
  const pct = denom <= 0 ? 1 : Math.min(1, Math.max(0, (t - prev) / denom))

  return { prev, next, pct, nextMilestone: next }
}
