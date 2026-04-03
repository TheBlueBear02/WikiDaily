import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

import { useStreakLeaderboard } from '../hooks/useStreakLeaderboard'
import { useLeaderboardCountdown } from '../hooks/useLeaderboardCountdown'
import { getCurrentLevel, getNextLevel } from '../lib/levels'
import { initialsFromUsername } from '../lib/profileAvatar'

const DEFAULT_ROWS = 8

function rankBadgeClass(rank) {
  if (rank === 1) return 'bg-amber-100 text-amber-900 ring-1 ring-amber-200/80'
  if (rank === 2) return 'bg-slate-200 text-slate-800 ring-1 ring-slate-300/80'
  if (rank === 3) return 'bg-orange-100 text-orange-900 ring-1 ring-orange-200/80'
  return 'bg-slate-100 text-slate-600 ring-1 ring-slate-200/80'
}

function clampRows(rows) {
  const n = Number(rows)
  if (!Number.isFinite(n)) return DEFAULT_ROWS
  return Math.max(1, Math.min(25, Math.floor(n)))
}

/** Varying widths so skeleton rows do not look identical (percent of row). */
const USERNAME_SKELETON_WIDTH_PCT = [72, 85, 64, 78, 90, 68, 82, 75, 88, 70, 80, 73, 86, 66, 79, 84, 71, 77, 83, 69, 76, 81, 74, 87, 65]

function LeaderboardRowSkeleton({ rank }) {
  const wPct = USERNAME_SKELETON_WIDTH_PCT[(rank - 1) % USERNAME_SKELETON_WIDTH_PCT.length]
  return (
    <>
      <span
        className={[
          'flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold tabular-nums',
          rankBadgeClass(rank),
        ].join(' ')}
        aria-hidden
      >
        {rank}
      </span>
      <div className="min-w-0 flex-1 space-y-1 py-0.5">
        <div
          className="h-4 max-w-full animate-pulse rounded bg-slate-200 motion-reduce:animate-none"
          style={{ width: `${wPct}%` }}
        />
        <div
          className="h-3 max-w-[55%] animate-pulse rounded bg-slate-200/90 motion-reduce:animate-none"
          aria-hidden
        />
      </div>
      <div className="flex shrink-0 flex-col items-end gap-1.5 py-0.5 text-right">
        <div className="h-4 w-10 animate-pulse rounded bg-slate-200 motion-reduce:animate-none" />
        <div className="h-2.5 w-9 animate-pulse rounded bg-slate-200/90 motion-reduce:animate-none" />
      </div>
    </>
  )
}

function CountdownLabel({ days, hours, minutes }) {
  const d = days === 1 ? '1 day' : `${days} days`
  const h = hours === 1 ? '1 hr' : `${hours} hrs`
  const m = minutes === 1 ? '1 min' : `${minutes} mins`
  return (
    <span className="tabular-nums">
      {d}, {h}, {m} until reset
    </span>
  )
}

const TOOLTIP_HIDE_MS = 180
const TOOLTIP_APPROX_HALF_W = 150

function formatArticlesRead(n) {
  const x = Number(n) || 0
  return x === 1 ? '1 article read' : `${x} articles read`
}

function streakLeaderboardTooltipDomId(entry, rowRank) {
  const key = entry?.userId != null ? String(entry.userId) : `r${rowRank}`
  return `streak-lb-tip-${key}`
}

