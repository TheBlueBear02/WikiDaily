import { NavLink, useLocation } from 'react-router-dom'
import { useEffect, useMemo, useRef, useState } from 'react'

import StreakBadge from './StreakBadge'
import { useUserProgress } from '../hooks/useUserProgress'
import { getSupabase } from '../lib/supabaseClient'
import { buildAuthUrl } from '../lib/returnTo'

const linkBase =
  'rounded-md px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900'
const linkActive = 'bg-slate-100 text-slate-900'

export default function Navbar() {
  const location = useLocation()
  const { userId, user, profile } = useUserProgress()
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false)
  const [isSigningOut, setIsSigningOut] = useState(false)
  const userMenuRef = useRef(null)

  const displayName = useMemo(() => {
    const username = profile?.username?.trim()
    if (username) return username
    const email = user?.email?.trim()
    if (email) return email
    return 'Account'
  }, [profile?.username, user?.email])

  async function onSignOut() {
    try {
      setIsUserMenuOpen(false)
      setIsSigningOut(true)
      const supabase = getSupabase()
      const { error } = await supabase.auth.signOut()
      if (error) throw error
    } catch (err) {
      // Keep this visible in devtools; auth state should not silently fail.
      console.error('Sign out failed', err)
      setIsUserMenuOpen(true)
    } finally {
      setIsSigningOut(false)
    }
  }

  useEffect(() => {
    if (!isUserMenuOpen) return

    function onPointerDown(e) {
      const root = userMenuRef.current
      if (!root) return
      if (root.contains(e.target)) return
      setIsUserMenuOpen(false)
    }

    function onKeyDown(e) {
      if (e.key === 'Escape') setIsUserMenuOpen(false)
    }

    document.addEventListener('pointerdown', onPointerDown)
    window.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('pointerdown', onPointerDown)
      window.removeEventListener('keydown', onKeyDown)
    }
  }, [isUserMenuOpen])

  return (
    <header className="border-b border-slate-200">
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-4">
        <NavLink
          to="/"
          aria-label="Go to home"
          className="flex items-center gap-3 rounded-md focus:outline-none"
        >
          <div className="grid h-9 w-9 place-items-center rounded-lg bg-slate-900 text-sm font-semibold text-white">
            WD
          </div>
          <div className="leading-tight">
            <div className="text-sm font-semibold">WikiDaily</div>
            <div className="text-xs text-slate-500">One article a day</div>
          </div>
        </NavLink>

        <div className="flex items-center gap-3">
          <nav className="flex items-center gap-2">
            <NavLink
              to="/history"
              className={({ isActive }) =>
                `${linkBase} ${isActive ? linkActive : ''}`
              }
            >
              History
            </NavLink>
          </nav>

          <StreakBadge />

          {userId ? (
            <div className="relative" ref={userMenuRef}>
              <button
                type="button"
                onClick={() => setIsUserMenuOpen((v) => !v)}
                aria-haspopup="menu"
                aria-expanded={isUserMenuOpen}
                className="flex items-center gap-2 rounded-full border border-slate-200 bg-white py-1 pl-1 pr-3 text-sm font-medium text-slate-700 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-slate-300"
              >
                <span className="grid h-8 w-8 place-items-center rounded-full bg-slate-100 text-slate-500">
                  <svg
                    viewBox="0 0 24 24"
                    width="18"
                    height="18"
                    aria-hidden="true"
                    focusable="false"
                    className="block"
                  >
                    <path
                      fill="currentColor"
                      d="M12 12a4.25 4.25 0 1 0-4.25-4.25A4.26 4.26 0 0 0 12 12Zm0 2c-4.23 0-7.75 2.4-7.75 5.25a.75.75 0 0 0 .75.75h14a.75.75 0 0 0 .75-.75C19.75 16.4 16.23 14 12 14Z"
                    />
                  </svg>
                </span>
                <span className="max-w-[14rem] truncate">{displayName}</span>
              </button>

              {isUserMenuOpen ? (
                <div
                  role="menu"
                  aria-label="User menu"
                  className="absolute right-0 top-full z-50 mt-2 w-44 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-lg"
                >
                  <button
                    type="button"
                    role="menuitem"
                    onClick={onSignOut}
                    disabled={isSigningOut}
                    className="w-full px-3 py-2 text-left text-sm font-medium text-red-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {isSigningOut ? 'Signing out…' : 'Sign out'}
                  </button>
                </div>
              ) : null}
            </div>
          ) : (
            <NavLink
              to={buildAuthUrl({
                returnTo: `${location.pathname}${location.search ?? ''}${location.hash ?? ''}`,
              })}
              className="rounded-md bg-slate-900 px-3 py-2 text-sm font-medium text-white hover:bg-slate-800"
            >
              Sign in
            </NavLink>
          )}
        </div>
      </div>
    </header>
  )
}

