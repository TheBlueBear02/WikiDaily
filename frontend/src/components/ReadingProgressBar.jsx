import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'

import {
  READING_MILESTONES,
  computeSegmentProgress,
  computeVisibleWindow,
  fillPercentFromZero,
  starLeftPctOnTrack,
} from '../lib/readingMilestones'

export { READING_MILESTONES }

function storageKey(userId, milestoneKey) {
  return `wikidaily:milestone:celebrated:${userId}:${milestoneKey}`
}

/**
 * Set to `true` to show the “Preview article count” UI and honor `?previewReads=` (still requires dev or
 * `VITE_ENABLE_PROGRESS_PREVIEW=true` for URL override). Kept `false` so preview does not appear on the site.
 */
const READING_PROGRESS_PREVIEW_ENABLED = false

/** Dev by default when master switch is on; set `VITE_ENABLE_PROGRESS_PREVIEW=true` for production builds. */
function isProgressPreviewEnabled() {
  if (!READING_PROGRESS_PREVIEW_ENABLED) return false
  return (
    Boolean(import.meta.env.DEV) ||
    import.meta.env.VITE_ENABLE_PROGRESS_PREVIEW === 'true'
  )
}

function parsePreviewReadsParam(raw) {
  if (raw === null || raw === '') return null
  const n = Number(raw)
  if (!Number.isFinite(n)) return null
  return Math.max(0, Math.round(n))
}

function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(false)

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    setReduced(mq.matches)
    const handler = () => setReduced(mq.matches)
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])

  return reduced
}

function StarIcon({ className, filled }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill={filled ? 'currentColor' : 'none'}
      stroke="currentColor"
      strokeWidth="1.5"
      aria-hidden
    >
      <path
        strokeLinejoin="round"
        strokeLinecap="round"
        d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.611l-4.725-2.649a.563.563 0 00-.576 0L6.772 21.02a.562.562 0 01-.84-.611l1.285-5.385a.562.562 0 00-.182-.557l-4.204-3.602a.562.562 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z"
      />
    </svg>
  )
}

