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

      <div className="flex flex-col gap-4 p-5">
        {/* Big sentence */}
        {!isLoading && challenge && (
          <p className="text-xl font-bold leading-snug text-slate-800">
            How fast can you get from{' '}
            <span className="text-secondary">{startArticle?.display_title}</span>
            {' '}to{' '}
            <span className="text-secondary">{targetArticle?.display_title}</span>?
          </p>
        )}
        {isLoading && (
          <div className="h-7 w-2/3 animate-pulse rounded bg-slate-200" />
        )}

      </div>

      {/* Images edge-to-edge */}
      <div className="flex">
        {isLoading ? (
          <>
            <div className="h-56 flex-1 animate-pulse bg-slate-200" />
            <div className="h-56 flex-1 animate-pulse bg-slate-100" />
          </>
        ) : challenge ? (
          <>
            <div className="relative flex-1 overflow-hidden">
              <img src={startArticle?.image_url} alt="" className="h-56 w-full object-cover" />
              <div className="absolute inset-0 flex items-end bg-gradient-to-t from-black/50 to-transparent p-2">
                <span className="text-xs font-semibold text-white drop-shadow">{startArticle?.display_title}</span>
              </div>
              <div className="pointer-events-none absolute bottom-7 start-0 flex items-center gap-2 bg-primary px-3 py-1 text-xs font-bold text-white" aria-hidden>
                Start
              </div>
            </div>
            <div className="relative flex-1 overflow-hidden">
              <img src={targetArticle?.image_url} alt="" className="h-56 w-full object-cover" />
              <div className="absolute inset-0 flex items-end justify-end bg-gradient-to-t from-black/50 to-transparent p-2">
                <span className="text-xs font-semibold text-white drop-shadow">{targetArticle?.display_title}</span>
              </div>
              <div className="pointer-events-none absolute bottom-7 end-0 flex items-center gap-2 bg-primary px-3 py-1 text-xs font-bold text-white" aria-hidden>
                Target
              </div>
            </div>
          </>
        ) : null}
      </div>

      {/* CTA */}
      {!isLoading && challenge && (
        <div className="border-t border-slate-200">
          <NavLink
            to="/game"
            className="block w-full bg-primary px-4 py-3 text-center text-sm font-semibold text-white hover:bg-primary-hover transition-colors"
          >
            Play Now →
          </NavLink>
        </div>
      )}
    </section>
  )
}
