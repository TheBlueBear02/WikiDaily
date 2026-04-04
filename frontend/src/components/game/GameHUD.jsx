import TargetCard from './TargetCard'

function formatTime(seconds) {
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`
}

/**
 * Sticky header bar displayed during an active game session.
 * Sits below the Navbar in the normal document flow (sticky top-0 within its scroll container).
 */
export default function GameHUD({ targetArticle, clicks, elapsedSeconds, onGiveUp }) {
  return (
    <div className="sticky top-0 z-40 flex items-center gap-4 border-b border-slate-200 bg-white px-4 py-2">
      <div className="flex items-center gap-2 min-w-0 flex-1">
        <span className="text-xs font-medium text-slate-500 shrink-0">Target:</span>
        <TargetCard article={targetArticle} size="small" />
      </div>

      <div className="flex items-center gap-4 shrink-0">
        <div className="flex items-center gap-1 text-sm tabular-nums">
          <span className="text-slate-500 text-xs">Clicks</span>
          <span className="font-bold text-primary w-6 text-center">{clicks}</span>
        </div>

        <div className="text-sm font-bold text-primary tabular-nums w-12 text-right">
          {formatTime(elapsedSeconds)}
        </div>

        <button
          onClick={onGiveUp}
          className="bg-secondary px-3 py-1 text-xs font-medium text-white hover:bg-secondary-hover transition-colors"
        >
          Give Up
        </button>
      </div>
    </div>
  )
}
