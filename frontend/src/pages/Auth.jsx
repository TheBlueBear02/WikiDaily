import { useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'

import { getSupabase } from '../lib/supabaseClient'
import { getReturnToFromLocation } from '../lib/returnTo'

export default function Auth() {
  const location = useLocation()
  const navigate = useNavigate()

  const returnTo = useMemo(() => getReturnToFromLocation(location) ?? '/', [location])

  const [mode, setMode] = useState('signin') // 'signin' | 'signup'
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  function normalizeUsername(input) {
    return String(input ?? '')
      .trim()
      .replace(/\s+/g, '_')
  }

  async function onSubmit(e) {
    e.preventDefault()
    setError(null)
    setIsSubmitting(true)

    try {
      const supabase = getSupabase()
      const trimmedEmail = email.trim()
      const normalizedUsername = normalizeUsername(username)

      if (!trimmedEmail || !password) {
        throw new Error('Please enter email and password.')
      }

      if (mode === 'signup') {
        if (!normalizedUsername) {
          throw new Error('Please choose a username.')
        }
        if (!/^[A-Za-z0-9_]{3,20}$/.test(normalizedUsername)) {
          throw new Error(
            'Username must be 3–20 characters and only use letters, numbers, or underscores.',
          )
        }
        const { data: signUpData, error: signUpErr } = await supabase.auth.signUp({
          email: trimmedEmail,
          password,
          options: {
            data: {
              username: normalizedUsername,
            },
          },
        })
        if (signUpErr) throw signUpErr

        // Supabase can be configured to require email confirmation. In that case `signUp`
        // succeeds but returns no active session, so we won’t be signed in on redirect.
        // Best-effort: immediately sign in after successful signup so the user lands on
        // Home already authenticated when confirmation is disabled.
        if (!signUpData?.session) {
          const { error: signInAfterSignUpErr } = await supabase.auth.signInWithPassword({
            email: trimmedEmail,
            password,
          })
          if (signInAfterSignUpErr) {
            throw new Error(
              'Account created. Please check your email to confirm your account, then sign in.',
            )
          }
        }
      } else {
        const { error: signInErr } = await supabase.auth.signInWithPassword({
          email: trimmedEmail,
          password,
        })
        if (signInErr) throw signInErr
      }

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
        <h1 className="text-2xl font-semibold tracking-tight">
          {mode === 'signup' ? 'Create an account' : 'Sign in'}
        </h1>
        <p className="text-sm text-slate-600">
          {mode === 'signup'
            ? 'Sign up to track your streak and collect cards.'
            : 'Sign in to track your streak and collect cards.'}
        </p>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-5">
        <form className="space-y-4" onSubmit={onSubmit}>
          {mode === 'signup' ? (
            <label className="block space-y-1">
              <div className="text-sm font-medium text-primary">Username</div>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                autoComplete="username"
                className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-primary shadow-sm outline-none focus:border-slate-400"
                placeholder="wiki_reader"
                minLength={3}
                maxLength={20}
                required
              />
              <div className="text-xs text-slate-500">
                3–20 chars, letters/numbers/underscore only.
              </div>
            </label>
          ) : null}

          <label className="block space-y-1">
            <div className="text-sm font-medium text-primary">Email</div>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-primary shadow-sm outline-none focus:border-slate-400"
              placeholder="you@example.com"
              required
            />
          </label>

          <label className="block space-y-1">
            <div className="text-sm font-medium text-primary">Password</div>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
              className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-primary shadow-sm outline-none focus:border-slate-400"
              placeholder="••••••••"
              minLength={6}
              required
            />
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
            {isSubmitting
              ? mode === 'signup'
                ? 'Creating account…'
                : 'Signing in…'
              : mode === 'signup'
                ? 'Create account'
                : 'Sign in'}
          </button>

          <div className="text-center text-sm text-slate-600">
            {mode === 'signup' ? (
              <>
                Already have an account?{' '}
                <button
                  type="button"
                  className="font-medium text-primary hover:underline"
                  onClick={() => setMode('signin')}
                >
                  Sign in
                </button>
              </>
            ) : (
              <>
                New here?{' '}
                <button
                  type="button"
                  className="font-medium text-primary hover:underline"
                  onClick={() => setMode('signup')}
                >
                  Create an account
                </button>
              </>
            )}
          </div>
        </form>
      </div>
    </section>
  )
}

