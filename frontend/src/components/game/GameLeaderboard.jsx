import { useState } from 'react'
import { useGameLeaderboard } from '../../hooks/useGameLeaderboard'
import { initialsFromUsername } from '../../lib/profileAvatar'

const ROWS = 8

function formatTime(seconds) {
  if (seconds == null) return '—'
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`
}

function rankBadgeClass(rank) {
  if (rank === 1) return 'bg-amber-100 text-amber-900 ring-1 ring-amber-200/80'
  if (rank === 2) return 'bg-slate-200 text-slate-800 ring-1 ring-slate-300/80'
  if (rank === 3) return 'bg-orange-100 text-orange-900 ring-1 ring-orange-200/80'
  return 'bg-slate-100 text-slate-600 ring-1 ring-slate-200/80'
}

const USERNAME_SKELETON_WIDTH_PCT = [72, 85, 64, 78, 90, 68, 82, 75]

export default function GameLeaderboard({ challengeId }) {
  const [activeTab, setActiveTab] = useState('clicks')
  const { clicksLeaderboard, timeLeaderboard, isLoading } = useGameLeaderboard({ challengeId, limit: ROWS })

  const data = activeTab === 'clicks' ? clicksLeaderboard : timeLeaderboard

  const displayRows = Array.from({ length: ROWS }, (_, i) => ({
    rank: i + 1,
    entry: data[i] ?? null,
  }))

  const tabClass = (tab) =>
    `px-4 py-1 text-xs font-medium border transition-colors ${
      activeTab === tab
        ? 'bg-primary text-white border-primary'
        : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
    }`

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col">
      <div className="w-full bg-primary px-5 py-1 md:px-6 md:py-2">
        <h2 className="w-full text-center text-xl font-bold uppercase tracking-[0.14em] text-white md:text-2xl">
          Leaderboard
        </h2>
      </div>
      <div className="flex w-full items-center justify-center gap-0 border-b border-slate-200 bg-slate-50 px-5 py-2 md:px-6">
        <button className={tabClass('clicks')} onClick={() => setActiveTab('clicks')}>
          Fewest Clicks
        </button>
        <button className={`${tabClass('time')} -ml-px`} onClick={() => setActiveTab('time')}>
          Fastest Time
        </button>
      </div>

      <ol
        className="grid min-h-0 flex-1 divide-y divide-slate-200"
        style={{ gridTemplateRows: `repeat(${ROWS}, minmax(0, 1fr))` }}
        aria-busy={isLoading}
      >
        {displayRows.map(({ rank, entry }) => {
          const isStriped = rank % 2 === 0

          if (isLoading) {
            const wPct = USERNAME_SKELETON_WIDTH_PCT[(rank - 1) % USERNAME_SKELETON_WIDTH_PCT.length]
            return (
              <li
                key={`skeleton-${rank}`}
                className={`flex items-center gap-2.5 px-3 py-1.5 animate-pulse ${isStriped ? 'bg-slate-50' : 'bg-white'}`}
              >
                <span
                  className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold tabular-nums ${rankBadgeClass(rank)}`}
                  aria-hidden
                >
                  {rank}
                </span>
                <div className="h-7 w-7 shrink-0 animate-pulse rounded-full bg-slate-200" />
                <div className="min-w-0 flex-1 space-y-1 py-0.5">
                  <div
                    className="h-4 max-w-full animate-pulse rounded bg-slate-200"
                    style={{ width: `${wPct}%` }}
                  />
                  <div className="h-3 max-w-[55%] animate-pulse rounded bg-slate-200/90" />
                </div>
                <div className="h-4 w-10 animate-pulse rounded bg-slate-200 shrink-0" />
              </li>
            )
          }

          const isEmpty = !entry

          return (
            <li
              key={entry ? `${activeTab}-${rank}` : `empty-${rank}`}
              className={`flex items-center gap-2.5 px-3 py-1.5 ${
                isEmpty ? 'bg-slate-50/60' : isStriped ? 'bg-slate-50' : 'bg-white'
              }`}
            >
              <span
                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold tabular-nums ${rankBadgeClass(rank)} ${isEmpty ? 'opacity-70' : ''}`}
                aria-hidden
              >
                {rank}
              </span>

              {!isEmpty && (
                entry.avatarUrl ? (
                  <img
                    src={entry.avatarUrl}
                    alt=""
                    aria-hidden
                    className="h-7 w-7 shrink-0 rounded-full object-cover"
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
                <div className={`truncate text-sm font-medium ${isEmpty ? 'text-slate-400' : 'text-primary'}`}>
                  {isEmpty ? '—' : (entry.username ?? 'Anonymous')}
                </div>
                {!isEmpty && (
                  <div className="truncate text-[11px] leading-tight text-slate-500">
                    {activeTab === 'clicks'
                      ? `${entry.clicks} ${entry.clicks === 1 ? 'click' : 'clicks'}`
                      : formatTime(entry.time_seconds)}
                  </div>
                )}
              </div>

              {!isEmpty && (
                <div className="shrink-0 text-right">
                  <div className="text-sm font-semibold tabular-nums text-primary">
                    {activeTab === 'clicks' ? entry.clicks : formatTime(entry.time_seconds)}
                  </div>
                  <div className="text-[10px] font-medium uppercase tracking-wide text-slate-400">
                    {activeTab === 'clicks' ? 'clicks' : 'time'}
                  </div>
                </div>
              )}
            </li>
          )
        })}
      </ol>
    </div>
  )
}
