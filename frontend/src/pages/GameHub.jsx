import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useGameChallenge } from '../hooks/useGameChallenge'
import { usePersonalBest } from '../hooks/usePersonalBest'
import { useUserProgress } from '../hooks/useUserProgress'
import { useDailyResetCountdown } from '../hooks/useDailyResetCountdown'
import { getSupabase } from '../lib/supabaseClient'
import { formatTime } from '../lib/formatTime'
import HeroAside from '../components/home/HeroAside'
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

function FreePlayCard({ userId, navigate }) {
  const { data: personalBest, isLoading: pbLoading } = usePersonalBest({ userId })
  const bestClicks = personalBest?.bestClicks ?? null
  const bestTime = personalBest?.bestTime ?? null

  return (
    <div className="flex flex-col border border-slate-200 bg-white">
      <div className="flex items-center justify-between border-b border-slate-200 bg-slate-800 px-5 py-3">
        <div className="flex items-center gap-2.5">
          <span className="text-sm font-bold uppercase tracking-wide text-white">Free Play</span>
        </div>
        <span className="text-xs text-white/60">Unlimited rounds</span>
      </div>
      <div className="flex flex-col gap-4 p-5">
        <p className="text-sm text-slate-600">
          Navigate from a random article to a famous one in as few clicks as possible. Play as many times as you want and beat your personal best.
        </p>
        {userId && (
          <div className="flex gap-3">
            {pbLoading ? (
              <>
                <div className="flex-1 animate-pulse rounded border border-slate-100 bg-slate-50 p-3">
                  <div className="h-3 w-16 rounded bg-slate-200 mb-1" />
                  <div className="h-5 w-10 rounded bg-slate-200" />
                </div>
                <div className="flex-1 animate-pulse rounded border border-slate-100 bg-slate-50 p-3">
                  <div className="h-3 w-16 rounded bg-slate-200 mb-1" />
                  <div className="h-5 w-10 rounded bg-slate-200" />
                </div>
              </>
            ) : bestClicks || bestTime ? (
              <>
                <div className="flex-1 rounded border border-slate-100 bg-slate-50 p-3">
                  <div className="text-xs text-slate-400">Fewest clicks</div>
                  <div className="text-lg font-bold text-primary tabular-nums">
                    {bestClicks ? bestClicks.clicks : '—'}
                  </div>
                </div>
                <div className="flex-1 rounded border border-slate-100 bg-slate-50 p-3">
                  <div className="text-xs text-slate-400">Fastest time</div>
                  <div className="text-lg font-bold text-primary tabular-nums">
                    {bestTime ? formatTime(bestTime.time_seconds) : '—'}
                  </div>
                </div>
              </>
            ) : null}
          </div>
        )}
        <button
          onClick={() => navigate('/game/free')}
          className="self-start border border-slate-700 bg-slate-800 px-6 py-2.5 text-sm font-semibold text-white hover:bg-slate-700 transition-colors"
        >
          Start Free Game →
        </button>
      </div>
    </div>
  )
}

