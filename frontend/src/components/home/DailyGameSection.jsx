import { NavLink } from 'react-router-dom'
import { useGameChallenge } from '../../hooks/useGameChallenge'

export default function DailyGameSection() {
  const { data, isLoading } = useGameChallenge()

  const challenge = data?.challenge ?? null
  const startArticle = data?.startArticle ?? null
  const targetArticle = data?.targetArticle ?? null

  return (
    <section className="flex-1 border border-slate-200 bg-white">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-200 bg-primary px-5 py-3">
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
      </div>

      {/* Images edge-to-edge with title overlaid at top */}
      <div className="relative flex">
        {isLoading ? (
          <>
            <div className="h-72 flex-1 animate-pulse bg-slate-200" />
            <div className="h-72 flex-1 animate-pulse bg-slate-100" />
          </>
        ) : challenge ? (
          <>
            {/* Top gradient — decorative only */}
            <div className="pointer-events-none absolute top-0 left-0 right-0 z-10 h-28 bg-gradient-to-b from-black/80 to-transparent" />
            {/* Big sentence overlaid at top */}
            <div className="absolute top-0 left-0 right-0 z-20 px-4 py-4">
              <p className="text-2xl font-black leading-snug text-white drop-shadow-lg">
                How fast can you get from{' '}
                <span className="text-white underline decoration-secondary decoration-[3px] underline-offset-4">{startArticle?.display_title}</span>
                {' '}to{' '}
                <span className="text-white underline decoration-secondary decoration-[3px] underline-offset-4">{targetArticle?.display_title}</span>?
              </p>
            </div>
            <div className="relative flex-1 overflow-hidden">
              <img src={startArticle?.image_url} alt="" className="h-72 w-full object-cover" />
              <div className="absolute inset-0 flex items-end bg-gradient-to-t from-black/60 to-transparent p-3">
                <span className="text-sm font-semibold text-white drop-shadow">{startArticle?.display_title}</span>
              </div>
              <div className="pointer-events-none absolute bottom-12 start-0 flex items-center gap-2 bg-primary px-5 py-2 text-base font-bold text-white" aria-hidden>
                Start
              </div>
            </div>
            <div className="relative flex-1 overflow-hidden">
              <img src={targetArticle?.image_url} alt="" className="h-72 w-full object-cover" />
              <div className="absolute inset-0 flex items-end justify-end bg-gradient-to-t from-black/60 to-transparent p-3">
                <span className="text-sm font-semibold text-white drop-shadow">{targetArticle?.display_title}</span>
              </div>
              <div className="pointer-events-none absolute bottom-12 end-0 flex items-center gap-2 bg-primary px-5 py-2 text-base font-bold text-white" aria-hidden>
                Target
              </div>
            </div>

            {/* CTA overlaid at the bottom of the images */}
            <div className="absolute bottom-0 left-0 right-0 flex justify-center pb-5 z-20">
              <NavLink
                to="/game"
                className="bg-secondary px-10 py-3 text-center text-base font-extrabold text-white hover:bg-secondary-hover transition-colors shadow-lg"
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
