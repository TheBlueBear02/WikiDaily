import { NavLink, useLocation } from 'react-router-dom'
import { useEffect, useMemo, useRef, useState } from 'react'

import StreakBadge from './StreakBadge'
import WikiSearchBar from './WikiSearchBar'
import { useUserProgress } from '../../hooks/useUserProgress'
import { getCurrentLevel } from '../../lib/levels'
import { initialsFromUsername } from '../../lib/profileAvatar'
import { getSupabase } from '../../lib/supabaseClient'
import { buildAuthUrl } from '../../lib/returnTo'

const linkBase =
  'rounded-none px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 hover:text-primary'
const linkActive = 'bg-slate-100 text-primary'

export default function Navbar() {
  const location = useLocation()
  const { userId, user, profile, profileQuery } = useUserProgress()
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false)
  const [isSigningOut, setIsSigningOut] = useState(false)
  const userMenuRef = useRef(null)

  const displayName = useMemo(() => {
    const username = profile?.username?.trim()
    if (username) return username
    const metadataUsername = user?.user_metadata?.username?.trim()
    if (metadataUsername) return metadataUsername
    const email = user?.email?.trim()
    if (email) return email.split('@')[0] || email
    return 'Account'
  }, [profile?.username, user?.user_metadata?.username, user?.email])

  const initials = useMemo(() => {
    const fallback =
      user?.user_metadata?.username ?? (user?.email ? user.email.split('@')[0] : null)
    return initialsFromUsername(profile?.username ?? fallback)
  }, [profile?.username, user?.email, user?.user_metadata?.username])

  const level = getCurrentLevel(profile?.total_read ?? 0)
  // Wait for profile row, not `isPending` (disabled queries stay pending without fetching).
  const levelLineLoading = Boolean(userId) && !profile && !profileQuery.isError

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
    <header className="sticky top-0 z-50 border-b border-slate-200 bg-white">
      <div className="mx-auto flex max-w-5xl flex-wrap items-center gap-x-4 gap-y-3 px-4 py-4">
        <NavLink
          to="/"
          aria-label="Go to home"
          className="flex shrink-0 items-center gap-3 rounded-md focus:outline-none"
        >
          <img
            src="/images/site-logo-noBG.png"
            alt=""
            className="h-12 w-12 shrink-0 object-contain"
            draggable={false}
          />
          <div className="leading-tight">
            <div className="text-sm font-semibold">WikiDaily</div>
            <div className="text-xs text-slate-500">Knowledge is Power</div>
          </div>
        </NavLink>

        <WikiSearchBar className="ml-5 min-w-[8rem] flex-1 basis-[10rem] max-w-xs sm:ml-10" />

        <div className="ml-auto flex shrink-0 flex-wrap items-center justify-end gap-3">
          <nav className="flex items-center gap-2">
            <NavLink
              to="/history"
              className={({ isActive }) =>
                `${linkBase} ${isActive ? linkActive : ''}`
              }
            >
              History
            </NavLink>
            <NavLink
              to="/game"
              end={false}
              className={({ isActive }) =>
                `${linkBase} ${isActive ? linkActive : ''}`
              }
            >
              Game
            </NavLink>
            {userId ? (
              <NavLink
                to="/profile"
                className={({ isActive }) =>
                  `${linkBase} ${isActive ? linkActive : ''}`
                }
              >
                Profile
              </NavLink>
            ) : null}
          </nav>

          <StreakBadge />

          {userId ? (
            <div className="relative" ref={userMenuRef}>
              <button
                type="button"
                onClick={() => setIsUserMenuOpen((v) => !v)}
                aria-haspopup="menu"
                aria-expanded={isUserMenuOpen}
                aria-busy={levelLineLoading}
                className="flex items-center gap-2 bg-white py-1 pl-1 pr-3 text-sm font-medium text-slate-700 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-slate-300"
              >
                <span
                  className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-amber-100 text-xs font-semibold text-amber-950"
                  aria-hidden="true"
                >
                  {initials}
                </span>
                <span className="min-w-0 max-w-[14rem] text-left">
                  <span className="block truncate text-sm font-medium">{displayName}</span>
                  <span className="block min-h-[1rem] truncate text-[11px] font-normal leading-tight text-slate-500">
                    {levelLineLoading ? (
                      <span
                        className="inline-block h-3 w-[9.5rem] max-w-full animate-pulse rounded bg-slate-200 motion-reduce:animate-none"
                        aria-hidden
                      />
                    ) : (
                      `Level ${level.level} · ${level.name}`
                    )}
                  </span>
                </span>
              </button>

              {isUserMenuOpen ? (
                <div
                  role="menu"
                  aria-label="User menu"
                  className="absolute right-0 top-full z-50 mt-2 min-w-full overflow-hidden rounded-lg border border-slate-200 bg-white shadow-lg"
                >
                  <NavLink
                    to="/profile"
                    role="menuitem"
                    className="block whitespace-nowrap px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-50"
                    onClick={() => setIsUserMenuOpen(false)}
                  >
                    Profile
                  </NavLink>
                  <button
                    type="button"
                    role="menuitem"
                    onClick={onSignOut}
                    disabled={isSigningOut}
                    className="whitespace-nowrap px-3 py-2 text-left text-sm font-medium text-red-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
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
              className="rounded-none bg-primary px-3 py-2 text-sm font-medium text-white hover:bg-primary-hover"
            >
              Sign in
            </NavLink>
          )}
        </div>
      </div>
    </header>
  )
}