export default function GameHub() {
  const navigate = useNavigate()
  const { data, isLoading: challengeLoading } = useGameChallenge()
  const { userId } = useUserProgress()
  const dailyCountdown = useDailyResetCountdown()
  const countdownLabel = (() => {
    const { hours, minutes, seconds } = dailyCountdown
    const hh = String(hours).padStart(2, '0')
    const mm = String(minutes).padStart(2, '0')
    const ss = String(seconds).padStart(2, '0')
    return `${hh}:${mm}:${ss}`
  })()

  const challenge = data?.challenge ?? null
  const startArticle = data?.startArticle ?? null
  const targetArticle = data?.targetArticle ?? null

  // Check if the signed-in user has already completed today's challenge
  const [alreadyPlayed, setAlreadyPlayed] = useState(null) // null = not checked yet
  const [existingSession, setExistingSession] = useState(null)

  useEffect(() => {
    if (!userId || !challenge?.id) {
      setAlreadyPlayed(false)
      return
    }
    const supabase = getSupabase()
    supabase
      .from('game_sessions')
      .select('id, clicks, time_seconds, path')
      .eq('user_id', userId)
      .eq('challenge_id', challenge.id)
      .eq('completed', true)
      .maybeSingle()
      .then(({ data: session }) => {
        if (session) {
          setAlreadyPlayed(true)
          setExistingSession(session)
        } else {
          setAlreadyPlayed(false)
        }
      })
  }, [userId, challenge?.id])

  const handlePlay = () => {
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
        {/* Images edge-to-edge with CTA overlaid at bottom */}
        <div className="relative flex flex-1 min-h-[30rem]">
          {/* Top gradient — decorative only */}
          <div className="pointer-events-none absolute top-0 left-0 right-0 z-10 h-52 bg-gradient-to-b from-black/90 to-transparent" />
          {/* Header + big sentence overlaid at top */}
          <div className="absolute top-0 left-0 right-0 z-20 px-5 py-5">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2.5">
                <span className="shrink-0 text-white" aria-hidden>
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="block">
                    <path d="M2 12.5C2 9.46 4.46 7 7.5 7h9C19.54 7 22 9.46 22 12.5c0 2.76-1.5 6.5-4 6.5-1 0-1.5-.5-2.5-1.5h-3C11.5 18.5 11 19 10 19c-2.5 0-4-3.74-4-6.5z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M8 10.5v3M6.5 12h3" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                    <circle cx="16" cy="11" r="1" fill="currentColor"/>
                    <circle cx="18" cy="13" r="1" fill="currentColor"/>
                  </svg>
                </span>
                <span className="text-sm font-bold uppercase tracking-wide text-white">
                  Daily Challenge
                </span>
                <span className="relative flex h-2.5 w-2.5 shrink-0">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-white opacity-60 [animation-duration:1.5s]" />
                  <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-white" />
                </span>
              </div>
              <span className="text-xs tabular-nums text-white/70">New in: {countdownLabel}</span>
            </div>
            <p className="text-4xl font-black leading-snug text-white drop-shadow-lg">
              How fast can you get from{' '}
              <span className="text-white underline decoration-secondary decoration-[3px] underline-offset-4">{startArticle?.display_title}</span>
              {' '}to{' '}
              <span className="text-white underline decoration-secondary decoration-[3px] underline-offset-4">{targetArticle?.display_title}</span>?
            </p>
          </div>
          <div className="flex-1 relative overflow-hidden">
            <img src={startArticle?.image_url} alt="" className="h-full w-full object-cover" />
            <div className="absolute inset-0 flex items-end bg-gradient-to-t from-black/60 to-transparent p-3">
              <span className="text-sm font-semibold text-white drop-shadow">{startArticle?.display_title}</span>
            </div>
            <div className="pointer-events-none absolute bottom-16 start-0 z-20 flex items-center bg-primary px-5 py-2 text-base font-bold text-white" aria-hidden>
              Start
            </div>
          </div>
          <div className="flex-1 relative overflow-hidden">
            <img src={targetArticle?.image_url} alt="" className="h-full w-full object-cover" />
            <div className="absolute inset-0 flex items-end justify-end bg-gradient-to-t from-black/60 to-transparent p-3">
              <span className="text-sm font-semibold text-white drop-shadow">{targetArticle?.display_title}</span>
            </div>
            <div className="pointer-events-none absolute bottom-16 end-0 z-20 flex items-center bg-primary px-5 py-2 text-base font-bold text-white" aria-hidden>
              Target
            </div>
          </div>

          {/* CTA overlaid at the bottom of the images */}
          <div className="absolute bottom-0 left-0 right-0 flex justify-center pb-5">
            {alreadyPlayed ? (
              <div className="flex flex-col items-center gap-2 text-center">
                <p className="text-sm font-semibold text-white drop-shadow">You've already played today!</p>
                <button
                  onClick={() =>
                    navigate('/game/result', {
                      state: {
                        sessionId: existingSession.id,
                        clicks: existingSession.clicks,
                        timeSeconds: existingSession.time_seconds,
                        path: existingSession.path,
                        challengeId: challenge.id,
                      },
                    })
                  }
                  className="bg-white/20 backdrop-blur-sm border border-white/50 px-8 py-2.5 text-sm font-semibold text-white hover:bg-white/30 transition-colors"
                >
                  View Your Result
                </button>
              </div>
            ) : (
              <button
                onClick={handlePlay}
                className="bg-secondary px-10 py-3 text-center text-base font-extrabold text-white hover:bg-secondary-hover transition-colors shadow-lg"
              >
                Play Now
              </button>
            )}
          </div>
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

          {/* Right column (70%) — daily game card + free play card */}
          <div className="flex min-h-0 w-full shrink-0 flex-col gap-3 md:w-[70%]">
            <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
              {dailyGameSlot}
            </div>
            <FreePlayCard userId={userId} navigate={navigate} />
          </div>
        </div>
      </section>
    </div>
  )
}
