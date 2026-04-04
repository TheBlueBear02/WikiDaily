import { NavLink, useLocation } from 'react-router-dom'

import { useAchievements } from '../../hooks/useAchievements'
import { computeAchievementTypeProgress } from '../../lib/achievementProgress'
import { buildAuthUrl } from '../../lib/returnTo'
import AchievementProgressTrack from './AchievementProgressTrack'

const TYPE_META = {
  total_read: { title: 'Reading', statKey: 'total_read', unit: 'articles' },
  random_read: { title: 'Random', statKey: 'total_random_read', unit: 'articles' },
  streak: { title: 'Streak', statKey: 'current_streak', unit: 'days' },
}

function typeOrder(type) {
  if (type === 'total_read') return 0
  if (type === 'random_read') return 1
  if (type === 'streak') return 2
  return 99
}

function ProgressRow({ title, description, icon, pct, label, isLoading } = {}) {
  const aria =
    description && String(description).trim()
      ? `${title}. ${description}`
      : `${title} achievements progress`
  const displayIcon = icon ?? '🏅'
  return (
    <div className="space-y-0.5">
      <div className="flex items-center justify-between gap-2">
        <div className="flex min-w-0 flex-1 items-center gap-1">
          {isLoading ? (
            <div
              className="h-6 w-6 shrink-0 animate-pulse rounded bg-slate-200/90"
              aria-hidden
            />
          ) : (
            <div
              className="flex h-6 w-6 shrink-0 items-center justify-center text-[17px] leading-none"
              aria-hidden
            >
              {displayIcon}
            </div>
          )}
          <div className="min-w-0 flex-1">
            <div className="text-xs font-semibold text-slate-700">{title}</div>
            {description ? (
              <div className="w-full min-w-0 truncate whitespace-nowrap text-left text-[11px] leading-tight text-slate-500">
                {description}
              </div>
            ) : null}
          </div>
        </div>
        <div className="shrink-0 text-[11px] font-medium leading-none text-slate-500">{label}</div>
      </div>
      <AchievementProgressTrack value={pct} isLoading={isLoading} withEndStar aria-label={aria} />
    </div>
  )
}

export default function HeroAchievementsSection({ userId, profile } = {}) {
  const location = useLocation()
  const { achievements, unlocked, isLoading } = useAchievements({ userId })

  const defs = Array.isArray(achievements) ? achievements : []
  const unlockedSet = unlocked instanceof Set ? unlocked : new Set()

  return (
    <div className="flex flex-col">
      <div className="h-1.5 w-full bg-secondary" />
      {userId ? (
        <div className="divide-y divide-slate-200">
          {Object.keys(TYPE_META)
            .sort((a, b) => typeOrder(a) - typeOrder(b))
            .map((type) => {
              const meta = TYPE_META[type]
              const defsForType = defs.filter((a) => a?.type === type)
              const currentValue = profile?.[meta.statKey] ?? 0
              const prog = computeAchievementTypeProgress({ defsForType, unlockedSet, currentValue })
              const rowTitle = isLoading ? '…' : prog.nextLabel ?? meta.title
              const rowDescription = isLoading ? null : prog.nextDescription ?? null
              const rowIcon = isLoading ? null : prog.nextIcon ?? null
              const label = isLoading
                ? '…'
                : prog.isMaxed
                  ? 'All unlocked'
                  : `${Math.min(prog.current, prog.nextThreshold)} / ${prog.nextThreshold} ${
                      meta.unit
                    }`

              return (
                <div key={type} className="px-3 py-2.5">
                  <ProgressRow
                    title={rowTitle}
                    description={rowDescription}
                    icon={rowIcon}
                    pct={prog.pct}
                    label={label}
                    isLoading={isLoading}
                  />
                </div>
              )
            })}
        </div>
      ) : (
        <div className="flex flex-1 flex-col items-center justify-center border border-dashed border-slate-200 bg-slate-50/70 px-2 py-3 text-center">
          <div className="text-sm font-medium text-slate-700">Sign in to earn achievements</div>
          <div className="mt-0.5 text-xs leading-relaxed text-slate-500">
            Track your reading goals and unlock badges.
          </div>
          <NavLink
            to={buildAuthUrl({
              returnTo: `${location.pathname}${location.search ?? ''}${location.hash ?? ''}`,
            })}
            className="mt-3 inline-flex rounded-none bg-primary px-3 py-1.5 text-sm font-medium text-white hover:bg-primary-hover"
          >
            Sign in
          </NavLink>
        </div>
      )}
    </div>
  )
}

