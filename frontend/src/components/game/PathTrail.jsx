import { useEffect, useRef } from 'react'

/**
 * Sticky bottom bar showing the navigation breadcrumb trail during gameplay.
 * Auto-scrolls to the rightmost (current) article when path updates.
 */
export default function PathTrail({ path }) {
  const containerRef = useRef(null)

  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollLeft = containerRef.current.scrollWidth
    }
  }, [path])

  if (!path || path.length === 0) return null

  return (
    <div
      ref={containerRef}
      className="sticky bottom-0 z-40 flex items-center gap-1 overflow-x-auto border-t border-slate-200 bg-white px-4 py-2 text-xs"
      style={{ scrollbarWidth: 'none' }}
    >
      {path.map((slug, i) => {
        const isLast = i === path.length - 1
        const label = slug.replaceAll('_', ' ')
        return (
          <span key={`${slug}-${i}`} className="flex items-center gap-1 shrink-0">
            {i > 0 && <span className="text-slate-300 select-none">›</span>}
            <span className={isLast ? 'font-semibold text-primary' : 'text-slate-500'}>
              {label}
            </span>
          </span>
        )
      })}
    </div>
  )
}
