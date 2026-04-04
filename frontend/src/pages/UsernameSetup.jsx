import { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'

import { getSupabase } from '../lib/supabaseClient'
import { getReturnToFromLocation } from '../lib/returnTo'

export default function UsernameSetup() {
  const navigate = useNavigate()
  const location = useLocation()
  const queryClient = useQueryClient()

  const returnTo = getReturnToFromLocation(location) ?? '/'

  const [username, setUsername] = useState('')
  const [error, setError] = useState(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  function normalizeUsername(input) {
    return String(input ?? '')
      .trim()
      .replace(/\s+/g, ' ')
  }

  async function onSubmit(e) {
    e.preventDefault()
    setError(null)
    setIsSubmitting(true)

    try {
      const normalized = normalizeUsername(username)

      if (!normalized) throw new Error('Please choose a username.')
      if (!/^[A-Za-z0-9_ ]{3,20}$/.test(normalized)) {
        throw new Error(
          'Username must be 3–20 characters and only use letters, numbers, underscores, or spaces.',
        )
      }

      const supabase = getSupabase()
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) throw new Error('Not signed in.')

      // Save username into auth metadata so triggers + other parts of the app can read it
      const { error: metaErr } = await supabase.auth.updateUser({
        data: { username: normalized },
      })
      if (metaErr) throw metaErr

      // Upsert profile row directly as well
      const { error: profileErr } = await supabase
        .from('profiles')
        .upsert({ user_id: user.id, username: normalized }, { onConflict: 'user_id' })
      if (profileErr) throw profileErr

      // Refresh cached auth user so Navbar etc. pick up the new username immediately
      queryClient.invalidateQueries({ queryKey: ['authUser'] })
      queryClient.invalidateQueries({ queryKey: ['profile', user.id] })

      navigate(returnTo, { replace: true })
    } catch (err) {
      setError(err?.message ?? 'Something went wrong.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <section className="mx-auto max-w-md space-y-4">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">Choose a username</h1>
        <p className="text-sm text-slate-600">
          Pick a public name to display on your profile and the leaderboard.
        </p>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-5">
        <form className="space-y-4" onSubmit={onSubmit}>
          <label className="block space-y-1">
            <div className="text-sm font-medium text-primary">Username</div>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoComplete="username"
              autoFocus
              className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-primary shadow-sm outline-none focus:border-slate-400"
              placeholder="wiki_reader"
              minLength={3}
              maxLength={20}
              required
            />
            <div className="text-xs text-slate-500">
              3–20 chars, letters, numbers, spaces, or underscores.
            </div>
          </label>

          {error ? (
            <div className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-900">
              {error}
            </div>
          ) : null}

          <button
            type="submit"
            disabled={isSubmitting}
            className="inline-flex w-full items-center justify-center bg-primary px-3 py-2 text-sm font-medium text-white hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-70"
          >
            {isSubmitting ? 'Saving…' : 'Save username'}
          </button>
        </form>
      </div>
    </section>
  )
}
