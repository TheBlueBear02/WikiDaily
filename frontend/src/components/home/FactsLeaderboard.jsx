import { useCallback, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Link, NavLink } from 'react-router-dom'

import { useTopFacts } from '../../hooks/useTopFacts'
import { initialsFromUsername } from '../../lib/profileAvatar'
import { getCurrentLevel } from '../../lib/levels'
import ProfileTooltip from '../shared/ProfileTooltip'

const TOOLTIP_HIDE_MS = 180

const SKELETON_TEXT_WIDTHS = [88, 72, 95, 80, 68, 91, 76, 84, 70, 87]

function rankBadgeClass(rank) {
  if (rank === 1) return 'bg-amber-100 text-amber-900 ring-1 ring-amber-200/80'
  if (rank === 2) return 'bg-slate-200 text-slate-800 ring-1 ring-slate-300/80'
  if (rank === 3) return 'bg-orange-100 text-orange-900 ring-1 ring-orange-200/80'
  return 'bg-slate-100 text-slate-600 ring-1 ring-slate-200/80'
}

function useTooltip() {
  const [tooltip, setTooltip] = useState(null)
  const timerRef = useRef(null)

  const clear = useCallback(() => {
    if (timerRef.current != null) {
      clearTimeout(timerRef.current)
      timerRef.current = null
    }
  }, [])

  const show = useCallback((fact, el) => {
    if (!fact || !el) return
    clear()
    setTooltip({ fact, rect: el.getBoundingClientRect() })
  }, [clear])

  const hide = useCallback(() => {
    clear()
    timerRef.current = window.setTimeout(() => {
      timerRef.current = null
      setTooltip(null)
    }, TOOLTIP_HIDE_MS)
  }, [clear])

  useEffect(() => () => clear(), [clear])

  return { tooltip, show, hide, clear }
}

function RowSkeleton({ rank }) {
  const w = SKELETON_TEXT_WIDTHS[(rank - 1) % SKELETON_TEXT_WIDTHS.length]
  return (
    <li className={['flex items-start gap-3 px-4 py-3', rank % 2 === 0 ? 'bg-slate-50' : 'bg-white'].join(' ')}>
      <span
        className={[
          'mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold',
          rankBadgeClass(rank),
        ].join(' ')}
      >
        {rank}
      </span>
      <div className="min-w-0 flex-1 space-y-1.5 pt-0.5">
        <div className="h-3.5 animate-pulse rounded bg-slate-200 motion-reduce:animate-none" style={{ width: `${w}%` }} />
        <div className="h-3 animate-pulse rounded bg-slate-200/80 motion-reduce:animate-none" style={{ width: '45%' }} />
      </div>
      <div className="shrink-0 space-y-1 pt-0.5 text-right">
        <div className="h-4 w-8 animate-pulse rounded bg-slate-200 motion-reduce:animate-none" />
        <div className="h-2.5 w-12 animate-pulse rounded bg-slate-200/80 motion-reduce:animate-none" />
      </div>
    </li>
  )
}

