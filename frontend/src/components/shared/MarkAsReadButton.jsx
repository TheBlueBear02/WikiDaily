import { useUserProgress } from '../../hooks/useUserProgress'
import { useLocation, useNavigate } from 'react-router-dom'

import { buildAuthUrl } from '../../lib/returnTo'

function formatMutationError(err) {
  if (!err) return null
  if (err instanceof Error) return err.message

  // Supabase PostgrestError-ish shape: { message, details, hint, code }
  if (typeof err === 'object') {
    const message = typeof err.message === 'string' ? err.message : null
    const code = typeof err.code === 'string' ? err.code : null
    const details = typeof err.details === 'string' ? err.details : null
    const hint = typeof err.hint === 'string' ? err.hint : null

    const parts = []
    if (code) parts.push(code)
    if (message) parts.push(message)
    if (details) parts.push(details)
    if (hint) parts.push(`Hint: ${hint}`)

    if (parts.length) return parts.join(' — ')

    try {
      return JSON.stringify(err)
    } catch {
      // fall through
    }
  }

  return String(err)
}

export default function MarkAsReadButton({ wikiSlug, readDateYmd, source = 'daily' }) {
  const location = useLocation()
  const navigate = useNavigate()
  const { userId, profile, markAsReadMutation, markAsRead } = useUserProgress()

  const isReadToday = Boolean(
    source === 'daily' && profile?.last_read && profile.last_read === readDateYmd,
  )
  const alreadyReadFromMutation = markAsReadMutation.data?.status === 'already_read'
  const showAlreadyRead = isReadToday || alreadyReadFromMutation
  const errorMessage = formatMutationError(markAsReadMutation.error)

  const disabled = !wikiSlug || !readDateYmd || markAsReadMutation.isPending

  const label = (() => {
    if (markAsReadMutation.isPending) return 'Marking…'
    if (showAlreadyRead) return 'Already read today'
    if (errorMessage) return 'Try again'
    return 'Mark as read'
  })()

  const title = (() => {
    if (!userId) return 'Sign in to mark an article as read (Phase 6 adds the UI).'
    if (showAlreadyRead) {
      return source === 'daily'
        ? 'You already marked today as read.'
        : 'You already logged this article today.'
    }
    if (errorMessage) return errorMessage
    return undefined
  })()

  async function onClick() {
    if (!userId) {
      markAsReadMutation.reset()
      const returnTo = `${location.pathname}${location.search ?? ''}${location.hash ?? ''}`
      navigate(buildAuthUrl({ returnTo }))
      return
    }
    await markAsRead({ wikiSlug, readDateYmd, source })
  }

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={onClick}
        disabled={disabled || !userId || showAlreadyRead}
        className="inline-flex items-center justify-center border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
        title={title}
      >
        {label}
      </button>

      {errorMessage ? (
        <div className="text-xs font-medium text-rose-700">
          Mark as read failed: {errorMessage}
        </div>
      ) : null}
    </div>
  )
}

