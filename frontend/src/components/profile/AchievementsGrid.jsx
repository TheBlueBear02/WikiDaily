import AchievementCard from './AchievementCard'
import { computeAchievementTypeProgress } from '../../lib/achievementProgress'

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

function SkeletonCard() {
  return (
    <div className="rounded-none border border-slate-200 bg-slate-50 p-2">
      <div className="mx-auto mt-0.5 h-8 w-8 animate-pulse rounded bg-slate-200" />
      <div className="mx-auto mt-2 h-2.5 w-2/3 animate-pulse rounded bg-slate-200" />
      <div className="mx-auto mt-1.5 h-2.5 w-5/6 animate-pulse rounded bg-slate-200" />
    </div>
  )
}

function SkeletonRow() {
  return (
    <div className="rounded-none border border-slate-200 bg-white">
      <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-1 border-b border-slate-200 px-2 py-1.5">
        <div className="h-2.5 w-16 animate-pulse rounded bg-slate-200" />
        <div className="h-2.5 w-28 max-w-full animate-pulse rounded bg-slate-200" />
      </div>
      <div className="grid grid-cols-2 gap-2 px-2 py-2 md:flex md:flex-nowrap md:gap-2 md:overflow-x-auto">
        {Array.from({ length: 6 }).map((_, idx) => (
          <div key={idx} className="min-w-0 md:min-w-[132px] md:max-w-[132px] md:shrink-0">
            <SkeletonCard />
          </div>
        ))}
      </div>
    </div>
  )
}

export default function AchievementsGrid({
  achievements,
  unlocked,
  userAchievements,
  isLoading,
  profile,
} = {}) {
  const defs = Array.isArray(achievements) ? achievements : []
  const unlockedSet = unlocked instanceof Set ? unlocked : new Set()
  const rows = Array.isArray(userAchievements) ? userAchievements : []

  const unlockedCount = defs.reduce((acc, a) => acc + (unlockedSet.has(a?.id) ? 1 : 0), 0)
  const totalCount = defs.length

  function unlockedAtFor(id) {
    const row = rows.find((r) => r?.achievement_id === id)
    return row?.unlocked_at ?? null
  }

  const showSkeletons = Boolean(isLoading)
  const skeletonCount = 14

  return (
    <section className="space-y-1.5">
      <div className="flex items-baseline justify-between gap-2">
        <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
          Achievements
        </div>
        <div className="text-[11px] font-semibold text-slate-500">
          {showSkeletons ? '— / — unlocked' : `${unlockedCount} / ${totalCount} unlocked`}
        </div>
      </div>

      {showSkeletons ? (
        <div className="space-y-2">
          <SkeletonRow />
          <SkeletonRow />
          <SkeletonRow />
        </div>
      ) : (
        <div className="space-y-2">
          {Object.keys(TYPE_META)
            .sort((a, b) => typeOrder(a) - typeOrder(b))
            .map((type) => {
              const meta = TYPE_META[type]
              const defsForType = defs
                .filter((a) => a?.type === type)
                .sort((a, b) => (a?.threshold ?? 0) - (b?.threshold ?? 0))

              const currentValue = profile?.[meta.statKey] ?? 0
              const prog = computeAchievementTypeProgress({ defsForType, unlockedSet, currentValue })

              const label = prog.isMaxed
                ? 'All unlocked'
                : `${Math.min(prog.current, prog.nextThreshold)} / ${prog.nextThreshold} ${
                    meta.unit
                  } · next: ${prog.nextLabel ?? '—'}`

              return (
                <div key={type} className="rounded-none border border-slate-200 bg-white">
                  <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-1 border-b border-slate-200 px-2 py-1.5">
                    <div className="shrink-0 text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                      {meta.title}
                    </div>
                    <div className="min-w-0 max-w-full text-right text-[10px] font-medium leading-tight text-slate-500 md:max-w-[14rem]">
                      {label}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 px-2 py-2 md:flex md:flex-nowrap md:gap-2 md:overflow-x-auto">
                    {defsForType.length === 0 ? (
                      <div className="col-span-2 text-[11px] text-slate-500 md:col-span-auto">
                        No achievements yet.
                      </div>
                    ) : (
                      defsForType.map((a) => (
                        <div key={a?.id} className="min-w-0 md:min-w-[132px] md:max-w-[132px] md:shrink-0">
                          <AchievementCard
                            achievement={a}
                            isUnlocked={unlockedSet.has(a?.id)}
                            unlockedAt={unlockedAtFor(a?.id)}
                            compact
                          />
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )
            })}
        </div>
      )}
    </section>
  )
}

