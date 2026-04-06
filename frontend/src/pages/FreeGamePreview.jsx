import { useEffect } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { CARD_SURFACE_STATIC } from '../lib/cardSurface'

export default function FreeGamePreview() {
  const navigate = useNavigate()
  const { state } = useLocation()

  // If someone lands here directly without state, bounce them back
  useEffect(() => {
    if (!state?.challengeId) {
      navigate('/game/free', { replace: true })
    }
  }, [state, navigate])

  if (!state?.challengeId) return null

  const { challengeId, startArticle, targetArticle } = state

  const handleStart = () => {
    navigate('/game/free/play', { state: { challengeId, startArticle, targetArticle } })
  }

  return (
    <div className="mx-auto max-w-2xl space-y-8 py-4">
      <div>
        <h1 className="text-2xl font-bold text-primary">Your Challenge</h1>
        <p className="mt-1 text-sm text-slate-500">
          Navigate from the start article to the target in as few clicks as possible.
        </p>
      </div>

      <div className="flex flex-col gap-4 sm:flex-row">
        {/* Start article */}
        <div className={`${CARD_SURFACE_STATIC} flex flex-1 flex-col overflow-hidden`}>
          <div className="shrink-0 border-b border-slate-200 bg-slate-800 px-4 py-2">
            <span className="text-xs font-bold uppercase tracking-wide text-white/80">Start</span>
          </div>
          {startArticle.image_url && (
            <div className="relative h-40 w-full overflow-hidden bg-slate-100">
              <img
                src={startArticle.image_url}
                alt=""
                className="h-full w-full object-cover"
              />
            </div>
          )}
          <div className="flex flex-col gap-1 p-4">
            <span className="text-base font-bold text-slate-800">{startArticle.display_title}</span>
            {startArticle.description && (
              <p className="line-clamp-3 text-xs leading-relaxed text-slate-500">
                {startArticle.description}
              </p>
            )}
          </div>
        </div>

        {/* Arrow */}
        <div className="flex items-center justify-center text-2xl font-bold text-slate-300 sm:flex-col">
          <span className="hidden sm:block">↓</span>
          <span className="sm:hidden">→</span>
        </div>

        {/* Target article */}
        <div className={`${CARD_SURFACE_STATIC} flex flex-1 flex-col overflow-hidden`}>
          <div className="shrink-0 border-b border-slate-200 bg-primary px-4 py-2">
            <span className="text-xs font-bold uppercase tracking-wide text-white/80">Target</span>
          </div>
          {targetArticle.image_url && (
            <div className="relative h-40 w-full overflow-hidden bg-slate-100">
              <img
                src={targetArticle.image_url}
                alt=""
                className="h-full w-full object-cover"
              />
            </div>
          )}
          <div className="flex flex-col gap-1 p-4">
            <span className="text-base font-bold text-slate-800">{targetArticle.display_title}</span>
            {targetArticle.description && (
              <p className="line-clamp-3 text-xs leading-relaxed text-slate-500">
                {targetArticle.description}
              </p>
            )}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <button
          onClick={handleStart}
          className="bg-secondary px-10 py-3 text-base font-extrabold text-white hover:bg-secondary-hover transition-colors shadow-lg"
        >
          Start Game
        </button>
        <Link to="/game/free" className="text-sm text-slate-500 hover:text-slate-700 underline">
          Pick a different game
        </Link>
      </div>
    </div>
  )
}
