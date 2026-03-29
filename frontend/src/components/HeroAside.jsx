/**
 * Left column of the home hero row: fills remaining width beside the article card
 * and stretches to the same height (flex parent uses items-stretch).
 */
export default function HeroAside({ children }) {
  return (
    <aside className="flex min-h-0 min-w-0 flex-1 flex-col rounded-none border border-slate-200 bg-white p-5 md:p-6">
      {children}
    </aside>
  )
}
