import { useLeaderboardCountdown } from '../../hooks/useLeaderboardCountdown'

/**
 * Weekly leaderboard for the hero aside. Data wiring can replace `entries` via a hook
 * when a public Supabase view or RPC exists.
 */
const PLACEHOLDER_ENTRIES = []

function rankStyle(rank) {
  if (rank === 1) return 'bg-amber-100 text-amber-900 ring-1 ring-amber-200/80'
  if (rank === 2) return 'bg-slate-200 text-slate-800 ring-1 ring-slate-300/80'
  if (rank === 3) return 'bg-orange-100 text-orange-900 ring-1 ring-orange-200/80'
  return 'bg-slate-100 text-slate-600 ring-1 ring-slate-200/80'
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

export default function WeeklyLeaderboard({ entries = PLACEHOLDER_ENTRIES } = {}) {
  const { days, hours, minutes, target } = useLeaderboardCountdown()

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col">
      <header className="w-full shrink-0">
        <div className="w-full bg-primary px-5 py-2 md:px-6 md:py-3">
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

      <div className="flex min-h-0 flex-1 flex-col p-5 pt-4 md:p-6 md:pt-5">
        {entries.length === 0 ? (
          <div className="flex flex-1 flex-col justify-center rounded-lg border border-dashed border-slate-200 bg-slate-50/80 px-4 py-8 text-center">
            <p className="text-sm font-medium text-slate-700">No rankings yet</p>
            <p className="mt-1.5 text-xs leading-relaxed text-slate-500">
              Weekly top readers will appear here when the leaderboard is connected.
            </p>
          </div>
        ) : (
          <ol className="flex flex-col gap-2">
            {entries.map((row) => (
              <li
                key={row.userId ?? `${row.rank}-${row.username}`}
                className="flex items-center gap-3 rounded-lg border border-slate-100 bg-white px-3 py-2.5 shadow-sm"
              >
                <span
                  className={[
                    'flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold tabular-nums',
                    rankStyle(row.rank),
                  ].join(' ')}
                  aria-hidden
                >
                  {row.rank}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-medium text-primary">
                    {row.username}
                  </div>
                </div>
                <div className="shrink-0 text-right">
                  <div className="text-sm font-semibold tabular-nums text-primary">
                    {row.readsThisWeek}
                  </div>
                  <div className="text-[10px] font-medium uppercase tracking-wide text-slate-400">
                    reads
                  </div>
                </div>
              </li>
            ))}
          </ol>
        )}
      </div>
    </div>
  )
}
