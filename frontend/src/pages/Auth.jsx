import { useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'

import { getSupabase } from '../lib/supabaseClient'
import { getReturnToFromLocation } from '../lib/returnTo'

const DEFAULT_AVATARS = [
  { id: 'witch', src: '/images/witch-image.png', label: 'Witch' },
  { id: 'wizard', src: '/images/wizard 1.jpg', label: 'Wizard' },
]

export default function Auth() {
  const location = useLocation()
  const navigate = useNavigate()

  const returnTo = useMemo(() => getReturnToFromLocation(location) ?? '/', [location])

  const [mode, setMode] = useState('signin') // 'signin' | 'signup'
  const [step, setStep] = useState('form') // 'form' | 'avatar'
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [selectedAvatar, setSelectedAvatar] = useState(null)
  const [error, setError] = useState(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  function normalizeUsername(input) {
    return String(input ?? '')
      .trim()
      .replace(/\s+/g, ' ')
  }

  async function onGoogleSignIn() {
    setError(null)
    const supabase = getSupabase()
    const { error: oauthErr } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin + returnTo,
      },
    })
    if (oauthErr) setError(oauthErr.message)
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
        if (!/^[A-Za-z0-9_ ]{3,20}$/.test(normalizedUsername)) {
          throw new Error(
            'Username must be 3–20 characters and only use letters, numbers, underscores, or spaces.',
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

        // After successful signup, move to avatar selection step
        setStep('avatar')
        return
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

  async function onAvatarConfirm() {
    if (!selectedAvatar) {
      setError('Please choose a profile image.')
      return
    }
    setError(null)
    setIsSubmitting(true)
    try {
      const supabase = getSupabase()
      const avatar = DEFAULT_AVATARS.find((a) => a.id === selectedAvatar)
      const avatarUrl = window.location.origin + avatar.src

      const { error: updateErr } = await supabase.auth.updateUser({
        data: { avatar_url: avatarUrl },
      })
      if (updateErr) throw updateErr
    } catch (err) {
      setError(err?.message ?? 'Something went wrong.')
    } finally {
      setIsSubmitting(false)
      navigate(returnTo, { replace: true })
    }
  }

  function onSkipAvatar() {
    navigate(returnTo, { replace: true })
  }

  if (step === 'avatar') {
    return (
      <section className="mx-auto max-w-md space-y-4">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">Choose your profile image</h1>
          <p className="text-sm text-slate-600">Pick an avatar to represent you on WikiDaily.</p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5 space-y-5">
          <div className="flex justify-center gap-6">
            {DEFAULT_AVATARS.map((avatar) => (
              <button
                key={avatar.id}
                type="button"
                onClick={() => setSelectedAvatar(avatar.id)}
                className={`flex flex-col items-center gap-2 rounded-xl border-2 p-3 transition-all focus:outline-none ${
                  selectedAvatar === avatar.id
                    ? 'border-primary bg-amber-50 shadow-md'
                    : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                }`}
              >
                <img
                  src={avatar.src}
                  alt={avatar.label}
                  className="h-28 w-28 rounded-full object-cover ring-2 ring-slate-200"
                />
                {selectedAvatar === avatar.id && (
                  <span className="text-xs font-semibold text-primary">Selected</span>
                )}
              </button>
            ))}
          </div>

          {error ? (
            <div className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-900">
              {error}
            </div>
          ) : null}

          <button
            type="button"
            onClick={onAvatarConfirm}
            disabled={isSubmitting || !selectedAvatar}
            className="inline-flex w-full items-center justify-center bg-primary px-3 py-2 text-sm font-medium text-white hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-70"
          >
            {isSubmitting ? 'Saving…' : 'Save and continue'}
          </button>

          <button
            type="button"
            onClick={onSkipAvatar}
            className="w-full text-center text-sm text-slate-500 hover:underline"
          >
            Skip for now
          </button>
        </div>
      </section>
    )
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
        <div className="mb-4 space-y-3">
          <button
            type="button"
            onClick={onGoogleSignIn}
            className="inline-flex w-full items-center justify-center gap-2 rounded-md border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-primary shadow-sm hover:bg-slate-50"
          >
            <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
              <path
                d="M17.64 9.205c0-.639-.057-1.252-.164-1.841H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615Z"
                fill="#4285F4"
              />
              <path
                d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18Z"
                fill="#34A853"
              />
              <path
                d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332Z"
                fill="#FBBC05"
              />
              <path
                d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58Z"
                fill="#EA4335"
              />
            </svg>
            Continue with Google
          </button>

          <div className="flex items-center gap-3 text-xs text-slate-400">
            <div className="h-px flex-1 bg-slate-200" />
            or
            <div className="h-px flex-1 bg-slate-200" />
          </div>
        </div>

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
                3–20 chars, letters, numbers, spaces, or underscores.
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
