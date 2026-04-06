import { useQuery } from '@tanstack/react-query'
import { Link, useNavigate } from 'react-router-dom'
import { useFreeGameChallenge } from '../hooks/useFreeGameChallenge'
import { usePersonalBest } from '../hooks/usePersonalBest'
import { useUserProgress } from '../hooks/useUserProgress'
import { buildAuthUrl } from '../lib/returnTo'
import { CARD_SURFACE_STATIC } from '../lib/cardSurface'
import { formatTime } from '../lib/formatTime'
import { getSupabase } from '../lib/supabaseClient'

function useRecentFreeGames({ userId }) {
  return useQuery({
    queryKey: ['recentFreeGames', userId],
    queryFn: async () => {
      const supabase = getSupabase()

      const { data: challenges, error: cError } = await supabase
        .from('game_challenges')
        .select('id, start_slug, target_slug')
        .eq('type', 'free')
      if (cError) throw cError

      const freeIds = (challenges ?? []).map((c) => c.id)
      if (freeIds.length === 0) return []

      const { data: sessions, error: sError } = await supabase
        .from('game_sessions')
        .select('id, clicks, time_seconds, completed_at, challenge_id')
        .eq('user_id', userId)
        .eq('completed', true)
        .in('challenge_id', freeIds)
        .order('completed_at', { ascending: false })
        .limit(5)
      if (sError) throw sError

      const challengeMap = Object.fromEntries((challenges ?? []).map((c) => [c.id, c]))
      return (sessions ?? []).map((s) => ({
        ...s,
        challenge: challengeMap[s.challenge_id] ?? null,
      }))
    },
    enabled: !!userId,
    staleTime: 0,
  })
}

export default function FreeGameHub() {
  const navigate = useNavigate()
  const { userId } = useUserProgress()
  const { data: personalBest, isLoading: pbLoading } = usePersonalBest({ userId })
  const { data: recentGames, isLoading: recentLoading } = useRecentFreeGames({ userId })
  const startMutation = useFreeGameChallenge()

  const handleStart = () => {
    startMutation.mutate()
  }

  const bestClicks = personalBest?.bestClicks ?? null
  const bestTime = personalBest?.bestTime ?? null

  return (
    <div className="mx-auto max-w-2xl space-y-8 py-4">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-primary">Casual Game</h1>
        <p className="mt-1 text-sm text-slate-500">
          Play as many games as you want. Navigate from a random article to a famous one in as few clicks as possible.
        </p>
      </div>

      {/* Start button */}
      <div className="flex flex-col items-start gap-2">
        <button
          onClick={handleStart}
          disabled={startMutation.isPending}
          className="bg-secondary px-10 py-3 text-base font-extrabold text-white hover:bg-secondary-hover transition-colors shadow-lg disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {startMutation.isPending ? 'Generating…' : 'Start New Game'}
        </button>
        {startMutation.isError && (
          <p className="text-sm text-red-600">
            {startMutation.error?.message ?? 'Failed to generate a game.'}{' '}
            <button onClick={handleStart} className="underline font-medium">Try again</button>
          </p>
        )}
      </div>

      {/* Personal Bests */}
      <section className="space-y-3">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-500">Personal Bests</h2>
        {!userId ? (
          <div className={`${CARD_SURFACE_STATIC} flex flex-col items-center gap-3 p-5 text-center`}>
            <p className="text-sm text-slate-600">Sign in to track your personal bests</p>
            <Link
              to={buildAuthUrl({ returnTo: '/game/free' })}
              className="bg-primary px-5 py-2 text-sm font-semibold text-white hover:bg-primary-hover transition-colors"
            >
              Sign In
            </Link>
          </div>
        ) : pbLoading ? (
          <div className="grid grid-cols-2 gap-3">
            <div className={`${CARD_SURFACE_STATIC} animate-pulse p-4`}>
              <div className="h-3 w-24 rounded bg-slate-200 mb-2" />
              <div className="h-7 w-16 rounded bg-slate-200" />
            </div>
            <div className={`${CARD_SURFACE_STATIC} animate-pulse p-4`}>
              <div className="h-3 w-24 rounded bg-slate-200 mb-2" />
              <div className="h-7 w-16 rounded bg-slate-200" />
            </div>
          </div>
        ) : !bestClicks && !bestTime ? (
          <div className={`${CARD_SURFACE_STATIC} p-5 text-center text-sm text-slate-500`}>
            No games played yet. Start your first game!
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            <div className={`${CARD_SURFACE_STATIC} flex flex-col items-center gap-1 p-4`}>
              <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">Fewest Clicks</span>
              {bestClicks ? (
                <>
                  <span className="text-2xl font-bold text-primary tabular-nums">{bestClicks.clicks}</span>
                  <span className="text-xs text-slate-400">
                    Set {new Date(bestClicks.completed_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </span>
                </>
              ) : (
                <span className="text-sm text-slate-400 mt-1">No record yet</span>
              )}
            </div>
            <div className={`${CARD_SURFACE_STATIC} flex flex-col items-center gap-1 p-4`}>
              <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">Fastest Time</span>
              {bestTime ? (
                <>
                  <span className="text-2xl font-bold text-primary tabular-nums">{formatTime(bestTime.time_seconds)}</span>
                  <span className="text-xs text-slate-400">
                    Set {new Date(bestTime.completed_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </span>
                </>
              ) : (
                <span className="text-sm text-slate-400 mt-1">No record yet</span>
              )}
            </div>
          </div>
        )}
      </section>

      {/* Recent games */}
      {userId && (
        <section className="space-y-3">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-500">Recent Games</h2>
          {recentLoading ? (
            <div className={`${CARD_SURFACE_STATIC} animate-pulse p-4`}>
              <div className="space-y-2">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-4 rounded bg-slate-200" />
                ))}
              </div>
            </div>
          ) : !recentGames?.length ? (
            <div className={`${CARD_SURFACE_STATIC} p-4 text-center text-sm text-slate-400`}>
              No completed games yet.
            </div>
          ) : (
            <div className={`${CARD_SURFACE_STATIC} divide-y divide-slate-100`}>
              {recentGames.map((game) => (
                <div key={game.id} className="flex items-center justify-between gap-4 px-4 py-3 text-sm">
                  <span className="min-w-0 truncate text-slate-700">
                    {game.challenge
                      ? `${game.challenge.start_slug.replaceAll('_', ' ')} → ${game.challenge.target_slug.replaceAll('_', ' ')}`
                      : '—'}
                  </span>
                  <span className="shrink-0 tabular-nums text-slate-500">
                    {game.clicks} clicks · {formatTime(game.time_seconds)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      <div>
        <Link to="/game" className="text-sm text-slate-500 hover:text-slate-700 underline">
          ← Back to Game Hub
        </Link>
      </div>
    </div>
  )
}
