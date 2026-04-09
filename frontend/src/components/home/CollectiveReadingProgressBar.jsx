import { useEffect, useMemo, useState } from 'react'

import {
  COLLECTIVE_READING_MILESTONES,
  computeSegmentProgress,
  computeVisibleWindow,
  fillPercentFromZero,
  starLeftPctOnTrack,
} from '../../lib/readingMilestones'

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
  className = '',
  /** Tighter padding, smaller track, and smaller stars (e.g. home hero). */
  compact = false,
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

  const sectionClass = [
    'w-full rounded-none border border-slate-200 bg-white',
    compact ? 'px-3 py-2' : 'px-4 py-4',
    className,
  ]
    .filter(Boolean)
    .join(' ')

  if (isLoading) {
    return (
      <section
        className={sectionClass}
        aria-busy="true"
        aria-label="Loading community reading progress"
      >
        <div className={compact ? 'h-2.5 w-40 animate-pulse rounded bg-slate-200' : 'h-3 w-48 animate-pulse rounded bg-slate-200'} />
        <div className={compact ? 'relative mt-2 w-full px-0.5' : 'relative mt-4 w-full px-1'}>
          <div className={compact ? 'relative h-7 w-full' : 'relative h-9 w-full'}>
            <div
              className={[
                'absolute inset-x-1 top-1/2 -translate-y-1/2 rounded-full bg-slate-300',
                compact ? 'h-2' : 'h-2.5',
              ].join(' ')}
            />
            {[20, 45, 70, 100].map((left) => (
              <div
                key={left}
                className={[
                  'absolute top-1/2 -translate-x-1/2 -translate-y-1/2 animate-pulse rounded-full bg-slate-200',
                  compact ? 'h-4 w-4' : 'h-5 w-5',
                ].join(' ')}
                style={{ left: `${left}%` }}
              />
            ))}
          </div>
          <div className={compact ? 'relative -mt-1 h-3 w-full' : 'relative -mt-2 h-4 w-full'}>
            {[20, 45, 70, 100].map((left) => (
              <div
                key={left}
                className={[
                  'absolute top-0 -translate-x-1/2 animate-pulse rounded bg-slate-100',
                  compact ? 'h-2 w-4' : 'h-3 w-5',
                ].join(' ')}
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
      className={sectionClass}
      aria-labelledby="collective-reading-goals-heading"
    >
      <div className="flex flex-col gap-0.5 sm:flex-row sm:items-start sm:justify-between">
        <h2
          id="collective-reading-goals-heading"
          className={[
            'inline-block bg-secondary font-semibold uppercase tracking-wide text-white',
            compact ? 'px-3 py-1 text-[10px] leading-tight' : 'px-4 py-1.5 text-xs',
          ].join(' ')}
        >
          Community reading goals
        </h2>
      </div>

      {isError ? (
        <div
          className={[
            'flex flex-col sm:flex-row sm:items-center sm:justify-between',
            compact ? 'mt-1.5 gap-1.5' : 'mt-2 gap-2',
          ].join(' ')}
        >
          <p className={compact ? 'text-xs leading-snug text-rose-800' : 'text-sm text-rose-800'}>
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
              className={[
                'shrink-0 self-start bg-primary font-medium text-white hover:bg-primary-hover',
                compact ? 'px-2 py-1 text-xs' : 'px-3 py-2 text-sm',
              ].join(' ')}
            >
              Retry
            </button>
          ) : null}
        </div>
      ) : null}

      {!isError ? (
        <>
          <div
            className={[
              'flex flex-col sm:flex-row sm:items-baseline sm:justify-between',
              compact
                ? 'mt-2 gap-0.5 sm:gap-2'
                : 'mt-3 gap-1 sm:gap-4',
            ].join(' ')}
          >
            <div className={compact ? 'text-xs font-medium leading-tight text-slate-800' : 'text-sm font-medium text-slate-800'}>
              {total === 0 ? (
                <span>Every read counts toward our shared goal</span>
              ) : (
                <span>
                  <span className="tabular-nums text-primary">{formatCount(total)}</span> articles
                  read by the community
                </span>
              )}
            </div>
            <div
              className={[
                compact ? 'min-h-0 text-[11px] leading-tight sm:max-w-[58%]' : 'min-h-[1.25rem] text-sm sm:max-w-[55%]',
              ].join(' ')}
            >
              {rightLabel}
            </div>
          </div>

          <div className={compact ? 'relative mt-0.5 w-full px-0.5 sm:px-1' : 'relative mt-0.5 w-full px-1 sm:px-2'}>
            <div
              className={compact ? 'relative h-8 w-full' : 'relative h-12 w-full'}
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
              <div
                className={[
                  'absolute inset-x-0 top-1/2 -translate-y-1/2 overflow-hidden rounded-full bg-slate-300',
                  compact ? 'h-2' : 'h-2.5',
                ].join(' ')}
              >
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
                          'flex items-center justify-center rounded-full bg-white shadow-sm ring-2 ring-slate-300',
                          compact ? 'h-5 w-5' : 'h-6 w-6 sm:h-7 sm:w-7',
                          unlocked ? 'text-amber-500 ring-amber-400/70' : 'text-slate-400 ring-slate-300',
                          trophyRow ? 'ring-2 ring-amber-400/80 shadow-md' : '',
                        ].join(' ')}
                      >
                        <StarIcon
                          className={compact ? 'h-3 w-3' : 'h-3.5 w-3.5 sm:h-4 sm:w-4'}
                          filled={unlocked}
                        />
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            <div
              className={[
                compact ? 'relative -mt-1 h-3 w-full leading-none' : 'relative -mt-2 h-4 w-full leading-none',
                'hidden md:block',
              ].join(' ')}
              aria-hidden
            >
              {visible.map((m) => {
                const leftPct = starLeftPctOnTrack(m.value, windowEnd)
                const done = total >= m.value
                return (
                  <div
                    key={`${m.key}-goal`}
                    className={[
                      'absolute top-0 max-w-[2.75rem] -translate-x-1/2 text-center font-medium tabular-nums text-slate-500',
                      compact ? 'text-[9px]' : 'text-[10px] sm:text-xs',
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
