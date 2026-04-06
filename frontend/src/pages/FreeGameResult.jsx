import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { buildAuthUrl } from '../lib/returnTo'
import { usePersonalBest } from '../hooks/usePersonalBest'
import { useUserProgress } from '../hooks/useUserProgress'
import { CARD_SURFACE_STATIC } from '../lib/cardSurface'
import { formatTime } from '../lib/formatTime'

export default function FreeGameResult() {
  const location = useLocation()
  const navigate = useNavigate()
  const { userId } = useUserProgress()
  const [copied, setCopied] = useState(false)

  const state = location.state

  // Guard: if navigated directly without playing, redirect
  if (!state?.challengeId) {
    navigate('/game/free', { replace: true })
    return null
  }

  const { clicks, timeSeconds, path, startArticle, targetArticle } = state

  const { data: personalBest } = usePersonalBest({ userId })

  const bestClicks = personalBest?.bestClicks ?? null
  const bestTime = personalBest?.bestTime ?? null

  // Detect new personal bests — only meaningful if prior records exist
  const isNewClicksBest = userId && bestClicks !== null && clicks < bestClicks.clicks
  const isNewTimeBest = userId && bestTime !== null && timeSeconds < bestTime.time_seconds
  // First-ever game: both are new bests
  const isFirstGame = userId && bestClicks === null && bestTime === null

  function handleShare() {
    const appUrl = import.meta.env.VITE_APP_URL ?? window.location.origin
    const startTitle = startArticle?.display_title ?? 'Start'
    const targetTitle = targetArticle?.display_title ?? 'Target'
    const text = [
      'WikiDaily Casual Game',
      `${startTitle} → ${targetTitle} in ${clicks} ${clicks === 1 ? 'click' : 'clicks'} (${formatTime(timeSeconds)})`,
      `Can you beat me? ${appUrl}/game/free`,
    ].join('\n')

    navigator.clipboard.writeText(text).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }).catch(() => {})
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6 py-4">
      {/* Header */}
      <div className="text-center space-y-1">
        <h1 className="text-xl font-bold text-primary">
          You reached {targetArticle?.display_title ?? 'the target'}!
        </h1>
        <p className="text-sm text-slate-500">Casual Game</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3">
        <div className={`${CARD_SURFACE_STATIC} flex flex-col items-center gap-1 p-4`}>
          <span className="text-2xl font-bold text-primary tabular-nums">{clicks}</span>
          <span className="text-xs text-slate-500">Clicks</span>
        </div>
        <div className={`${CARD_SURFACE_STATIC} flex flex-col items-center gap-1 p-4`}>
          <span className="text-2xl font-bold text-primary tabular-nums">{formatTime(timeSeconds)}</span>
          <span className="text-xs text-slate-500">Time</span>
        </div>
      </div>

      {/* Personal bests comparison (signed-in only) */}
      {userId && (
        <div className={`${CARD_SURFACE_STATIC} p-4 space-y-3`}>
          <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-500">Personal Bests</h2>

          {isFirstGame ? (
            <div className="flex items-center gap-2">
              <span className="bg-green-100 text-green-700 text-xs font-semibold px-2 py-0.5 rounded-full">
                First game recorded!
              </span>
              <span className="text-sm text-slate-600">Your scores have been saved as personal bests.</span>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1">
                <span className="text-xs text-slate-400 uppercase tracking-wide">Fewest Clicks</span>
                {isNewClicksBest ? (
                  <div className="flex items-center gap-2">
                    <span className="text-lg font-bold text-green-600 tabular-nums">{clicks}</span>
                    <span className="bg-green-100 text-green-700 text-xs font-semibold px-2 py-0.5 rounded-full">New best!</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <span className="text-lg font-bold text-primary tabular-nums">
                      {bestClicks ? bestClicks.clicks : clicks}
                    </span>
                    {bestClicks && clicks > bestClicks.clicks && (
                      <span className="text-xs text-slate-400">best: {bestClicks.clicks}</span>
                    )}
                  </div>
                )}
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-xs text-slate-400 uppercase tracking-wide">Fastest Time</span>
                {isNewTimeBest ? (
                  <div className="flex items-center gap-2">
                    <span className="text-lg font-bold text-green-600 tabular-nums">{formatTime(timeSeconds)}</span>
                    <span className="bg-green-100 text-green-700 text-xs font-semibold px-2 py-0.5 rounded-full">New best!</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <span className="text-lg font-bold text-primary tabular-nums">
                      {bestTime ? formatTime(bestTime.time_seconds) : formatTime(timeSeconds)}
                    </span>
                    {bestTime && timeSeconds > bestTime.time_seconds && (
                      <span className="text-xs text-slate-400">best: {formatTime(bestTime.time_seconds)}</span>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Guest sign-in prompt */}
      {!userId && (
        <div className={`${CARD_SURFACE_STATIC} flex flex-col items-center gap-3 p-5 text-center`}>
          <p className="text-sm text-slate-600">Sign in to save your personal bests</p>
          <Link
            to={buildAuthUrl({ returnTo: '/game/free' })}
            className="bg-primary px-5 py-2 text-sm font-semibold text-white hover:bg-primary-hover transition-colors"
          >
            Sign In
          </Link>
        </div>
      )}

      {/* Path */}
      {path && path.length > 0 && (
        <div className={`${CARD_SURFACE_STATIC} p-4 space-y-2`}>
          <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Your Path ({path.length} articles)
          </h2>
          <ol className="space-y-1">
            {path.map((slug, i) => (
              <li key={`${slug}-${i}`} className="flex items-center gap-2 text-sm">
                <span className="text-xs text-slate-400 tabular-nums w-5 text-right shrink-0">
                  {i + 1}.
                </span>
                <span className={i === path.length - 1 ? 'font-semibold text-primary' : 'text-slate-700'}>
                  {slug.replaceAll('_', ' ')}
                </span>
              </li>
            ))}
          </ol>
        </div>
      )}

      {/* Actions */}
      <div className="flex flex-wrap gap-3">
        <Link
          to="/game/free"
          className="bg-secondary px-6 py-2 text-sm font-semibold text-white hover:bg-secondary-hover transition-colors"
        >
          Play Again
        </Link>
        <button
          onClick={handleShare}
          className="border border-primary px-4 py-2 text-sm font-medium text-primary hover:bg-primary hover:text-white transition-colors"
        >
          {copied ? 'Copied!' : 'Share Result'}
        </button>
        <Link
          to="/game"
          className="border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
        >
          Back to Game Hub
        </Link>
      </div>
    </div>
  )
}
