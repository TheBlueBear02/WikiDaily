import { useEffect, useMemo, useState } from 'react'

import {
  COLLECTIVE_READING_MILESTONES,
  computeSegmentProgress,
  computeVisibleWindow,
  fillPercentFromZero,
  starLeftPctOnTrack,
} from '../lib/readingMilestones'

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
        d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.611l-4.725-2.649a.563.563 0 00-.576 0L6.772 21.02a.562.562 0 01-.84-.611l1.285-5.385a.563.563 0 00-.182-.557l-4.204-3.602a.562.562 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z"
      />
    </svg>
  )
}

function formatCount(n) {
  return new Intl.NumberFormat(undefined, { maximumFractionDigits: 0 }).format(
    Math.max(0, Math.floor(Number(n) || 0)),
  )
}

/** Compact label under the track (avoids rounding 2500 → "3k"). */
function milestoneTrackLabel(value) {
  const v = Math.max(0, Math.floor(Number(value) || 0))
  if (v < 1000) return String(v)
  const k = v / 1000
  if (Number.isInteger(k)) return `${k}k`
  const s = k.toFixed(1)
  return `${s.endsWith('.0') ? s.slice(0, -2) : s}k`
}

export default function CollectiveReadingProgressBar({
  totalRead,
  isLoading,
  isError,
  onRetry,
}) {
  const prefersReducedMotion = usePrefersReducedMotion()
  const ms = COLLECTIVE_READING_MILESTONES

  const total = Math.max(0, Number(totalRead) || 0)

  const { next: nextGoal } = useMemo(
    () => computeSegmentProgress(total, ms),
    [total],
  )

  const maxRead = ms[ms.length - 1].value

  const windowModel = useMemo(
    () => computeVisibleWindow(total, ms),
    [total],
  )

  const linearPct = useMemo(() => {
    if (windowModel.complete) return 100
    return fillPercentFromZero(total, windowModel.windowEnd)
  }, [total, windowModel])

  if (isLoading) {
    return (
      <section
        className="w-full rounded-none border border-slate-200 bg-slate-50/80 px-4 py-4"
        aria-busy="true"
        aria-label="Loading community reading progress"
      >
        <div className="h-3 w-48 animate-pulse rounded bg-slate-200" />
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
    total >= ms[ms.length - 1].value ? (
      <span className="text-right font-medium text-primary">All community milestones unlocked</span>
    ) : nextGoal ? (
      <span className="text-right text-slate-700">
        Next:{' '}
        <span className="font-semibold text-primary">
          {nextGoal.displayName} ({formatCount(nextGoal.value)})
        </span>
      </span>
    ) : null

  const { visible, windowEnd, complete } = windowModel

  return (
    <section
      className="w-full rounded-none border border-slate-200 bg-slate-50/80 px-4 py-4"
      aria-labelledby="collective-reading-goals-heading"
    >
      <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
        <h2
          id="collective-reading-goals-heading"
          className="text-xs font-semibold uppercase tracking-wide text-slate-500"
        >
          Community reading goals
        </h2>
      </div>

      {isError ? (
        <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-rose-800">
            Couldn’t load the community total. Deploy the{' '}
            <code className="rounded bg-slate-100 px-1 font-mono text-[11px]">
              collective_reads_count
            </code>{' '}
            RPC in Supabase, or try again.
          </p>
          {typeof onRetry === 'function' ? (
            <button
              type="button"
              onClick={() => onRetry()}
              className="shrink-0 self-start bg-primary px-3 py-2 text-sm font-medium text-white hover:bg-primary-hover"
            >
              Retry
            </button>
          ) : null}
        </div>
      ) : null}

      {!isError ? (
        <>
          <div className="mt-2 flex flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between sm:gap-4">
            <div className="text-sm font-medium text-slate-800">
              {total === 0 ? (
                <span>Every read counts toward our shared goal</span>
              ) : (
                <span>
                  <span className="tabular-nums text-primary">{formatCount(total)}</span> articles
                  read by the community
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
                  ? 'All community reading milestones completed'
                  : `Community articles read progress from zero toward ${windowEnd}`
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
                      title={`${m.displayName}: ${formatCount(m.value)} articles`}
                    >
                      <span className="sr-only">
                        {m.displayName}, {formatCount(m.value)} articles
                        {unlocked ? ', unlocked' : ', locked'}
                      </span>
                      <div
                        className={[
                          'flex h-6 w-6 items-center justify-center rounded-full bg-white shadow-sm ring-1 ring-slate-200/80 sm:h-7 sm:w-7',
                          unlocked ? 'text-amber-500 ring-amber-200/60' : 'text-slate-300 ring-slate-200/80',
                          trophyRow ? 'ring-2 ring-amber-400/80 shadow-md' : '',
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

            <div className="relative -mt-2 h-4 w-full leading-none" aria-hidden>
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
                    {milestoneTrackLabel(m.value)}
                  </div>
                )
              })}
            </div>
          </div>
        </>
      ) : null}
    </section>
  )
}
