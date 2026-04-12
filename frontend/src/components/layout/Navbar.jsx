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
  const [menuOpen, setMenuOpen] = useState(false)
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

  const avatarUrl = user?.user_metadata?.avatar_url ?? user?.user_metadata?.picture ?? null

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

  useEffect(() => {
    setMenuOpen(false)
  }, [location.pathname])

  return (
    <header className="sticky top-0 z-50 border-b border-slate-200 bg-white relative">
      <div className="mx-auto flex max-w-5xl flex-wrap items-center gap-x-4 gap-y-3 px-4 py-2">
        <NavLink
          to="/"
          aria-label="Go to home"
          className="flex shrink-0 items-center gap-3 rounded-md focus:outline-none"
        >
          <img
            src="/images/site-logo-noBG.png"
            alt=""
            className="h-12 w-12 shrink-0 object-contain sm:h-16 sm:w-16"
            draggable={false}
          />
          <div className="flex flex-col gap-0">
            <div className="flex items-baseline gap-1 leading-none">
              <span className="text-xl font-black tracking-tight text-primary uppercase sm:text-2xl">Wiki</span>
              <span className="text-xl font-black tracking-tight text-secondary uppercase sm:text-2xl">Daily</span>
            </div>
            <div className="mb-1 hidden text-xs leading-none text-slate-500 sm:block">
              Expend your knowledge
            </div>
          </div>
        </NavLink>

        <div className="hidden md:flex">
          <nav className="ml-0 flex items-center gap-1.5 sm:ml-10 sm:gap-2">
            <NavLink
              to="/"
              end
              className={({ isActive }) =>
                `${linkBase} ${isActive ? linkActive : ''}`
              }
            >
              Home
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
        </div>

        <WikiSearchBar className="hidden md:block min-w-[7rem] flex-1 basis-[9rem] max-w-xs" />

        <div className="ml-auto flex shrink-0 flex-wrap items-center justify-end gap-2 sm:gap-3">
          <div className="hidden md:block">
            <StreakBadge />
          </div>

          {userId ? (
            <div className="md:hidden flex items-center gap-2">
              <StreakBadge className="h-10 w-10" />

              <NavLink
                to="/profile"
                aria-label="Go to profile"
                className="flex h-9 w-9 items-center justify-center focus:outline-none focus:ring-2 focus:ring-slate-300"
                onClick={() => setMenuOpen(false)}
              >
                {avatarUrl ? (
                  <img
                    src={avatarUrl}
                    alt=""
                    aria-hidden="true"
                    referrerPolicy="no-referrer"
                    className="h-8 w-8 shrink-0 rounded-full object-cover ring-1 ring-slate-200"
                  />
                ) : (
                  <span
                    className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-amber-100 text-xs font-semibold text-amber-950 ring-1 ring-slate-200"
                    aria-hidden="true"
                  >
                    {initials}
                  </span>
                )}
              </NavLink>
            </div>
          ) : (
            <NavLink
              to={buildAuthUrl({
                returnTo: `${location.pathname}${location.search ?? ''}${location.hash ?? ''}`,
              })}
              className="md:hidden rounded-none bg-primary px-3 py-2 text-sm font-medium text-white hover:bg-primary-hover"
              onClick={() => setMenuOpen(false)}
            >
              Sign in
            </NavLink>
          )}

          <div className="hidden md:block">
            {userId ? (
              <div className="relative" ref={userMenuRef}>
                <button
                  type="button"
                  onClick={() => {
                    setMenuOpen(false)
                    setIsUserMenuOpen((v) => !v)
                  }}
                  aria-haspopup="menu"
                  aria-expanded={isUserMenuOpen}
                  aria-busy={levelLineLoading}
                  className="flex items-center gap-2 bg-white py-1 pl-1 pr-2 text-sm font-medium text-slate-700 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-slate-300 sm:pr-3"
                >
                  {avatarUrl ? (
                    <img
                      src={avatarUrl}
                      alt=""
                      aria-hidden="true"
                      referrerPolicy="no-referrer"
                      className="h-8 w-8 shrink-0 rounded-full object-cover ring-1 ring-slate-200"
                    />
                  ) : (
                    <span
                      className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-amber-100 text-xs font-semibold text-amber-950"
                      aria-hidden="true"
                    >
                      {initials}
                    </span>
                  )}
                  <span className="min-w-0 max-w-[10rem] text-left sm:max-w-[14rem]">
                    <span className="block truncate text-sm font-medium">{displayName}</span>
                    <span className="hidden min-h-[1rem] truncate text-[11px] font-normal leading-tight text-slate-500 sm:block">
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

          <button
            type="button"
            className="md:hidden flex items-center justify-center w-10 h-10"
            onClick={() => {
              setIsUserMenuOpen(false)
              setMenuOpen((prev) => !prev)
            }}
            aria-label="Toggle menu"
            aria-expanded={menuOpen}
          >
            <span className="text-2xl leading-none">☰</span>
          </button>
        </div>
      </div>

      {menuOpen ? (
        <>
          <div className="fixed inset-0 z-40 md:hidden" onClick={() => setMenuOpen(false)} />

          <div className="absolute top-full left-0 right-0 z-50 bg-white border-b border-slate-200 shadow-md md:hidden">
            <nav className="flex flex-col py-2">
              <NavLink
                to="/"
                end
                className={({ isActive }) =>
                  `${linkBase} ${isActive ? linkActive : ''} px-6 py-3 min-h-[48px] flex items-center`
                }
                onClick={() => setMenuOpen(false)}
              >
                Home
              </NavLink>

              <NavLink
                to="/game"
                end={false}
                className={({ isActive }) =>
                  `${linkBase} ${isActive ? linkActive : ''} px-6 py-3 min-h-[48px] flex items-center`
                }
                onClick={() => setMenuOpen(false)}
              >
                Game
              </NavLink>

              {userId ? (
                <NavLink
                  to="/profile"
                  className={({ isActive }) =>
                    `${linkBase} ${isActive ? linkActive : ''} px-6 py-3 min-h-[48px] flex items-center`
                  }
                  onClick={() => setMenuOpen(false)}
                >
                  Profile
                </NavLink>
              ) : null}

              <div className="border-t border-slate-100 my-2" />

              {userId ? (
                <>
                  <div className="px-6 py-2 text-sm text-slate-500">
                    <span className="font-medium text-slate-700">
                      {profile?.username ? `@${profile.username}` : displayName}
                    </span>
                    <span className="ml-2">
                      {levelLineLoading ? 'Loading…' : `Level ${level.level} · ${level.name}`}
                    </span>
                  </div>
                  <button
                    type="button"
                    className="px-6 py-3 text-sm text-slate-700 min-h-[48px] flex items-center text-left w-full"
                    onClick={async () => {
                      setMenuOpen(false)
                      await onSignOut()
                    }}
                    disabled={isSigningOut}
                  >
                    {isSigningOut ? 'Signing out…' : 'Sign out'}
                  </button>
                </>
              ) : (
                <NavLink
                  to={buildAuthUrl({
                    returnTo: `${location.pathname}${location.search ?? ''}${location.hash ?? ''}`,
                  })}
                  className="px-6 py-3 text-sm font-medium text-primary min-h-[48px] flex items-center"
                  onClick={() => setMenuOpen(false)}
                >
                  Sign in
                </NavLink>
              )}
            </nav>
          </div>
        </>
      ) : null}
    </header>
  )
}

