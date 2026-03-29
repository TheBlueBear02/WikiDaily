import { useUserProgress } from '../hooks/useUserProgress'
import { useLocation, useNavigate } from 'react-router-dom'

import { buildAuthUrl } from '../lib/returnTo'

export default function MarkAsReadButton({ wikiSlug, readDateYmd }) {
  const location = useLocation()
  const navigate = useNavigate()
  const { userId, profile, markAsReadMutation, markAsRead } = useUserProgress()

  const isReadToday = Boolean(profile?.last_read && profile.last_read === readDateYmd)
  const alreadyReadFromMutation = markAsReadMutation.data?.status === 'already_read'
  const showAlreadyRead = isReadToday || alreadyReadFromMutation

  const disabled = !wikiSlug || !readDateYmd || markAsReadMutation.isPending

  const label = (() => {
    if (markAsReadMutation.isPending) return 'Marking…'
    if (showAlreadyRead) return 'Already read today'
    return 'Mark as read'
  })()

  const title = (() => {
    if (!userId) return 'Sign in to mark an article as read (Phase 6 adds the UI).'
    if (showAlreadyRead) return 'You already marked today as read.'
    return undefined
  })()

  async function onClick() {
    if (!userId) {
      markAsReadMutation.reset()
      const returnTo = `${location.pathname}${location.search ?? ''}${location.hash ?? ''}`
      navigate(buildAuthUrl({ returnTo }))
      return
    }
    await markAsRead({ wikiSlug, readDateYmd })
  }

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled || !userId || showAlreadyRead}
      className="inline-flex items-center justify-center rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
      title={title}
    >
      {label}
    </button>
  )
}

