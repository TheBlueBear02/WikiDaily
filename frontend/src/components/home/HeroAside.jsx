/**
 * Left column of the home hero row: achievements + streak leaderboard stacked.
 * The row uses md:items-stretch so this aside matches the height of the right column
 * (fixed-height daily card + community reading goals).
 */
export default function HeroAside({ children, className = '' }) {
  return (
    <aside
      className={['flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden rounded-none bg-white', className]
        .filter(Boolean)
        .join(' ')}
    >
      {children}
    </aside>
  )
}
