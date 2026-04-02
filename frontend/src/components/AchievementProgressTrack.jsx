import { useEffect, useState } from 'react'

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

function clamp01(x) {
  if (!Number.isFinite(x)) return 0
  return Math.max(0, Math.min(1, x))
}

/** Same path as `ReadingProgressBar` / `CollectiveReadingProgressBar`. */
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

/** Sized like reading-bar milestone badges; sits on the track end (centered on `left: 100%`). */
function EndStarBadge({ filled, isLoading }) {
  const shell =
    'flex h-6 w-6 items-center justify-center rounded-full bg-white shadow-sm ring-1'

  if (isLoading) {
    return (
      <div className={`${shell} ring-slate-200/80`} aria-hidden>
        <div className="h-3 w-3 animate-pulse rounded-full bg-slate-200/90" />
      </div>
    )
  }

  return (
    <div
      className={[
        shell,
        filled ? 'text-amber-500 ring-amber-200/60' : 'text-slate-300 ring-slate-200/80',
      ].join(' ')}
      title={filled ? 'Goal reached' : 'Next goal'}
    >
      <span className="sr-only">{filled ? 'Next goal reached' : 'Next goal not yet reached'}</span>
      <StarIcon className="h-3.5 w-3.5" filled={filled} />
    </div>
  )
}

/**
 * Matches `CollectiveReadingProgressBar`: rounded track, primary fill + glow, smooth width (reduced-motion aware).
 * Optional `withEndStar`: milestone star centered on the track’s right end (over the bar), same idea as Reading goals.
 */
export default function AchievementProgressTrack({
  value,
  isLoading,
  'aria-label': ariaLabel,
  withEndStar = false,
} = {}) {
  const prefersReducedMotion = usePrefersReducedMotion()
  const transitionClass = prefersReducedMotion ? '' : 'transition-[width] duration-700 ease-out'
  const widthPct = Math.round(clamp01(value) * 1000) / 10
  const starFilled = !isLoading && clamp01(value) >= 1

  const trackInner = (
    <>
      <div className="absolute inset-x-0 top-1/2 h-2 -translate-y-1/2 overflow-hidden rounded-full bg-slate-100">
        {isLoading ? (
          <div className="h-full w-2/5 animate-pulse rounded-full bg-slate-200/90" />
        ) : (
          <div
            className={[
              'h-full rounded-full bg-primary shadow-[0_0_8px_rgba(30,41,82,0.28)]',
              transitionClass,
            ].join(' ')}
            style={{ width: `${widthPct}%` }}
          />
        )}
      </div>
    </>
  )

  if (!withEndStar) {
    if (isLoading) {
      return (
        <div className="relative w-full px-1">
          <div className="relative h-3.5 w-full" aria-busy="true">
            {trackInner}
          </div>
        </div>
      )
    }

    return (
      <div className="relative w-full px-1">
        <div
          className="relative h-3.5 w-full"
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={widthPct}
          aria-label={ariaLabel ?? 'Achievement progress'}
        >
          {trackInner}
        </div>
      </div>
    )
  }

  /* Room for half the star past the track + vertical alignment with reading bars */
  return (
    <div className="relative w-full px-1 pr-2.5">
      <div
        className="relative h-7 w-full"
        role={isLoading ? undefined : 'progressbar'}
        aria-busy={isLoading || undefined}
        aria-valuemin={isLoading ? undefined : 0}
        aria-valuemax={isLoading ? undefined : 100}
        aria-valuenow={isLoading ? undefined : widthPct}
        aria-label={isLoading ? undefined : ariaLabel ?? 'Achievement progress'}
      >
        {trackInner}
        <div className="pointer-events-none absolute inset-x-0 top-1/2 z-[1] -translate-y-1/2">
          <div
            className="pointer-events-auto absolute top-1/2 -translate-x-1/2 -translate-y-1/2"
            style={{ left: '100%' }}
          >
            <EndStarBadge filled={starFilled} isLoading={isLoading} />
          </div>
        </div>
      </div>
    </div>
  )
}
