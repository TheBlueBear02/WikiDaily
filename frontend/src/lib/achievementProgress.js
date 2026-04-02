function clamp01(x) {
  if (!Number.isFinite(x)) return 0
  return Math.max(0, Math.min(1, x))
}

/**
 * Progress toward the next locked achievement in a type.
 *
 * Fill matches the UI label `current / nextThreshold` (not a sub-segment between tiers).
 */
export function computeAchievementTypeProgress({
  defsForType,
  unlockedSet,
  currentValue,
} = {}) {
  const list = Array.isArray(defsForType) ? defsForType : []
  const sorted = [...list].sort((a, b) => (a?.threshold ?? 0) - (b?.threshold ?? 0))
  const safeUnlocked = unlockedSet instanceof Set ? unlockedSet : new Set()

  const next = sorted.find((a) => !safeUnlocked.has(a?.id))

  if (!next) {
    const last = sorted[sorted.length - 1]
    return {
      pct: 1,
      nextLabel: last?.label ?? null,
      nextDescription: last?.description ?? null,
      nextIcon: last?.icon ?? null,
      current: currentValue ?? 0,
      nextThreshold: last?.threshold ?? null,
      isMaxed: true,
    }
  }

  const nextThreshold = next?.threshold ?? 0
  const current = Number(currentValue) || 0
  const pct =
    nextThreshold > 0
      ? clamp01(current / nextThreshold)
      : current > 0
        ? 1
        : 0

  return {
    pct,
    nextLabel: next?.label ?? null,
    nextDescription: next?.description ?? null,
    nextIcon: next?.icon ?? null,
    current,
    nextThreshold,
    isMaxed: false,
  }
}