export default function FactsLeaderboard({ limit = 10 } = {}) {
  const { data: facts, isLoading } = useTopFacts({ limit })
  const { tooltip, show, hide } = useTooltip()

  return (
    <div className="mt-6 w-full">
      <div className="border border-slate-200 bg-white text-left">
        <div className="bg-primary px-5 py-2">
          <h3 className="text-center text-base font-bold uppercase tracking-[0.12em] text-white">
            Top Facts
          </h3>
        </div>

        <ol>
          {isLoading
            ? Array.from({ length: limit }, (_, i) => (
                <RowSkeleton key={i} rank={i + 1} />
              ))
            : (facts ?? []).map((fact, idx) => {
                const rank = idx + 1
                const username = fact.submitter_username ?? 'Anonymous'
                const hasUser = Boolean(fact.user_id)
                const level = getCurrentLevel(fact.submitter_total_read ?? 0)
                const isStriped = rank % 2 === 0

                return (
                  <li
                    key={fact.id}
                    className={['flex items-start gap-3 px-4 py-3', isStriped ? 'bg-slate-50' : 'bg-white'].join(' ')}
                  >
                    <span
                      className={[
                        'mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold tabular-nums',
                        rankBadgeClass(rank),
                      ].join(' ')}
                      aria-hidden
                    >
                      {rank}
                    </span>

                    <div className="min-w-0 flex-1">
                      <p className="text-sm leading-snug text-slate-800">
                        {fact.fact_text}{' '}
                        <NavLink
                          to={`/wiki/${encodeURIComponent(fact.wiki_slug)}`}
                          state={{ displayTitle: fact.display_title, source: 'link', highlightFactText: fact.fact_text }}
                          className="whitespace-nowrap font-medium text-primary hover:underline"
                        >
                          source &raquo;
                        </NavLink>
                      </p>
                      <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-0.5">
                        {/* Submitter */}
                        {hasUser ? (
                          <button
                            type="button"
                            className="flex min-w-0 items-center gap-1.5 text-left"
                            onMouseEnter={(e) => show(fact, e.currentTarget)}
                            onMouseLeave={hide}
                            aria-label={`View profile of ${username}`}
                          >
                            {fact.submitter_avatar_url ? (
                              <img
                                src={fact.submitter_avatar_url}
                                alt=""
                                aria-hidden
                                referrerPolicy="no-referrer"
                                className="h-5 w-5 shrink-0 rounded-full object-cover ring-1 ring-slate-200"
                              />
                            ) : (
                              <span
                                className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-amber-100 text-[9px] font-semibold text-amber-950"
                                aria-hidden
                              >
                                {initialsFromUsername(username)}
                              </span>
                            )}
                            <span className="truncate text-xs font-medium text-primary hover:underline">
                              {username}
                            </span>
                            {fact.submitter_total_read != null && (
                              <span className="shrink-0 text-[10px] text-slate-400">
                                {`Lv.${level.level}`}
                              </span>
                            )}
                          </button>
                        ) : (
                          <span className="text-xs text-slate-400">Anonymous</span>
                        )}

                        <span className="text-slate-300" aria-hidden>·</span>

                        {/* Article link */}
                        <Link
                          to={`/wiki/${encodeURIComponent(fact.wiki_slug)}`}
                          className="truncate text-xs text-slate-500 hover:text-primary hover:underline"
                          title={fact.display_title}
                        >
                          {fact.display_title}
                        </Link>
                      </div>
                    </div>

                    {/* Net score */}
                    <div className="shrink-0 pt-0.5 text-right">
                      <div className="text-sm font-bold tabular-nums text-primary">
                        {fact.net_score > 0 ? `+${fact.net_score}` : fact.net_score}
                      </div>
                      <div className="text-[10px] font-medium uppercase tracking-wide text-slate-400">
                        score
                      </div>
                    </div>
                  </li>
                )
              })}
        </ol>

        {!isLoading && (facts ?? []).length === 0 && (
          <p className="px-4 py-6 text-center text-sm text-slate-500">
            No facts yet — be the first to share something!
          </p>
        )}
      </div>

      {typeof document !== 'undefined' &&
        tooltip?.fact &&
        createPortal(
          <ProfileTooltip
            displayName={tooltip.fact.submitter_username ?? 'Anonymous'}
            totalRead={tooltip.fact.submitter_total_read ?? 0}
            avatarInitials={initialsFromUsername(tooltip.fact.submitter_username ?? '')}
            avatarUrl={tooltip.fact.submitter_avatar_url ?? null}
            factsCount={tooltip.fact.submitter_facts_count ?? null}
            rect={tooltip.rect}
            tooltipId="facts-lb-tip"
          />,
          document.body,
        )}
    </div>
  )
}