function LeaderboardUserTooltip({ entry, rect, tooltipId }) {
  const totalRead = entry.totalRead ?? 0
  const level = getCurrentLevel(totalRead)
  const next = getNextLevel(totalRead)
  const avatarInitials = initialsFromUsername(entry.username)

  const centerX = rect.left + rect.width / 2
  const clampedLeft = Math.min(
    window.innerWidth - TOOLTIP_APPROX_HALF_W - 12,
    Math.max(TOOLTIP_APPROX_HALF_W + 12, centerX),
  )
  const placeAbove = rect.top > 150
  const top = placeAbove ? rect.top : rect.bottom + 6
  const transform = placeAbove ? 'translate(-50%, -100%)' : 'translate(-50%, 0)'

  return (
    <div
      id={tooltipId}
      role="tooltip"
      className="pointer-events-none fixed z-[100] w-[min(18rem,calc(100vw-1.5rem))] rounded-lg border border-slate-200 bg-white p-3.5 shadow-lg ring-1 ring-slate-900/5"
      style={{ left: clampedLeft, top, transform }}
    >
      <div className="flex gap-3">
        <div
          className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-amber-100 text-sm font-semibold text-amber-950 ring-1 ring-amber-200/80"
          aria-hidden
        >
          {avatarInitials}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-primary">{entry.username}</p>
          <p className="mt-0.5 text-xs text-slate-600">{`Level ${level.level} · ${level.name}`}</p>
        </div>
      </div>

      <dl className="mt-3 space-y-2 border-t border-slate-100 pt-3 text-xs">
        <div className="flex items-baseline justify-between gap-3">
          <dt className="font-medium text-slate-500">Current streak</dt>
          <dd className="tabular-nums font-semibold text-slate-800">{entry.currentStreak}</dd>
        </div>
        <div className="flex items-baseline justify-between gap-3">
          <dt className="font-medium text-slate-500">Total reads</dt>
          <dd className="tabular-nums font-semibold text-slate-800">{totalRead}</dd>
        </div>
      </dl>

      {next ? (
        <p className="mt-2.5 border-t border-slate-100 pt-2.5 text-[11px] leading-snug text-slate-500">
          {`${formatArticlesRead(totalRead)} · Next: Level ${next.level} (${next.name}) at ${next.threshold.toLocaleString()} reads`}
        </p>
      ) : (
        <p className="mt-2.5 border-t border-slate-100 pt-2.5 text-[11px] leading-snug text-slate-500">
          {`${formatArticlesRead(totalRead)} · Max reader level`}
        </p>
      )}
    </div>
  )
}

function useLeaderboardTooltip() {
  const [tooltip, setTooltip] = useState(null)
  const hideTimerRef = useRef(null)

  const clearHideTimer = useCallback(() => {
    if (hideTimerRef.current != null) {
      clearTimeout(hideTimerRef.current)
      hideTimerRef.current = null
    }
  }, [])

  const scheduleHide = useCallback(() => {
    clearHideTimer()
    hideTimerRef.current = window.setTimeout(() => {
      hideTimerRef.current = null
      setTooltip(null)
    }, TOOLTIP_HIDE_MS)
  }, [clearHideTimer])

  const showForEntry = useCallback(
    (entry, el, rowRank) => {
      if (!entry || !el) return
      clearHideTimer()
      setTooltip({ entry, rect: el.getBoundingClientRect(), rowRank })
    },
    [clearHideTimer],
  )

  useEffect(() => () => clearHideTimer(), [clearHideTimer])

  return { tooltip, showForEntry, scheduleHide, clearHideTimer }
}

