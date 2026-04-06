import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { navigateToRandomWikiArticle } from '../../lib/navigateToRandomWikiArticle'
import { cardInteractiveSurfaceClasses } from '../../lib/cardSurface'

export default function RandomWikiPickerCard() {
  const navigate = useNavigate()
  const [isLoading, setIsLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState(null)

  async function handleClick() {
    if (isLoading) return
    setIsLoading(true)
    setErrorMessage(null)

    try {
      await navigateToRandomWikiArticle(navigate)
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Failed to load random page'
      setErrorMessage(message)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={isLoading}
      className={[
        'flex w-full flex-1 flex-col items-center justify-center px-6 py-4 text-center',
        cardInteractiveSurfaceClasses(),
        'disabled:cursor-not-allowed disabled:opacity-70 disabled:hover:translate-y-0 disabled:hover:shadow-sm',
        'disabled:hover:bg-slate-50',
      ].join(' ')}
    >
      <img
        src="/images/random-cube-noBG.png"
        alt="Random article dice"
          className="mb-3 h-28 w-28 flex-shrink-0"
      />
      <div className="text-base font-semibold text-primary">READ A RANDOM ARTICLE</div>
      <div className="mt-2 text-sm text-slate-600">
        {isLoading ? 'Picking a random article...' : null}
        {!isLoading && !errorMessage
          ? 'Draw random wiki page to Increase your general knowledge and curiosity'
          : null}
        {errorMessage ? <span className="text-rose-700">Error: {errorMessage}</span> : null}
      </div>
      {errorMessage ? (
        <div className="mt-2 text-xs font-medium text-rose-800">Try again</div>
      ) : null}
    </button>
  )
}