export default function ReadingProgressBar({ userId, totalRead, isLoading }) {
  const prefersReducedMotion = usePrefersReducedMotion()
  const [celebratingKeys, setCelebratingKeys] = useState(() => new Set())
  const [searchParams, setSearchParams] = useSearchParams()

  const previewEnabled = isProgressPreviewEnabled()
  const previewOverride = useMemo(() => {
    if (!previewEnabled) return null
    return parsePreviewReadsParam(searchParams.get('previewReads'))
  }, [previewEnabled, searchParams])

  const totalFromProfile = Math.max(0, Number(totalRead) || 0)
  const total = previewOverride !== null ? previewOverride : totalFromProfile
  const isPreview = previewOverride !== null

  useEffect(() => {
    setCelebratingKeys(new Set())
  }, [userId])

  const { next: nextGoal } = useMemo(() => computeSegmentProgress(total), [total])

  const maxRead = READING_MILESTONES[READING_MILESTONES.length - 1].value

  const windowModel = useMemo(() => computeVisibleWindow(total), [total])

  const linearPct = useMemo(() => {
    if (windowModel.complete) return 100
    return fillPercentFromZero(total, windowModel.windowEnd)
  }, [total, windowModel])

  useEffect(() => {
    if (!userId || typeof window === 'undefined' || isPreview) return

    const pending = new Set()
    for (const m of READING_MILESTONES) {
      if (total < m.value) continue
      const k = storageKey(userId, m.key)
      if (window.localStorage.getItem(k)) continue
      pending.add(m.key)
    }

    if (pending.size === 0) return

    setCelebratingKeys((prev) => {
      const merged = new Set(prev)
      pending.forEach((key) => merged.add(key))
      return merged
    })

    const persistT = window.setTimeout(() => {
      for (const m of READING_MILESTONES) {
        if (!pending.has(m.key)) continue
        try {
          window.localStorage.setItem(storageKey(userId, m.key), '1')
        } catch {
          /* ignore quota / private mode */
        }
      }
    }, 750)

    const clearTwinkleT = window.setTimeout(() => {
      setCelebratingKeys((prev) => {
        const next = new Set(prev)
        pending.forEach((key) => next.delete(key))
        return next
      })
    }, 900)

    return () => {
      window.clearTimeout(persistT)
      window.clearTimeout(clearTwinkleT)
      for (const m of READING_MILESTONES) {
        if (!pending.has(m.key)) continue
        try {
          window.localStorage.setItem(storageKey(userId, m.key), '1')
        } catch {
          /* ignore */
        }
      }
    }
  }, [userId, total, isPreview])

  if (isLoading) {
    return (
      <section
        className="w-full rounded-none border border-slate-200 bg-white px-4 py-4"
        aria-busy="true"
        aria-label="Loading reading progress"
      >
        <div className="h-3 w-40 animate-pulse rounded bg-slate-200" />
        <div className="relative mt-4 w-full px-1">
          <div className="relative h-9 w-full">
            <div className="absolute inset-x-1 top-1/2 h-2.5 -translate-y-1/2 rounded-full bg-slate-100" />
            {[20, 45, 70, 100].map((left) => (
              <div
                key={left}
                className="absolute top-1/2 h-5 w-5 -translate-x-1/2 -translate-y-1/2 animate-pulse rounded-full bg-slate-200"
                style={{ left: `${left}%` }}
              />
            ))}
          </div>
          <div className="relative -mt-2 h-4 w-full">
            {[20, 45, 70, 100].map((left) => (
              <div
                key={left}
                className="absolute top-0 h-3 w-5 -translate-x-1/2 animate-pulse rounded bg-slate-100"
                style={{ left: `${left}%` }}
              />
            ))}
          </div>
        </div>
      </section>
    )
  }

  const fillPctRounded = Math.round(linearPct * 10) / 10
  const transitionClass = prefersReducedMotion ? '' : 'transition-[width] duration-700 ease-out'

  const rightLabel =
    total >= READING_MILESTONES[READING_MILESTONES.length - 1].value ? (
      <span className="text-right font-medium text-primary">All milestones unlocked</span>
    ) : nextGoal ? (
      <span className="text-right text-slate-700">
        Next:{' '}
        <span className="font-semibold text-primary">
          {nextGoal.displayName} ({nextGoal.value})
        </span>
      </span>
    ) : null

  const { visible, windowEnd, complete } = windowModel

  return (
    <section
      className="w-full rounded-none border border-slate-200 bg-white px-4 py-4"
      aria-labelledby="reading-goals-heading"
    >
      <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
        <h2
          id="reading-goals-heading"
          className="text-xs font-semibold uppercase tracking-wide text-slate-500"
        >
          Reading goals
        </h2>
      </div>

      <div className="mt-2 flex flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between sm:gap-4">
        <div className="text-sm font-medium text-slate-800">
          {total === 0 ? (
            <span>Your journey starts with one article</span>
          ) : (
            <span>
              <span className="tabular-nums text-primary">{total}</span> articles read
            </span>
          )}
        </div>
        <div className="min-h-[1.25rem] text-sm sm:max-w-[55%]">{rightLabel}</div>
      </div>

      <div className="relative mt-3 w-full px-1 sm:px-2">
        <div
          className="relative h-12 w-full"
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={maxRead}
          aria-valuenow={Math.min(total, maxRead)}
          aria-label={
            complete
              ? 'All reading milestones completed'
              : `Articles read progress from zero toward ${windowEnd}`
          }
        >
          <div className="absolute inset-x-0 top-1/2 h-2.5 -translate-y-1/2 overflow-hidden rounded-full bg-slate-100">
            <div
              className={[
                'h-full rounded-full bg-primary shadow-[0_0_12px_rgba(30,41,82,0.35)]',
                transitionClass,
              ].join(' ')}
              style={{ width: `${fillPctRounded}%` }}
            />
          </div>

          <div className="pointer-events-none absolute inset-x-0 top-1/2 z-[1] -translate-y-1/2">
            {visible.map((m, index) => {
              const unlocked = total >= m.value
              const celebrating = celebratingKeys.has(m.key)
              const twinkle =
                unlocked && celebrating && !prefersReducedMotion
                  ? 'animate-wd-milestone-twinkle'
                  : ''

              const leftPct = starLeftPctOnTrack(m.value, windowEnd)
              const trophyRow = complete && unlocked

              return (
                <div
                  key={m.key}
                  className="pointer-events-auto absolute top-1/2 -translate-x-1/2 -translate-y-1/2"
                  style={{
                    left: `${leftPct}%`,
                    ...(prefersReducedMotion ? {} : { animationDelay: `${index * 40}ms` }),
                  }}
                  title={`${m.displayName}: ${m.value} articles`}
                >
                  <span className="sr-only">
                    {m.displayName}, {m.value} articles
                    {unlocked ? ', unlocked' : ', locked'}
                  </span>
                  <div
                    className={[
                      'flex h-6 w-6 items-center justify-center rounded-full bg-white shadow-sm ring-1 ring-slate-200/80 sm:h-7 sm:w-7',
                      unlocked ? 'text-amber-500 ring-amber-200/60' : 'text-slate-300 ring-slate-200/80',
                      trophyRow ? 'ring-2 ring-amber-400/80 shadow-md' : '',
                      twinkle,
                    ].join(' ')}
                  >
                    <StarIcon
                      className="h-3.5 w-3.5 sm:h-4 sm:w-4"
                      filled={unlocked}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        <div
          className="relative -mt-2 h-4 w-full leading-none"
          aria-hidden
        >
          {visible.map((m) => {
            const leftPct = starLeftPctOnTrack(m.value, windowEnd)
            const done = total >= m.value
            return (
              <div
                key={`${m.key}-goal`}
                className={[
                  'absolute top-0 max-w-[2.75rem] -translate-x-1/2 text-center text-[10px] font-medium tabular-nums text-slate-500 sm:text-xs',
                  done ? 'font-semibold text-primary' : '',
                ].join(' ')}
                style={{ left: `${leftPct}%` }}
              >
                {m.value}
              </div>
            )
          })}
        </div>
      </div>

      {previewEnabled && userId ? (
        <div className="mt-3 border-t border-slate-100 pt-3">
          <details className="group">
            <summary className="cursor-pointer text-xs font-medium text-slate-500 hover:text-slate-700">
              Preview article count
            </summary>
            <p className="mt-2 text-[11px] leading-snug text-slate-500">
              Simulates different totals for this bar only. Uses URL{' '}
              <code className="rounded bg-slate-100 px-1 font-mono text-[10px]">previewReads</code>
              — does not change your profile. In production, set{' '}
              <code className="rounded bg-slate-100 px-1 font-mono text-[10px]">
                VITE_ENABLE_PROGRESS_PREVIEW=true
              </code>{' '}
              to enable.
            </p>
            {isPreview ? (
              <p className="mt-2 text-[11px] font-medium text-amber-950">
                Preview: <span className="tabular-nums">{total}</span> articles shown — saved total is{' '}
                <span className="tabular-nums">{totalFromProfile}</span>.
              </p>
            ) : null}
            <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center">
              <label className="flex min-w-0 flex-1 items-center gap-2 text-xs tabular-nums text-slate-500">
                <span className="shrink-0">0</span>
                <input
                  type="range"
                  min={0}
                  max={550}
                  value={isPreview ? previewOverride : totalFromProfile}
                  onChange={(e) => {
                    const v = Number(e.target.value)
                    setSearchParams(
                      (prev) => {
                        const next = new URLSearchParams(prev)
                        next.set('previewReads', String(v))
                        return next
                      },
                      { replace: true },
                    )
                  }}
                  className="h-2 w-full flex-1 accent-primary"
                />
                <span className="shrink-0">550</span>
              </label>
              <div className="flex flex-wrap items-center gap-2">
                <input
                  type="number"
                  min={0}
                  max={9999}
                  value={isPreview ? previewOverride : totalFromProfile}
                  onChange={(e) => {
                    const v = Math.max(0, Math.round(Number(e.target.value) || 0))
                    setSearchParams(
                      (prev) => {
                        const next = new URLSearchParams(prev)
                        next.set('previewReads', String(v))
                        return next
                      },
                      { replace: true },
                    )
                  }}
                  className="w-[4.5rem] border border-slate-200 px-2 py-1.5 text-sm tabular-nums text-slate-800"
                  aria-label="Preview article count"
                />
                {isPreview ? (
                  <button
                    type="button"
                    onClick={() => {
                      setSearchParams(
                        (prev) => {
                          const next = new URLSearchParams(prev)
                          next.delete('previewReads')
                          return next
                        },
                        { replace: true },
                      )
                    }}
                    className="text-xs font-medium text-primary hover:text-primary-hover"
                  >
                    Clear preview
                  </button>
                ) : null}
              </div>
            </div>
          </details>
        </div>
      ) : null}
    </section>
  )
}
