import { useMemo } from 'react'

function formatUnlockedAt(unlockedAt) {
  if (!unlockedAt) return null
  const d = new Date(unlockedAt)
  if (!Number.isFinite(d.getTime())) return null
  const dateStr = new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: '2-digit',
    year: 'numeric',
  }).format(d)
  return `Unlocked ${dateStr}`
}

export default function AchievementCard({ achievement, isUnlocked, unlockedAt, compact = false }) {
  const unlockedLabel = useMemo(() => formatUnlockedAt(unlockedAt), [unlockedAt])

  const base = compact ? 'rounded-none border bg-white p-2' : 'rounded-none border bg-white p-3'
  const stateClass = isUnlocked
    ? 'border-teal-200 shadow-sm'
    : 'border-slate-200 opacity-40 grayscale'

  const iconWrap = compact
    ? 'mt-0.5 flex h-8 w-8 items-center justify-center text-[22px] leading-none'
    : 'mt-1 flex h-9 w-9 items-center justify-center text-[28px] leading-none'
  const titleClass = compact
    ? 'mt-1.5 break-words text-[12px] font-medium text-primary'
    : 'mt-2 text-[13px] font-medium text-primary'
  const descClass = compact
    ? 'mt-0.5 break-words text-[10px] text-slate-600'
    : 'mt-1 text-[11px] text-slate-600'
  const unlockedClass = compact
    ? 'mt-1 text-[9px] font-medium text-slate-500'
    : 'mt-2 text-[10px] font-medium text-slate-500'

  return (
    <div className={[base, stateClass].join(' ')}>
      <div className="flex flex-col items-center text-center">
        <div className={iconWrap}>{achievement?.icon ?? '🏅'}</div>

        <div
          className={titleClass}
          style={{ fontFamily: 'ui-serif, Georgia, Cambria, \"Times New Roman\", Times, serif' }}
        >
          {achievement?.label ?? 'Achievement'}
        </div>

        <div className={descClass}>{isUnlocked ? achievement?.description ?? '' : '???'}</div>

        {isUnlocked && unlockedLabel ? (
          <div className={unlockedClass}>{unlockedLabel}</div>
        ) : null}
      </div>
    </div>
  )
}

