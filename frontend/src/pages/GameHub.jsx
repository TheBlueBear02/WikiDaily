import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useGameChallenge } from '../hooks/useGameChallenge'
import { useUserProgress } from '../hooks/useUserProgress'
import { getSupabase } from '../lib/supabaseClient'
import { buildAuthUrl } from '../lib/returnTo'
import { todayUtcYmd } from '../lib/date'
import HeroAside from '../components/home/HeroAside'
import TargetCard from '../components/game/TargetCard'
import GameLeaderboard from '../components/game/GameLeaderboard'

export default function GameHub() {
  const navigate = useNavigate()
  const { data, isLoading: challengeLoading } = useGameChallenge()
  const { userId } = useUserProgress()

  const challenge = data?.challenge ?? null
  const startArticle = data?.startArticle ?? null
  const targetArticle = data?.targetArticle ?? null

  // Check if the signed-in user has already completed today's challenge
  const [alreadyPlayed, setAlreadyPlayed] = useState(null) // null = not checked yet
  const [existingSessionId, setExistingSessionId] = useState(null)

  useEffect(() => {
    if (!userId || !challenge?.id) {
      setAlreadyPlayed(false)
      return
    }
    const supabase = getSupabase()
    supabase
      .from('game_sessions')
      .select('id, clicks, time_seconds')
      .eq('user_id', userId)
      .eq('challenge_id', challenge.id)
      .eq('completed', true)
      .maybeSingle()
      .then(({ data: session }) => {
        if (session) {
          setAlreadyPlayed(true)
          setExistingSessionId(session.id)
        } else {
          setAlreadyPlayed(false)
        }
      })
  }, [userId, challenge?.id])

  const handlePlay = () => {
    if (!userId) {
      navigate(buildAuthUrl({ returnTo: '/game' }))
      return
    }
    navigate('/game/play')
  }

  const isLoading = challengeLoading || (userId && alreadyPlayed === null)

  return (
    <div className="space-y-6">
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-lg font-bold text-primary">Today's Challenge</h1>
          <span className="text-xs text-slate-500">{todayUtcYmd()}</span>
        </div>

        <div className="flex flex-col gap-4 md:flex-row md:items-stretch md:gap-6">
          {/* Left aside — challenge cards + play button */}
          <HeroAside>
            <div className="flex min-h-0 flex-1 flex-col gap-3 bg-slate-50/70">
              {isLoading ? (
                <div className="flex flex-1 flex-col gap-3 p-3 animate-pulse">
                  <div className="h-48 w-full bg-slate-200" />
                  <div className="h-10 w-full bg-slate-200" />
                </div>
              ) : !challenge ? (
                <div className="flex flex-1 items-center justify-center p-6 text-center text-sm text-slate-500">
                  Today's challenge isn't ready yet. Check back soon.
                </div>
              ) : (
                <div className="flex min-h-0 flex-1 flex-col gap-3 p-3">
                  {/* Start → Target cards */}
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-stretch">
                    <div className="flex flex-1 flex-col gap-1">
                      <span className="text-xs font-medium uppercase tracking-wide text-slate-500">
                        Start
                      </span>
                      <TargetCard article={startArticle} size="large" />
                    </div>
                    <div className="flex items-center justify-center text-2xl text-slate-300 font-light sm:py-4">
                      →
                    </div>
                    <div className="flex flex-1 flex-col gap-1">
                      <span className="text-xs font-medium uppercase tracking-wide text-slate-500">
                        Target
                      </span>
                      <TargetCard article={targetArticle} size="large" />
                    </div>
                  </div>

                  {/* CTA */}
                  <div className="pt-1">
                    {alreadyPlayed ? (
                      <div className="flex flex-col gap-2 text-center">
                        <p className="text-sm text-slate-600">You've already played today!</p>
                        <button
                          onClick={() =>
                            navigate('/game/result', {
                              state: { sessionId: existingSessionId, challengeId: challenge.id },
                            })
                          }
                          className="w-full border border-primary px-4 py-2.5 text-sm font-semibold text-primary hover:bg-primary hover:text-white transition-colors"
                        >
                          View Your Result
                        </button>
                      </div>
                    ) : !userId ? (
                      <div className="flex flex-col gap-2 text-center">
                        <p className="text-sm text-slate-600">Sign in to play and track your rank</p>
                        <button
                          onClick={handlePlay}
                          className="w-full bg-primary px-4 py-2.5 text-sm font-semibold text-white hover:bg-primary-hover transition-colors"
                        >
                          Sign In to Play
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={handlePlay}
                        className="w-full bg-primary px-4 py-2.5 text-sm font-semibold text-white hover:bg-primary-hover transition-colors"
                      >
                        Play Today's Game
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          </HeroAside>

          {/* Right column — leaderboard */}
          <div className="flex min-h-0 w-full shrink-0 flex-col gap-3 md:w-[55%]">
            <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
              <GameLeaderboard challengeId={challenge?.id ?? null} />
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
