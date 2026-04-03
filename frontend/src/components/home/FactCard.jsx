import { NavLink, useNavigate } from 'react-router-dom'

import { getCurrentLevel } from '../../lib/levels'
import { initialsFromUsername } from '../../lib/profileAvatar'
import { buildAuthUrl } from '../../lib/returnTo'

export default function FactCard({
  fact,
  showScore,
  onVote,
  buttonsLocked,
  isFlipping,
  prefersReducedMotion,
  voteError,
  userId,
  user,
  profile,
  onSoftDelete,
  isRemoving,
}) {
  const navigate = useNavigate()

  const isOwnFact = Boolean(
    userId && fact?.user_id && userId === fact.user_id,
  )
  const snapshotName = fact?.submitter_username?.trim() || ''
  let rawName = snapshotName
  if (!rawName && isOwnFact) {
    rawName =
      profile?.username?.trim() ||
      user?.user_metadata?.username?.trim() ||
      (user?.email ? String(user.email).split('@')[0]?.trim() : '') ||
      ''
  }

  const totalReadForLevel =
    fact?.submitter_total_read != null
      ? fact.submitter_total_read
      : isOwnFact && profile?.total_read != null
        ? profile.total_read
        : 0
  const level = getCurrentLevel(totalReadForLevel)

  let displayHandle = 'Anonymous'
  if (fact?.user_id) {
    displayHandle = rawName
      ? `@${rawName.replace(/^@+/, '')}`
      : '@Anonymous'
  }
  const initials = initialsFromUsername(
    rawName || (fact?.user_id ? 'user' : ''),
  )

  const net = fact?.net_score ?? 0
  let scoreClass = 'text-slate-500'
  if (net > 0) scoreClass = 'text-emerald-700'
  if (net < 0) scoreClass = 'text-rose-700'

  const scoreLabel =
    net > 0 ? `Net score: +${net}` : `Net score: ${net}`

  function requireAuth(fn) {
    if (!userId) {
      navigate(buildAuthUrl({ returnTo: '/' }))
      return
    }
    fn()
  }

  const flipMs = prefersReducedMotion ? 300 : 600
  const outerMotionClass = prefersReducedMotion
    ? `transition-opacity ease-in-out ${isFlipping ? 'opacity-0' : 'opacity-100'}`
    : `transition-transform ease-in-out ${isFlipping ? '[transform:rotateY(180deg)]' : '[transform:rotateY(0deg)]'}`

  return (
    <div className="mx-auto w-full max-w-xl" style={{ perspective: '1000px' }}>
      <div
        className={`relative min-h-[320px] w-full ${outerMotionClass}`}
        style={{
          transformStyle: 'preserve-3d',
          transitionDuration: `${flipMs}ms`,
        }}
      >
        <div
          className="absolute inset-0 flex flex-col border border-slate-200 bg-[#faf6ef] p-5 shadow-sm [backface-visibility:hidden]"
          style={{ backfaceVisibility: 'hidden' }}
        >
          <NavLink
            to={`/wiki/${encodeURIComponent(fact.wiki_slug)}`}
            className="text-2xl font-semibold leading-tight tracking-tight text-primary hover:underline"
          >
            {fact.display_title}
          </NavLink>
          <div className="my-3 h-px bg-slate-200" />
          <blockquote className="flex-1 text-sm leading-relaxed text-slate-600">
            {fact.fact_text}
          </blockquote>
          <div className="my-3 h-px bg-slate-200" />
          <div className="flex items-start gap-3">
            <div
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-amber-200 text-xs font-semibold text-amber-950"
              aria-hidden
            >
              {initials}
            </div>
            <div className="min-w-0">
              <div className="text-sm font-medium text-slate-900">
                {displayHandle}
              </div>
              <div className="text-xs text-slate-600">
                Level {level.level} · {level.name}
              </div>
            </div>
          </div>
          <div className="mt-4 grid grid-cols-3 gap-2">
            <button
              type="button"
              disabled={buttonsLocked}
              onClick={() => requireAuth(() => onVote('up'))}
              className="rounded-none border border-slate-300 bg-white px-2 py-2 text-center text-xs font-medium text-slate-800 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              Wow really?
            </button>
            <button
              type="button"
              disabled={buttonsLocked}
              onClick={() => requireAuth(() => onVote('skip'))}
              className="rounded-none border border-slate-300 bg-white px-2 py-2 text-center text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              Ok…
            </button>
            <button
              type="button"
              disabled={buttonsLocked}
              onClick={() => requireAuth(() => onVote('down'))}
              className="rounded-none border border-slate-300 bg-white px-2 py-2 text-center text-xs font-medium text-slate-800 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              Knew already
            </button>
          </div>
          <div
            className={`mt-3 min-h-[1.5rem] text-center text-sm font-medium transition-opacity duration-300 ease-out ${showScore ? 'opacity-100' : 'opacity-0'} ${scoreClass}`}
          >
            {showScore ? scoreLabel : null}
          </div>
          {voteError ? (
            <div className="mt-2 text-center text-xs text-rose-700">{voteError}</div>
          ) : null}
          {userId && fact.user_id && userId === fact.user_id ? (
            <div className="mt-3 text-center">
              <button
                type="button"
                disabled={isRemoving || buttonsLocked}
                onClick={() => onSoftDelete?.()}
                className="text-[11px] font-medium text-slate-500 underline decoration-slate-400 underline-offset-2 hover:text-slate-800 disabled:opacity-50"
              >
                Remove my fact
              </button>
            </div>
          ) : null}
        </div>

        {!prefersReducedMotion ? (
          <div
            className="absolute inset-0 flex items-center justify-center border border-slate-200 bg-[#f0e6d4] [backface-visibility:hidden]"
            style={{
              backfaceVisibility: 'hidden',
              transform: 'rotateY(180deg)',
            }}
          >
            <div className="text-center text-2xl font-semibold tracking-tight text-primary">
              WikiDaily
            </div>
          </div>
        ) : null}
      </div>
    </div>
  )
}
