import { NavLink } from 'react-router-dom'
import { useGameChallenge } from '../../hooks/useGameChallenge'
import { useDailyResetCountdown } from '../../hooks/useDailyResetCountdown'

export default function DailyGameSection() {
  const { data, isLoading } = useGameChallenge()

  const challenge = data?.challenge ?? null
  const startArticle = data?.startArticle ?? null
  const targetArticle = data?.targetArticle ?? null

  const { hours, minutes, seconds } = useDailyResetCountdown()
  const countdownLabel = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`

  return (
    <section className="flex-1 border border-slate-200 bg-white">
      {/* Images edge-to-edge with header + title overlaid at top */}
      <div className="relative flex flex-col md:flex-row">
        {isLoading ? (
          <>
            <div className="h-56 flex-1 animate-pulse bg-slate-200 sm:h-64 md:h-72" />
            <div className="h-56 flex-1 animate-pulse bg-slate-100 sm:h-64 md:h-72" />
          </>
        ) : challenge ? (
          <>
            {/* Top gradient — decorative only */}
            <div className="pointer-events-none absolute top-0 left-0 right-0 z-10 h-44 bg-gradient-to-b from-black/90 to-transparent" />
            {/* Header + big sentence overlaid at top */}
            <div className="absolute top-0 left-0 right-0 z-20 px-4 py-4">
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
                  <span className="text-sm font-bold uppercase tracking-wide text-white">Daily Challenge</span>
                  <span className="relative flex h-2.5 w-2.5 shrink-0">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-white opacity-60 [animation-duration:1.5s]" />
                    <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-white" />
                  </span>
                </div>
                <span className="text-xs tabular-nums text-white/70">New in: {countdownLabel}</span>
              </div>
              <p className="text-lg font-black leading-snug text-white drop-shadow-lg sm:text-2xl">
                How fast can you get from{' '}
                <span className="text-white underline decoration-secondary decoration-[3px] underline-offset-4">{startArticle?.display_title}</span>
                {' '}to{' '}
                <span className="text-white underline decoration-secondary decoration-[3px] underline-offset-4">{targetArticle?.display_title}</span>?
              </p>
            </div>

            <div className="relative flex-1 overflow-hidden">
              <img src={startArticle?.image_url} alt="" className="h-56 w-full object-cover sm:h-64 md:h-72" />
              <div className="absolute inset-0 flex items-end bg-gradient-to-t from-black/60 to-transparent p-3">
                <span className="text-sm font-semibold text-white drop-shadow">{startArticle?.display_title}</span>
              </div>
              <div className="pointer-events-none absolute bottom-12 start-0 flex items-center gap-2 bg-primary px-5 py-2 text-base font-bold text-white" aria-hidden>
                Start
              </div>
            </div>
            <div className="relative flex-1 overflow-hidden">
              <img src={targetArticle?.image_url} alt="" className="h-56 w-full object-cover sm:h-64 md:h-72" />
              <div className="absolute inset-0 flex items-end justify-end bg-gradient-to-t from-black/60 to-transparent p-3">
                <span className="text-sm font-semibold text-white drop-shadow">{targetArticle?.display_title}</span>
              </div>
              <div className="pointer-events-none absolute bottom-12 end-0 flex items-center gap-2 bg-primary px-5 py-2 text-base font-bold text-white" aria-hidden>
                Target
              </div>
            </div>

            {/* CTA overlaid at the bottom of the images */}
            <div className="absolute bottom-0 left-0 right-0 z-20 flex justify-center px-4 pb-5">
              <NavLink
                to="/game"
                className="min-h-[44px] w-full bg-secondary px-6 py-3 text-center text-base font-extrabold text-white hover:bg-secondary-hover transition-colors shadow-lg sm:w-auto sm:px-10"
              >
                Play Now
              </NavLink>
            </div>
          </>
        ) : null}
      </div>
    </section>
  )
}
