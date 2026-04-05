import { useMemo } from 'react'

import { getCurrentLevel, getNextLevel } from '../../lib/levels'
import { initialsFromUsername } from '../../lib/profileAvatar'

function formatHandle(username, fallback) {
  const v = String(username ?? '').trim().replace(/^@+/, '')
  if (v) return v
  const f = String(fallback ?? '').trim().replace(/^@+/, '')
  if (f) return f
  return 'reader'
}

export default function ProfileHeader({ profile, user, memberSince }) {
  const handle = useMemo(() => {
    const fallback =
      user?.user_metadata?.username ?? (user?.email ? user.email.split('@')[0] : null)
    return formatHandle(profile?.username, fallback)
  }, [profile?.username, user?.email, user?.user_metadata?.username])

  const initials = useMemo(() => {
    const fallback =
      user?.user_metadata?.username ?? (user?.email ? user.email.split('@')[0] : null)
    return initialsFromUsername(profile?.username ?? fallback)
  }, [profile?.username, user?.email, user?.user_metadata?.username])

  const avatarUrl = user?.user_metadata?.avatar_url ?? user?.user_metadata?.picture ?? null

  const totalRead = profile?.total_read ?? 0
  const level = getCurrentLevel(totalRead)
  const nextLevel = getNextLevel(totalRead)

  const levelLine = useMemo(() => {
    const base = `Level ${level.level} · ${level.name}`
    if (!nextLevel) {
      return `${base} (${totalRead} ${totalRead === 1 ? 'read' : 'reads'} — max level)`
    }
    const readsWord = totalRead === 1 ? 'read' : 'reads'
    return `${base} (${totalRead} ${readsWord} → Level ${nextLevel.level} at ${nextLevel.threshold})`
  }, [level.level, level.name, nextLevel, totalRead])

  return (
    <div className="flex flex-col gap-4 border-b border-slate-200 pb-5 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center gap-4">
        {avatarUrl ? (
          <img
            src={avatarUrl}
            alt=""
            referrerPolicy="no-referrer"
            onError={(e) => { e.currentTarget.style.display = 'none'; e.currentTarget.nextSibling.style.display = 'grid' }}
            className="h-16 w-16 flex-shrink-0 rounded-full object-cover ring-2 ring-slate-200"
          />
        ) : null}
        <div
          style={{ display: avatarUrl ? 'none' : 'grid' }}
          className="grid h-16 w-16 flex-shrink-0 place-items-center rounded-full bg-amber-100 text-2xl font-semibold text-amber-950"
        >
          {initials}
        </div>

        <div className="min-w-0 flex-1 space-y-1">
          <div className="text-2xl font-medium leading-tight tracking-tight text-slate-700 sm:text-3xl">
            {handle}
          </div>
          <div className="text-[13px] text-slate-500">{levelLine}</div>
          <div className="text-sm text-slate-500">
            {memberSince ? `Member since ${memberSince}` : 'Member since —'}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3 flex-shrink-0">
        <div className="font-serif text-sm italic text-slate-400">Knowledge is Power</div>
        <img
          src="/images/wizard%201.jpg"
          alt="WikiDaily profile wizard"
          className="h-24 w-24 rounded-xl object-cover shadow-sm"
        />
      </div>
    </div>
  )
}

