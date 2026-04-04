import { useCallback, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { NavLink, useNavigate } from 'react-router-dom'

import { getCurrentLevel, getNextLevel } from '../../lib/levels'
import { initialsFromUsername } from '../../lib/profileAvatar'
import { buildAuthUrl } from '../../lib/returnTo'

const FACT_SUBMITTER_TIP_HIDE_MS = 180
const FACT_SUBMITTER_TIP_HALF_W = 150

function formatArticlesReadCount(n) {
  const x = Number(n) || 0
  return x === 1 ? '1 article read' : `${x} articles read`
}

/** Matches `StreakLeaderboard` user card styling (no streak row). */
function FactSubmitterTooltip({
  displayName,
  totalRead,
  avatarInitials,
  rect,
  tooltipId,
}) {
  const level = getCurrentLevel(totalRead)
  const next = getNextLevel(totalRead)

  const centerX = rect.left + rect.width / 2
  const clampedLeft = Math.min(
    window.innerWidth - FACT_SUBMITTER_TIP_HALF_W - 12,
    Math.max(FACT_SUBMITTER_TIP_HALF_W + 12, centerX),
  )
  const placeAbove = rect.top > 150
  const top = placeAbove ? rect.top : rect.bottom + 6
  const transform = placeAbove ? 'translate(-50%, -100%)' : 'translate(-50%, 0)'

  return (
    <div
      id={tooltipId}
      role="tooltip"
      className="pointer-events-none fixed z-[100] w-[min(18rem,calc(100vw-1.5rem))] rounded-none border border-slate-200 bg-white p-3.5 shadow-lg ring-1 ring-slate-900/5"
      style={{ left: clampedLeft, top, transform }}
    >
      <div className="flex gap-3">
        <div
          className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-amber-100 text-sm font-semibold text-amber-950 ring-1 ring-amber-200/80"
          aria-hidden
        >
          {avatarInitials}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-primary">{displayName}</p>
          <p className="mt-0.5 text-xs text-slate-600">{`Level ${level.level} · ${level.name}`}</p>
        </div>
      </div>

      <dl className="mt-3 space-y-2 border-t border-slate-100 pt-3 text-xs">
        <div className="flex items-baseline justify-between gap-3">
          <dt className="font-medium text-slate-500">Total reads</dt>
          <dd className="tabular-nums font-semibold text-slate-800">{totalRead}</dd>
        </div>
      </dl>

      {next ? (
        <p className="mt-2.5 border-t border-slate-100 pt-2.5 text-[11px] leading-snug text-slate-500">
          {`${formatArticlesReadCount(totalRead)} · Next: Level ${next.level} (${next.name}) at ${next.threshold.toLocaleString()} reads`}
        </p>
      ) : (
        <p className="mt-2.5 border-t border-slate-100 pt-2.5 text-[11px] leading-snug text-slate-500">
          {`${formatArticlesReadCount(totalRead)} · Max reader level`}
        </p>
      )}
    </div>
  )
}

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
        fill="#FF4500"
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
        fill="#9494FF"
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

  function openFactArticle() {
    navigate(`/wiki/${encodeURIComponent(fact.wiki_slug)}`, {
      state: wikiArticleState,
    })
  }

  return (
    <>
    <div className="grid w-full min-w-0 grid-cols-[minmax(0,1fr)_auto] items-stretch gap-x-3">
      <div className="flex min-h-[240px] min-w-0 flex-col border border-slate-200 bg-white p-4 shadow-sm transition-[box-shadow,transform,background-color,border-color] duration-200 motion-safe:hover:-translate-y-px hover:border-slate-300 hover:bg-slate-50/90 hover:shadow-md">
        <div
          role="button"
          tabIndex={0}
          className="flex min-h-0 flex-1 cursor-pointer flex-col rounded-none outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
          onClick={openFactArticle}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault()
              openFactArticle()
            }
          }}
          aria-label={`Read article: ${fact.display_title ?? fact.wiki_slug}`}
        >
          <blockquote className="min-h-0 flex-1 overflow-y-auto text-base leading-relaxed text-black">
            {fact.fact_text}
          </blockquote>
          <div className="mt-2 flex shrink-0 flex-col gap-2">
            <div className="flex items-end justify-between gap-3 text-[11px] font-medium text-slate-500">
              <span>Submitted by:</span>
              <span className="text-right">Based on:</span>
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
                <div
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-amber-200 text-xs font-semibold text-amber-950"
                  aria-hidden
                >
                  {initials}
                </div>
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
        className="flex min-h-0 w-[9.5rem] shrink-0 flex-col gap-2 self-stretch"
        role="group"
        aria-label="Fact reactions"
      >
        <button
          type="button"
          disabled={buttonsLocked}
          onClick={() => requireAuth(() => onVote('up'))}
          className="flex min-h-0 flex-1 flex-row items-center justify-center gap-2 rounded-none border border-slate-300 bg-white px-2 py-2 text-left text-xs font-medium leading-tight text-slate-800 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <RedditStyleUpArrow className="h-7 w-6 shrink-0" />
          <span className="min-w-0">Wow really?</span>
        </button>
        <button
          type="button"
          disabled={buttonsLocked}
          onClick={() => requireAuth(() => onVote('skip'))}
          className="flex shrink-0 flex-row items-center justify-center rounded-none border border-slate-300 bg-white px-2 py-2 text-center text-xs font-medium leading-tight text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
        >
          Ok…
        </button>
        <button
          type="button"
          disabled={buttonsLocked}
          onClick={() => requireAuth(() => onVote('down'))}
          className="flex min-h-0 flex-1 flex-row items-center justify-center gap-2 rounded-none border border-slate-300 bg-white px-2 py-2 text-left text-xs font-medium leading-tight text-slate-800 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <RedditStyleDownArrow className="h-7 w-6 shrink-0" />
          <span className="min-w-0">Knew already</span>
        </button>
      </div>
      {voteError ? (
        <div className="col-span-2 mt-3 text-center text-xs text-rose-700">
          {voteError}
        </div>
      ) : null}
    </div>
    {typeof document !== 'undefined' &&
      fact?.user_id &&
      tooltip &&
      createPortal(
        <FactSubmitterTooltip
          displayName={displayHandle}
          totalRead={totalReadForLevel}
          avatarInitials={initials}
          rect={tooltip.rect}
          tooltipId={submitterTooltipId}
        />,
        document.body,
      )}
    </>
  )
}
