/** First two initials for profile / nav avatar (matches ProfileHeader rules). */
export function initialsFromUsername(username) {
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
