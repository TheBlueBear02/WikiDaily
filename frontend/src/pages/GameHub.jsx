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

function GameAchievementsSection() {
  return (
    <div className="flex flex-col border border-dashed border-slate-200 bg-slate-50/70 px-3 py-4 text-center">
      <div className="text-sm font-medium text-slate-700">Achievements</div>
      <div className="mt-0.5 text-xs leading-relaxed text-slate-500">
        Complete challenges to unlock game achievements.
      </div>
    </div>
  )
}

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

  // Daily game card — right column (70%), matches home hero article card slot
  let dailyGameSlot = null
  if (isLoading) {
    dailyGameSlot = (
      <div className="flex h-full min-h-0 flex-col border border-slate-200 bg-slate-50 p-5 animate-pulse">
        <div className="h-4 w-48 rounded bg-slate-200" />
        <div className="mt-3 space-y-2">
          <div className="h-3 w-full rounded bg-slate-200" />
          <div className="h-3 w-5/6 rounded bg-slate-200" />
        </div>
      </div>
    )
  } else if (!challenge) {
    dailyGameSlot = (
      <div className="flex h-full min-h-0 flex-col items-center justify-center border border-slate-200 bg-slate-50 p-6 text-center text-sm text-slate-500">
        Today's challenge isn't ready yet. Check back soon.
      </div>
    )
  } else {
    dailyGameSlot = (
      <div className="flex h-full min-h-0 flex-col border border-slate-200 bg-white">
        {/* Header */}
        <div className="shrink-0 border-b border-slate-200 bg-primary px-5 py-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold uppercase tracking-wide text-white">
              Today's Challenge
            </h2>
            <span className="text-xs text-white/70">{todayUtcYmd()}</span>
          </div>
        </div>

        {/* Start → Target */}
        <div className="flex min-h-0 flex-1 flex-col gap-4 p-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-stretch">
            <div className="flex flex-1 flex-col gap-1.5">
              <span className="text-xs font-medium uppercase tracking-wide text-slate-500">
                Start
              </span>
              <TargetCard article={startArticle} size="large" />
            </div>
            <div className="flex items-center justify-center text-2xl text-slate-300 font-light sm:py-4">
              →
            </div>
            <div className="flex flex-1 flex-col gap-1.5">
              <span className="text-xs font-medium uppercase tracking-wide text-slate-500">
                Target
              </span>
              <TargetCard article={targetArticle} size="large" />
            </div>
          </div>

          <p className="text-sm text-slate-500 leading-relaxed">
            Navigate from the <strong className="text-slate-700">start</strong> article to the{' '}
            <strong className="text-slate-700">target</strong> article using only Wikipedia links.
            Reach it in as few clicks as possible!
          </p>
        </div>

        {/* CTA */}
        <div className="shrink-0 border-t border-slate-200 p-4">
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
    )
  }

  return (
    <div className="space-y-6">
      <section className="space-y-4">
        <div className="flex flex-col gap-4 md:flex-row md:items-stretch md:gap-6">
          {/* Left aside — achievements (empty) + game leaderboard, mirrors home hero aside */}
          <HeroAside>
            <div className="flex min-h-0 flex-1 flex-col gap-3 bg-slate-50/70">
              <div className="shrink-0 border border-slate-200 bg-white">
                <GameAchievementsSection />
              </div>
              <div className="min-h-0 flex-1 overflow-hidden border border-slate-200 bg-white">
                <GameLeaderboard challengeId={challenge?.id ?? null} />
              </div>
            </div>
          </HeroAside>

          {/* Right column (70%) — daily game card, mirrors home hero article slot */}
          <div className="flex min-h-0 w-full shrink-0 flex-col gap-3 md:w-[70%]">
            <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
              {dailyGameSlot}
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
