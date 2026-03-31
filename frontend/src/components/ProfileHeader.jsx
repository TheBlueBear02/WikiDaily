import { useMemo } from 'react'

function initialsFromUsername(username) {
  const raw = String(username ?? '').trim()
  if (!raw) return 'WD'
  const parts = raw
    .replace(/^@+/, '')
    .split(/[\s._-]+/g)
    .filter(Boolean)
  const first = parts[0]?.[0] ?? raw[0]
  const second = parts[1]?.[0] ?? raw[1] ?? ''
  return `${first ?? ''}${second ?? ''}`.toUpperCase()
}

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

  return (
    <div className="flex flex-col gap-4 border-b border-slate-200 pb-5 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center gap-4">
        <div className="grid h-16 w-16 flex-shrink-0 place-items-center rounded-full bg-amber-100 text-lg font-semibold text-amber-950">
          {initials}
        </div>

        <div className="min-w-0 flex-1 space-y-1">
          <div className="font-serif text-2xl font-semibold leading-tight text-primary">
            {handle}
          </div>
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

