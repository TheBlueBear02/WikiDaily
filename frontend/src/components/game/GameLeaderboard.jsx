import { useState } from 'react'
import { useGameLeaderboard } from '../../hooks/useGameLeaderboard'

function formatTime(seconds) {
  if (seconds == null) return '—'
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`
}

function SkeletonRows() {
  return Array.from({ length: 5 }, (_, i) => (
    <div key={i} className="flex items-center gap-3 px-3 py-2 animate-pulse">
      <div className="h-6 w-6 rounded-full bg-slate-200 shrink-0" />
      <div className="h-3 flex-1 rounded bg-slate-200" />
      <div className="h-3 w-12 rounded bg-slate-200" />
    </div>
  ))
}

function RankBadge({ rank }) {
  const base = 'flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold'
  if (rank === 1) return <span className={`${base} bg-amber-400 text-white`}>1</span>
  if (rank === 2) return <span className={`${base} bg-slate-300 text-white`}>2</span>
  if (rank === 3) return <span className={`${base} bg-amber-700 text-white`}>3</span>
  return <span className={`${base} bg-slate-100 text-slate-500`}>{rank}</span>
}

export default function GameLeaderboard({ challengeId }) {
  const [activeTab, setActiveTab] = useState('clicks')
  const { clicksLeaderboard, timeLeaderboard, isLoading } = useGameLeaderboard({ challengeId })

  const rows = activeTab === 'clicks' ? clicksLeaderboard : timeLeaderboard

  const tabClass = (tab) =>
    `px-4 py-1.5 text-xs font-medium border transition-colors ${
      activeTab === tab
        ? 'bg-primary text-white border-primary'
        : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
    }`

  return (
    <div className="flex flex-col border border-slate-200 bg-white">
      <div className="flex items-center justify-between border-b border-slate-200 px-3 py-2">
        <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
          Leaderboard
        </span>
        <div className="flex">
          <button className={tabClass('clicks')} onClick={() => setActiveTab('clicks')}>
            Fewest Clicks
          </button>
          <button className={`${tabClass('time')} -ml-px`} onClick={() => setActiveTab('time')}>
            Fastest Time
          </button>
        </div>
      </div>

      <div className="flex flex-col divide-y divide-slate-100">
        {isLoading ? (
          <SkeletonRows />
        ) : rows.length === 0 ? (
          <p className="px-3 py-6 text-center text-sm text-slate-400">
            No completions yet — be the first!
          </p>
        ) : (
          rows.map((row) => (
            <div key={row.rank} className="flex items-center gap-3 px-3 py-2">
              <RankBadge rank={row.rank} />
              <span className="flex-1 text-sm text-primary truncate">
                {row.username ?? 'Anonymous'}
              </span>
              {activeTab === 'clicks' ? (
                <span className="text-sm font-semibold text-slate-700 tabular-nums">
                  {row.clicks} {row.clicks === 1 ? 'click' : 'clicks'}
                </span>
              ) : (
                <span className="text-sm font-semibold text-slate-700 tabular-nums">
                  {formatTime(row.time_seconds)}
                </span>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  )
}
