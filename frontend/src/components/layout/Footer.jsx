import { NavLink } from 'react-router-dom'

const NAV_LINKS = [
  { to: '/', label: 'Home' },
  { to: '/history', label: 'History' },
  { to: '/game', label: 'Game' },
  { to: '/profile', label: 'Profile' },
]

/** Shown only in the footer (not duplicated in the main navbar). */
const FOOTER_PAGE_LINKS = [{ to: '/about', label: 'About' }]

export default function Footer() {
  return (
    <footer className="bg-primary mt-16 border-t-2 border-white/10">
      {/* Main grid */}
      <div className="mx-auto max-w-5xl px-4 py-12">
        <div className="grid grid-cols-1 gap-10 md:grid-cols-3 md:gap-8">

          {/* Brand column */}
          <div className="flex flex-col gap-3">
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-black tracking-tight text-white uppercase">
                Wiki
              </span>
              <span className="text-2xl font-black tracking-tight text-secondary uppercase">
                Daily
              </span>
            </div>
            <p className="text-sm leading-relaxed text-white/60 max-w-[220px]">
              Expand your knowledge,<br />one article a day.
            </p>
          </div>

          {/* Quick links */}
          <div className="flex flex-col gap-3">
            <h3 className="text-xs font-bold tracking-widest text-white/40 uppercase">
              Navigate
            </h3>
            <ul className="flex flex-col gap-2">
              {NAV_LINKS.map(({ to, label }) => (
                <li key={to}>
                  <NavLink
                    to={to}
                    className={({ isActive }) =>
                      [
                        'text-sm font-medium transition-colors duration-150',
                        isActive
                          ? 'text-white'
                          : 'text-white/60 hover:text-white',
                      ].join(' ')
                    }
                  >
                    {label}
                  </NavLink>
                </li>
              ))}
              {FOOTER_PAGE_LINKS.map(({ to, label }) => (
                <li key={to}>
                  <NavLink
                    to={to}
                    className={({ isActive }) =>
                      [
                        'text-sm font-medium transition-colors duration-150',
                        isActive ? 'text-white' : 'text-white/60 hover:text-white',
                      ].join(' ')
                    }
                  >
                    {label}
                  </NavLink>
                </li>
              ))}
            </ul>
          </div>

          {/* External links */}
          <div className="flex flex-col gap-3">
            <h3 className="text-xs font-bold tracking-widest text-white/40 uppercase">
              External
            </h3>
            <ul className="flex flex-col gap-2">
              <li>
                <a
                  href="https://en.wikipedia.org"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-sm font-medium text-white/60 transition-colors duration-150 hover:text-white"
                >
                  <WikipediaIcon />
                  Wikipedia
                </a>
              </li>
              <li>
                <a
                  href="https://github.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-sm font-medium text-white/60 transition-colors duration-150 hover:text-white"
                >
                  <GitHubIcon />
                  GitHub
                </a>
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* Bottom bar */}
      <div className="border-t border-white/10">
        <div className="mx-auto max-w-5xl px-4 py-4">
          <p className="text-xs text-white/35 tracking-wide">
            © 2026 WikiDaily · All rights reserved
          </p>
          <p className="mt-1 text-xs text-white/25 leading-relaxed max-w-2xl">
            WikiDaily is an independent project and is not affiliated with, endorsed by, or related to the Wikimedia Foundation or Wikipedia in any way. All article content belongs to their respective authors and is licensed under the{' '}
            <a
              href="https://creativecommons.org/licenses/by-sa/4.0/"
              target="_blank"
              rel="noopener noreferrer"
              className="underline underline-offset-2 hover:text-white/50 transition-colors"
            >
              CC BY-SA 4.0
            </a>{' '}
            license.
          </p>
        </div>
      </div>
    </footer>
  )
}

function WikipediaIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
      className="shrink-0"
    >
      <path d="M12.09 13.119c-.936 1.932-2.217 4.548-2.853 5.728-.616 1.074-1.127.931-1.532.029-1.406-3.321-4.293-9.144-5.651-12.409-.251-.601-.441-.987-.619-1.139-.181-.15-.554-.24-1.122-.271C.103 5.033 0 4.982 0 4.898v-.455l.052-.045c.924-.005 5.401 0 5.401 0l.051.045v.434c0 .085-.107.127-.327.127-.374 0-.586.07-.698.21-.095.133-.073.4.068.79 1.263 3.049 4.009 9.071 4.71 10.307l.481-1.001c.573-1.227 1.368-2.947 1.907-4.122.476-1.035.728-1.875.717-2.548-.012-.628-.241-1.082-.697-1.357-.129-.075-.351-.13-.669-.168a.765.765 0 0 1-.127-.025v-.349l.039-.052 4.952.005.026.051v.346l-.025.051c-.267.036-.481.076-.641.12-.299.08-.484.242-.567.468-.076.21-.052.533.074.967.128.436.396 1.064.834 2.032.309.684.754 1.598 1.296 2.787.539-1.079 1.009-2.063 1.371-2.876.316-.697.581-1.339.793-1.922.254-.721.344-1.2.281-1.441-.067-.244-.307-.42-.725-.529a2.884 2.884 0 0 0-.434-.067c-.089 0-.135-.04-.135-.122v-.41l.05-.054 4.328.003.048.052v.397l-.048.053c-.273.026-.521.076-.745.151-.396.131-.771.493-1.128 1.089-.068.116-.986 1.958-2.667 5.409l-1.47 3.082c-.917 1.918-1.578 3.299-2.076 4.304-.489.992-1.109.942-1.481.012l-2.963-6.577z" />
    </svg>
  )
}

function GitHubIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
      className="shrink-0"
    >
      <path d="M12 0C5.37 0 0 5.37 0 12c0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23A11.509 11.509 0 0 1 12 5.803c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222 0 1.606-.015 2.898-.015 3.293 0 .322.216.694.825.576C20.565 21.795 24 17.298 24 12c0-6.63-5.37-12-12-12z" />
    </svg>
  )
}