export default function StreakLeaderboard({ rows = DEFAULT_ROWS } = {}) {
  const safeRows = clampRows(rows)
  const { days, hours, minutes, target } = useLeaderboardCountdown()
  const { data, isLoading } = useStreakLeaderboard({ limit: safeRows })
  const entries = data ?? []
  const { tooltip, showForEntry, scheduleHide } = useLeaderboardTooltip()
  const tooltipDomId =
    tooltip?.entry != null && tooltip.rowRank != null
      ? streakLeaderboardTooltipDomId(tooltip.entry, tooltip.rowRank)
      : 'streak-lb-tip'

  const displayRows = useMemo(() => {
    return Array.from({ length: safeRows }, (_, idx) => ({
      rank: idx + 1,
      entry: entries[idx] ?? null,
    }))
  }, [entries, safeRows])

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col">
      <header className="w-full shrink-0">
        <div className="w-full bg-primary px-5 py-1 md:px-6 md:py-2">
          <h2 className="w-full text-center text-xl font-bold uppercase tracking-[0.14em] text-white md:text-2xl">
            Leaderboard
          </h2>
        </div>
        <p
          className="w-full border-b border-slate-200 bg-slate-50 px-5 py-2 text-center text-xs font-medium text-slate-600 md:px-6"
          aria-live="polite"
          aria-atomic="true"
          title={`Resets ${target.toISOString()}`}
        >
          <span className="sr-only">Time until leaderboard resets: </span>
          <CountdownLabel days={days} hours={hours} minutes={minutes} />
        </p>
      </header>

      <div className="flex min-h-0 flex-1 flex-col p-0">
        <ol
          className="grid min-h-0 flex-1 divide-y divide-slate-200"
          style={{ gridTemplateRows: `repeat(${safeRows}, minmax(0, 1fr))` }}
          aria-busy={isLoading}
          aria-label={isLoading ? 'Loading leaderboard' : undefined}
        >
          {displayRows.map(({ rank, entry }) => {
            if (isLoading) {
              return (
                <li
                  key={`skeleton-${rank}`}
                  className={[
                    'flex items-center gap-2.5 rounded-none px-3 py-1.5',
                    rank % 2 === 0 ? 'bg-slate-50' : 'bg-white',
                  ].join(' ')}
                >
                  <LeaderboardRowSkeleton rank={rank} />
                </li>
              )
            }

            const isEmpty = !entry
            const username = entry?.username ?? '—'
            const streak = entry?.currentStreak ?? null
            const level = getCurrentLevel(entry?.totalRead ?? 0)
            const isStriped = rank % 2 === 0

            return (
              <li
                key={entry?.userId ?? `rank-${rank}`}
                className={[
                  'flex items-center gap-2.5 rounded-none px-3 py-1.5',
                  isEmpty
                    ? 'bg-slate-50/60'
                    : isStriped
                      ? 'bg-slate-50'
                      : 'bg-white',
                  !isEmpty ? 'cursor-default' : '',
                ].join(' ')}
                onMouseEnter={
                  isEmpty
                    ? undefined
                    : (e) => {
                        showForEntry(entry, e.currentTarget, rank)
                      }
                }
                onMouseLeave={isEmpty ? undefined : scheduleHide}
                aria-describedby={!isEmpty && tooltip?.rowRank === rank ? tooltipDomId : undefined}
              >
                <span
                  className={[
                    'flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold tabular-nums',
                    rankBadgeClass(rank),
                    isEmpty ? 'opacity-70' : '',
                  ].join(' ')}
                  aria-hidden
                >
                  {rank}
                </span>

                <div className="min-w-0 flex-1">
                  <div
                    className={[
                      'truncate text-sm font-medium',
                      isEmpty ? 'text-slate-400' : 'text-primary',
                    ].join(' ')}
                  >
                    {username}
                  </div>
                  {!isEmpty ? (
                    <div className="truncate text-[11px] leading-tight text-slate-500">
                      {`Level ${level.level} · ${level.name}`}
                    </div>
                  ) : null}
                </div>

                <div className="shrink-0 text-right">
                  <div
                    className={[
                      'text-sm font-semibold tabular-nums',
                      isEmpty ? 'text-slate-400' : 'text-primary',
                    ].join(' ')}
                  >
                    {streak === null ? '—' : streak}
                  </div>
                  <div className="text-[10px] font-medium uppercase tracking-wide text-slate-400">
                    streak
                  </div>
                </div>
              </li>
            )
          })}
        </ol>
      </div>

      {typeof document !== 'undefined' &&
        tooltip?.entry &&
        createPortal(
          <LeaderboardUserTooltip
            entry={tooltip.entry}
            rect={tooltip.rect}
            tooltipId={tooltipDomId}
          />,
          document.body,
        )}
    </div>
  )
}

