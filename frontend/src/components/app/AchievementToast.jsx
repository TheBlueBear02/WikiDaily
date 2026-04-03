import { useEffect, useMemo, useRef, useState } from 'react'

import { useUserProgress } from '../../hooks/useUserProgress'
import { useAchievements } from '../../hooks/useAchievements'

function prefersReducedMotion() {
  if (typeof window === 'undefined') return true
  return Boolean(window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches)
}

function getAchievementById(achievements, id) {
  if (!Array.isArray(achievements)) return null
  return achievements.find((a) => a?.id === id) ?? null
}

export default function AchievementToast() {
  const { userId } = useUserProgress()
  const { achievements, pending, markNotified } = useAchievements({ userId })

  const pendingIds = useMemo(() => {
    if (!Array.isArray(pending)) return []
    const ids = pending
      .map((p) => p?.achievement_id)
      .filter((id) => typeof id === 'number')
    ids.sort((a, b) => a - b)
    return ids
  }, [pending])

  const pendingKey = useMemo(() => pendingIds.join(','), [pendingIds])

  const [queue, setQueue] = useState([])
  const [activeId, setActiveId] = useState(null)
  const [isVisible, setIsVisible] = useState(false)

  const timerRef = useRef(null)
  const reducedMotion = useMemo(() => prefersReducedMotion(), [])

  // Seed and continuously merge newly-arriving pending rows into the internal queue.
  useEffect(() => {
    if (!userId) {
      setQueue([])
      setActiveId(null)
      setIsVisible(false)
      return
    }

    setQueue((prev) => {
      const set = new Set(prev)
      for (const id of pendingIds) set.add(id)
      const next = Array.from(set)
      if (next.length === prev.length && next.every((v, i) => v === prev[i])) return prev
      return next
    })
  }, [pendingKey, userId])

  // Drive active toast from queue.
  useEffect(() => {
    if (!userId) return
    if (activeId != null) return
    if (!Array.isArray(queue) || queue.length === 0) return
    setActiveId(queue[0])
    setIsVisible(true)
  }, [queue, activeId, userId])

  // Auto-dismiss.
  useEffect(() => {
    if (!isVisible || activeId == null) return

    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => {
      setIsVisible(false)
    }, 4000)

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
      timerRef.current = null
    }
  }, [isVisible, activeId])

  async function dismiss() {
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = null
    setIsVisible(false)
  }

  // After exit animation, flip notified and advance.
  useEffect(() => {
    if (activeId == null) return
    if (isVisible) return

    let cancelled = false
    const delayMs = reducedMotion ? 80 : 220

    const t = setTimeout(() => {
      ;(async () => {
        try {
          await markNotified(activeId)
        } catch {
          // Best-effort: even if this fails, continue the queue.
        }
        if (cancelled) return
        setQueue((prev) => prev.filter((id) => id !== activeId))
        setActiveId(null)
      })()
    }, delayMs)

    return () => {
      cancelled = true
      clearTimeout(t)
    }
  }, [activeId, isVisible, markNotified, reducedMotion])

  if (!userId) return null
  if (activeId == null) return null

  const achievement = getAchievementById(achievements, activeId)
  if (!achievement) return null

  const motionClasses = reducedMotion
    ? 'transition-opacity duration-200'
    : 'transition-transform transition-opacity duration-200'

  const visibleClasses = reducedMotion
    ? isVisible
      ? 'opacity-100'
      : 'opacity-0'
    : isVisible
      ? 'opacity-100 translate-x-0'
      : 'opacity-0 translate-x-4'

  return (
    <div className="pointer-events-none fixed bottom-4 right-4 z-50">
      <div
        role="status"
        aria-live="polite"
        className={[
          'pointer-events-auto w-[320px] rounded-none border border-slate-200 bg-white shadow-lg',
          'p-4',
          motionClasses,
          visibleClasses,
        ].join(' ')}
      >
        <div className="flex items-start gap-3">
          <div className="flex h-9 w-9 items-center justify-center text-3xl leading-none">
            {achievement.icon}
          </div>

          <div className="min-w-0 flex-1">
            <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
              Achievement Unlocked!
            </div>
            <div
              className="mt-0.5 truncate text-[15px] font-semibold text-primary"
              style={{ fontFamily: 'ui-serif, Georgia, Cambria, \"Times New Roman\", Times, serif' }}
              title={achievement.label}
            >
              {achievement.label}
            </div>
            <div className="mt-1 text-xs text-slate-600">{achievement.description}</div>
          </div>

          <button
            type="button"
            onClick={dismiss}
            className="rounded-none border border-transparent px-2 py-1 text-xs font-semibold text-slate-500 hover:border-slate-200 hover:bg-slate-50 hover:text-slate-700"
            aria-label="Dismiss achievement toast"
            title="Dismiss"
          >
            ×
          </button>
        </div>
      </div>
    </div>
  )
}

