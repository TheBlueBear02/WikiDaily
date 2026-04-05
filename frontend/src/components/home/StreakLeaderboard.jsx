import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

import { useWeeklyReadsLeaderboard } from '../../hooks/useWeeklyReadsLeaderboard'
import { useLeaderboardCountdown } from '../../hooks/useLeaderboardCountdown'
import { getCurrentLevel } from '../../lib/levels'
import { initialsFromUsername } from '../../lib/profileAvatar'
import ProfileTooltip from '../shared/ProfileTooltip'

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

function streakLeaderboardTooltipDomId(entry, rowRank) {
  const key = entry?.userId != null ? String(entry.userId) : `r${rowRank}`
  return `streak-lb-tip-${key}`
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
  const { data, isLoading } = useWeeklyReadsLeaderboard({ limit: safeRows })
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
            const weeklyReads = entry?.weeklyReads ?? null
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

                {!isEmpty && (
                  entry?.avatarUrl ? (
                    <img
                      src={entry.avatarUrl}
                      alt=""
                      aria-hidden
                      className="h-7 w-7 shrink-0 rounded-full object-cover ring-1 ring-slate-200"
                    />
                  ) : (
                    <span
                      className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-amber-100 text-[10px] font-semibold text-amber-950"
                      aria-hidden
                    >
                      {initialsFromUsername(entry.username)}
                    </span>
                  )
                )}

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
                    {weeklyReads === null ? '—' : weeklyReads}
                  </div>
                  <div className="text-[10px] font-medium uppercase tracking-wide text-slate-400">
                    this week
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
          <ProfileTooltip
            displayName={tooltip.entry.username}
            totalRead={tooltip.entry.totalRead ?? 0}
            avatarInitials={initialsFromUsername(tooltip.entry.username)}
            avatarUrl={tooltip.entry.avatarUrl ?? null}
            weeklyReads={tooltip.entry.weeklyReads}
            factsCount={tooltip.entry.factsCount ?? null}
            rect={tooltip.rect}
            tooltipId={tooltipDomId}
          />,
          document.body,
        )}
    </div>
  )
}

