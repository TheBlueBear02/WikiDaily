import { useCallback, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { NavLink, useNavigate } from 'react-router-dom'

import { getCurrentLevel } from '../../lib/levels'
import { initialsFromUsername } from '../../lib/profileAvatar'
import { buildAuthUrl } from '../../lib/returnTo'
import ProfileTooltip from '../shared/ProfileTooltip'

const FACT_SUBMITTER_TIP_HIDE_MS = 180

function useFactSubmitterTooltip() {
  const [tooltip, setTooltip] = useState(null)
  const hideTimerRef = useRef(null)

  const clearHideTimer = useCallback(() => {
    if (hideTimerRef.current != null) {
      clearTimeout(hideTimerRef.current)
      hideTimerRef.current = null
    }
  }, [])

  const scheduleHide = useCallback(() => {
    clearHideTimer()
    hideTimerRef.current = window.setTimeout(() => {
      hideTimerRef.current = null
      setTooltip(null)
    }, FACT_SUBMITTER_TIP_HIDE_MS)
  }, [clearHideTimer])

  const showForSubmitter = useCallback(
    (el) => {
      if (!el) return
      clearHideTimer()
      setTooltip({ rect: el.getBoundingClientRect() })
    },
    [clearHideTimer],
  )

  useEffect(() => () => clearHideTimer(), [clearHideTimer])

  const dismiss = useCallback(() => {
    clearHideTimer()
    setTooltip(null)
  }, [clearHideTimer])

  return { tooltip, showForSubmitter, scheduleHide, dismiss }
}

/** Solid Reddit-style block arrow: triangular head + rectangular stem (sharp corners). */
function RedditStyleUpArrow({ className }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 28"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <path
        fill="none"
        stroke="#dc143c"
        strokeWidth="2"
        d="M12 2 22 14 16 14 16 26 8 26 8 14 2 14 Z"
      />
    </svg>
  )
}

function RedditStyleDownArrow({ className }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 28"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <path
        fill="none"
        stroke="#1E2952"
        strokeWidth="2"
        d="M12 26 2 14 8 14 8 2 16 2 16 14 22 14 Z"
      />
    </svg>
  )
}

