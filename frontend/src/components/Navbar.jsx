import { NavLink } from 'react-router-dom'

import StreakBadge from './StreakBadge'

const linkBase =
  'rounded-md px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900'
const linkActive = 'bg-slate-100 text-slate-900'

export default function Navbar() {
  return (
    <header className="border-b border-slate-200">
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-4">
        <div className="flex items-center gap-3">
          <div className="grid h-9 w-9 place-items-center rounded-lg bg-slate-900 text-sm font-semibold text-white">
            WD
          </div>
          <div className="leading-tight">
            <div className="text-sm font-semibold">WikiDaily</div>
            <div className="text-xs text-slate-500">One article a day</div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <StreakBadge />
          <nav className="flex items-center gap-2">
            <NavLink
              to="/"
              end
              className={({ isActive }) =>
                `${linkBase} ${isActive ? linkActive : ''}`
              }
            >
              Today
            </NavLink>
            <NavLink
              to="/history"
              className={({ isActive }) =>
                `${linkBase} ${isActive ? linkActive : ''}`
              }
            >
              History
            </NavLink>
          </nav>
        </div>
      </div>
    </header>
  )
}

