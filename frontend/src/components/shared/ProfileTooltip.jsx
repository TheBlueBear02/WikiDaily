import { getCurrentLevel, getNextLevel } from '../../lib/levels'
import { initialsFromUsername } from '../../lib/profileAvatar'

const TOOLTIP_APPROX_HALF_W = 150

function formatArticlesRead(n) {
  const x = Number(n) || 0
  return x === 1 ? '1 article read' : `${x} articles read`
}

/**
 * Shared profile hover tooltip used in FactCard and leaderboard rows.
 * Pass `currentStreak` / `factsCount` to show those rows; omit (or pass null/undefined) to hide them.
 */
export default function ProfileTooltip({ displayName, totalRead, avatarInitials, currentStreak, factsCount, rect, tooltipId }) {
  const level = getCurrentLevel(totalRead)
  const next = getNextLevel(totalRead)

  const centerX = rect.left + rect.width / 2
  const clampedLeft = Math.min(
    window.innerWidth - TOOLTIP_APPROX_HALF_W - 12,
    Math.max(TOOLTIP_APPROX_HALF_W + 12, centerX),
  )
  const placeAbove = rect.top > 150
  const top = placeAbove ? rect.top : rect.bottom + 6
  const transform = placeAbove ? 'translate(-50%, -100%)' : 'translate(-50%, 0)'

  const initials = avatarInitials ?? initialsFromUsername(displayName)

  return (
    <div
      id={tooltipId}
      role="tooltip"
      className="pointer-events-none fixed z-[100] w-[min(18rem,calc(100vw-1.5rem))] rounded-none border border-slate-200 bg-white p-3.5 shadow-lg ring-1 ring-slate-900/5"
      style={{ left: clampedLeft, top, transform }}
    >
      <div className="flex gap-3">
        <div
          className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-amber-100 text-sm font-semibold text-amber-950 ring-1 ring-amber-200/80"
          aria-hidden
        >
          {initials}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-primary">{displayName}</p>
          <p className="mt-0.5 text-xs text-slate-600">{`Level ${level.level} · ${level.name}`}</p>
        </div>
      </div>

      <dl className="mt-3 space-y-2 border-t border-slate-100 pt-3 text-xs">
        {currentStreak != null && (
          <div className="flex items-baseline justify-between gap-3">
            <dt className="font-medium text-slate-500">Current streak</dt>
            <dd className="tabular-nums font-semibold text-slate-800">{currentStreak}</dd>
          </div>
        )}
        <div className="flex items-baseline justify-between gap-3">
          <dt className="font-medium text-slate-500">Total reads</dt>
          <dd className="tabular-nums font-semibold text-slate-800">{totalRead}</dd>
        </div>
        {factsCount != null && (
          <div className="flex items-baseline justify-between gap-3">
            <dt className="font-medium text-slate-500">Facts shared</dt>
            <dd className="tabular-nums font-semibold text-slate-800">{factsCount}</dd>
          </div>
        )}
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