export default function FactCard({
  fact,
  onVote,
  buttonsLocked,
  voteError,
  userId,
  user,
  profile,
  existingVote,
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

  const submitterStreak =
    fact?.submitter_current_streak != null
      ? fact.submitter_current_streak
      : isOwnFact && profile?.current_streak != null
        ? profile.current_streak
        : null
  const submitterFactsCount =
    fact?.submitter_facts_count != null
      ? fact.submitter_facts_count
      : null
  const submitterAvatarUrl =
    fact?.submitter_avatar_url != null
      ? fact.submitter_avatar_url
      : isOwnFact
        ? (user?.user_metadata?.avatar_url ?? user?.user_metadata?.picture ?? null)
        : null

  let displayHandle = 'Anonymous'
  if (fact?.user_id) {
    displayHandle = rawName ? rawName.replace(/^@+/, '') : 'Anonymous'
  }
  const initials = initialsFromUsername(
    rawName || (fact?.user_id ? 'user' : ''),
  )

  const { tooltip, showForSubmitter, scheduleHide, dismiss } =
    useFactSubmitterTooltip()

  useEffect(() => {
    dismiss()
  }, [fact?.id, dismiss])
  const submitterTooltipId =
    fact?.user_id != null
      ? `fact-submitter-tip-${fact.user_id}`
      : 'fact-submitter-tip'

  function requireAuth(fn) {
    if (!userId) {
      navigate(buildAuthUrl({ returnTo: '/' }))
      return
    }
    fn()
  }

  const wikiArticleState = {
    displayTitle: fact.display_title,
    source: 'link',
    highlightFactText: fact.fact_text,
  }

  return (
    <>
    <div className="flex w-full min-w-0 flex-col">
      <div className="flex min-h-[240px] min-w-0 flex-col border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex min-h-0 flex-1 flex-col">
          <div className="flex min-h-0 flex-1 gap-3">
            <blockquote className="min-h-0 flex-1 overflow-y-auto text-base leading-relaxed text-black">
              {fact.fact_text}{' '}
              <NavLink
                to={`/wiki/${encodeURIComponent(fact.wiki_slug)}`}
                state={wikiArticleState}
                className="whitespace-nowrap font-medium text-primary hover:underline"
              >
                source &raquo;
              </NavLink>
            </blockquote>
            {fact.image_url ? (
              <img
                src={fact.image_url}
                alt=""
                aria-hidden
                className="w-32 shrink-0 self-stretch rounded-sm object-contain"
              />
            ) : null}
          </div>
          <div className="mt-2 flex shrink-0 flex-col gap-2">
            <div className="flex items-end justify-between gap-3 text-[11px] font-medium text-slate-500">
              <span>Submitted by:</span>
              <span className="text-right">Source article:</span>
            </div>
            <div className="h-px bg-slate-200" />
            <div className="flex items-start gap-3">
              <div
                className={
                  fact?.user_id
                    ? 'flex min-w-0 flex-1 cursor-default items-start gap-3'
                    : 'flex min-w-0 flex-1 items-start gap-3'
                }
                onMouseEnter={
                  fact?.user_id
                    ? (e) => showForSubmitter(e.currentTarget)
                    : undefined
                }
                onMouseLeave={fact?.user_id ? scheduleHide : undefined}
                aria-describedby={
                  fact?.user_id && tooltip ? submitterTooltipId : undefined
                }
              >
                {submitterAvatarUrl ? (
                  <img
                    src={submitterAvatarUrl}
                    alt=""
                    aria-hidden
                    className="h-10 w-10 shrink-0 rounded-full object-cover"
                  />
                ) : (
                  <div
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-amber-200 text-xs font-semibold text-amber-950"
                    aria-hidden
                  >
                    {initials}
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium text-slate-900">
                    {displayHandle}
                  </div>
                  <div className="text-xs text-slate-600">
                    Level {level.level} · {level.name}
                  </div>
                </div>
              </div>
              <NavLink
                to={`/wiki/${encodeURIComponent(fact.wiki_slug)}`}
                state={wikiArticleState}
                onClick={(e) => e.stopPropagation()}
                className="min-w-0 flex-1 text-right text-sm font-semibold leading-snug tracking-tight text-primary hover:underline sm:text-base"
              >
                {fact.display_title}
              </NavLink>
            </div>
          </div>
        </div>
      </div>
      <div
        className="flex shrink-0 flex-row -mt-px"
        role="group"
        aria-label="Fact reactions"
      >
        <button
          type="button"
          disabled={buttonsLocked}
          onClick={() => requireAuth(() => onVote('up'))}
          className={`flex flex-1 flex-row items-center justify-center gap-2 rounded-none border px-3 py-2 text-sm font-medium leading-tight text-slate-800 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60 ${
            existingVote === 'up'
              ? 'border-orange-400 bg-orange-50'
              : 'border-slate-300 bg-white'
          }`}
        >
          <RedditStyleUpArrow className="h-7 w-6 shrink-0" />
          <span className="min-w-0">Wow really?</span>
        </button>
        <button
          type="button"
          disabled={buttonsLocked}
          onClick={() => requireAuth(() => onVote('skip'))}
          className="flex shrink-0 flex-row items-center justify-center rounded-none border border-slate-300 bg-white px-4 py-2 text-center text-sm font-medium leading-tight text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60 -ml-px"
        >
          Ok…
        </button>
        <button
          type="button"
          disabled={buttonsLocked}
          onClick={() => requireAuth(() => onVote('down'))}
          className={`flex flex-1 flex-row items-center justify-center gap-2 rounded-none border px-3 py-2 text-sm font-medium leading-tight text-slate-800 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60 -ml-px ${
            existingVote === 'down'
              ? 'border-indigo-400 bg-indigo-50'
              : 'border-slate-300 bg-white'
          }`}
        >
          <RedditStyleDownArrow className="h-7 w-6 shrink-0" />
          <span className="min-w-0">Knew already</span>
        </button>
      </div>
      {voteError ? (
        <div className="mt-2 text-center text-xs text-rose-700">
          {voteError}
        </div>
      ) : null}
    </div>
    {typeof document !== 'undefined' &&
      fact?.user_id &&
      tooltip &&
      createPortal(
        <ProfileTooltip
          displayName={displayHandle}
          totalRead={totalReadForLevel}
          avatarInitials={initials}
          avatarUrl={submitterAvatarUrl}
          currentStreak={submitterStreak}
          factsCount={submitterFactsCount}
          rect={tooltip.rect}
          tooltipId={submitterTooltipId}
        />,
        document.body,
      )}
    </>
  )
}
