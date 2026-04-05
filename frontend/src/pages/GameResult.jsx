import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { buildAuthUrl } from '../lib/returnTo'
import { useGameChallenge } from '../hooks/useGameChallenge'
import { useGameLeaderboard } from '../hooks/useGameLeaderboard'
import { useUserProgress } from '../hooks/useUserProgress'
import { CARD_SURFACE_STATIC } from '../lib/cardSurface'
import { todayUtcYmd } from '../lib/date'
import { formatTime } from '../lib/formatTime'

export default function GameResult() {
  const location = useLocation()
  const navigate = useNavigate()
  const { userId } = useUserProgress()
  const [copied, setCopied] = useState(false)

  const state = location.state

  // Guard: if navigated directly without playing, redirect
  if (!state?.challengeId) {
    navigate('/game', { replace: true })
    return null
  }

  const { sessionId, clicks, timeSeconds, path, challengeId } = state

  const { data: challengeData } = useGameChallenge()
  const { clicksLeaderboard, timeLeaderboard } = useGameLeaderboard({ challengeId })

  const startArticle = challengeData?.startArticle
  const targetArticle = challengeData?.targetArticle

  // Find user's rank in each leaderboard
  const clicksRank = clicksLeaderboard.find((r) => r.user_id === userId)?.rank ?? null
  const timeRank = timeLeaderboard.find((r) => r.user_id === userId)?.rank ?? null
  const totalPlayers = Math.max(clicksLeaderboard.length, timeLeaderboard.length)

  function handleShare() {
    const appUrl = import.meta.env.VITE_APP_URL ?? window.location.origin
    const pathStr = (path ?? [])
      .map((s) => s.replaceAll('_', ' '))
      .join(' → ')
    const text = [
      `WikiDaily Game — ${todayUtcYmd()}`,
      `${startArticle?.display_title ?? 'Start'} → ${targetArticle?.display_title ?? 'Target'}`,
      `${clicks} ${clicks === 1 ? 'click' : 'clicks'} in ${formatTime(timeSeconds)}${clicksRank ? ` · Rank #${clicksRank}` : ''}`,
      pathStr ? `Path: ${pathStr}` : '',
      `${appUrl}/game`,
    ]
      .filter(Boolean)
      .join('\n')

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
        <p className="text-sm text-slate-500">{todayUtcYmd()}</p>
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
        {userId && (
          <>
            <div className={`${CARD_SURFACE_STATIC} flex flex-col items-center gap-1 p-4`}>
              <span className="text-2xl font-bold text-primary tabular-nums">
                {clicksRank ? `#${clicksRank}` : '—'}
              </span>
              <span className="text-xs text-slate-500">Clicks Rank</span>
            </div>
            <div className={`${CARD_SURFACE_STATIC} flex flex-col items-center gap-1 p-4`}>
              <span className="text-2xl font-bold text-primary tabular-nums">
                {timeRank ? `#${timeRank}` : '—'}
              </span>
              <span className="text-xs text-slate-500">Time Rank</span>
            </div>
          </>
        )}
      </div>

      {/* Guest sign-in prompt */}
      {!userId && (
        <div className={`${CARD_SURFACE_STATIC} flex flex-col items-center gap-3 p-5 text-center`}>
          <p className="text-sm text-slate-600">Sign in to save your score and appear on the leaderboard</p>
          <Link
            to={buildAuthUrl({ returnTo: '/game' })}
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
          View Leaderboard
        </Link>
      </div>
    </div>
  )
}
